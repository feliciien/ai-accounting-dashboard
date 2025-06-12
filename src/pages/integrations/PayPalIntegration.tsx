import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useIntegration } from '../../context/IntegrationContext';
import { trackEvent } from '../../utils/analytics';
import Sidebar from '../../components/Sidebar';
import { useLocation } from 'react-router-dom';
import PayPalTransactions from '../../components/integrations/PayPalTransactions';
import PayPalBalance from '../../components/integrations/PayPalBalance';

const PayPalIntegration: React.FC = () => {
  const { currentUser } = useAuth();
  const { paypal, refreshStatus } = useIntegration();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const location = useLocation();
  
  // Check for status in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    
    if (status === 'success') {
      setStatusMessage('PayPal account connected successfully!');
      refreshStatus(); // Refresh integration status
    } else if (status === 'error') {
      setStatusMessage('Failed to connect PayPal account. Please try again.');
    }
    
    // Clear status message after 5 seconds
    if (status) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location.search, refreshStatus]);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      
      // Track the connection attempt
      trackEvent('paypal_connect_attempt', {
        user_id: currentUser?.uid
      });

      // Get the auth token
      const token = await currentUser?.getIdToken();
      
      // Redirect to our PayPal redirect endpoint
      window.location.href = `/api/paypal/redirect`;
    } catch (error) {
      console.error('Failed to connect PayPal:', error);
      trackEvent('paypal_connect_error', {
        user_id: currentUser?.uid,
        error: String(error)
      });
      setIsLoading(false);
      setStatusMessage('Failed to connect PayPal account. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      
      // Get the auth token
      const token = await currentUser?.getIdToken();
      
      // Call the disconnect endpoint
      const response = await fetch('/api/paypal/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect PayPal');
      }
      
      // Refresh the integration status
      await refreshStatus();
      
      trackEvent('paypal_disconnect_success', {
        user_id: currentUser?.uid
      });
      
      setStatusMessage('PayPal account disconnected successfully!');
    } catch (error) {
      console.error('Failed to disconnect PayPal:', error);
      trackEvent('paypal_disconnect_error', {
        user_id: currentUser?.uid,
        error: String(error)
      });
      setStatusMessage('Failed to disconnect PayPal account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar isMobileMenuOpen={false} toggleMobileMenu={() => {}} />
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">PayPal Integration</h1>
              <img 
                src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" 
                alt="PayPal Logo" 
                className="h-10" 
              />
            </div>

            <div className="mb-6">
              <p className="text-gray-600">
                Connect your PayPal account to automatically import your transaction data and streamline your payment processing.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <h3 className="font-medium text-gray-800 mb-2">Benefits of connecting PayPal:</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Automatic import of transactions</li>
                <li>Real-time payment notifications</li>
                <li>Simplified reconciliation</li>
                <li>Comprehensive financial reporting</li>
              </ul>
            </div>

            {statusMessage && (
              <div className={`mb-6 p-4 rounded-md ${statusMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {statusMessage}
              </div>
            )}
            
            <div className="flex justify-center">
              {paypal.connected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Disconnecting...' : 'Disconnect PayPal'}
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Connecting...' : 'Connect PayPal Account'}
                </button>
              )}
            </div>
          </div>
          
          {/* Display PayPal balance and transactions if connected */}
          {paypal.connected && (
            <>
              <PayPalBalance className="mb-6" />
              <PayPalTransactions 
                className="mb-6" 
                limit={10} 
                dateRange={{
                  startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
                  endDate: new Date()
                }}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PayPalIntegration;
