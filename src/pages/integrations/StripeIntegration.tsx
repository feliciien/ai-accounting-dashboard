import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useIntegration } from '../../context/IntegrationContext';
import { trackEvent } from '../../utils/analytics';
import Sidebar from '../../components/Sidebar';
import { useLocation } from 'react-router-dom';
import StripeBalance from '../../components/integrations/StripeBalance';
import StripeTransactions from '../../components/integrations/StripeTransactions';
import StripeRevenue from '../../components/integrations/StripeRevenue';
import StripeWebhookHandler from '../../components/integrations/StripeWebhookHandler';
import StripeConnect from '../../components/integrations/StripeConnect';

const StripeIntegration: React.FC = () => {
  const { currentUser } = useAuth();
  const { stripe, refreshStatus } = useIntegration();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState<'week' | 'month' | 'year'>('month');
  const location = useLocation();

  // Check for status in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const errorMessage = params.get('message');
    
    if (status === 'success') {
      setStatusMessage('Stripe account connected successfully!');
      refreshStatus(); // Refresh integration status
    } else if (status === 'error') {
      setStatusMessage(errorMessage ? 
        `Failed to connect Stripe account: ${errorMessage}. Please try again.` : 
        'Failed to connect Stripe account. Please try again.');
    }
    
    // Clear status message after 10 seconds for errors (to give time to read) or 5 seconds for success
    if (status) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, status === 'error' ? 10000 : 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location.search, refreshStatus]);

  const handleConnectSuccess = () => {
    refreshStatus();
  };

  const handleConnectError = (error: string) => {
    setStatusMessage(`Failed to connect Stripe account: ${error}. Please try again.`);
  };

  const handleDisconnectClick = () => {
    setShowDisconnectModal(true);
  };

  const handleDisconnectCancel = () => {
    setShowDisconnectModal(false);
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      setShowDisconnectModal(false);
      
      // Get the auth token
      const token = await currentUser?.getIdToken();
      
      // Call the disconnect endpoint
      const response = await fetch('/api/stripe/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Stripe');
      }
      
      // Refresh the integration status
      await refreshStatus();
      
      trackEvent('stripe_disconnect_success', {
        user_id: currentUser?.uid
      });
      
      setStatusMessage('Stripe account disconnected successfully!');
    } catch (error) {
      console.error('Failed to disconnect Stripe:', error);
      trackEvent('stripe_disconnect_error', {
        user_id: currentUser?.uid,
        error: String(error)
      });
      setStatusMessage('Failed to disconnect Stripe account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Stripe Integration</h1>
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
              alt="Stripe Logo" 
              className="h-10" 
            />
          </div>

          <div className="mb-6">
            <p className="text-gray-600">
              Connect your Stripe account to automatically import your payment data and streamline your financial operations.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <h3 className="font-medium text-gray-800 mb-2">Benefits of connecting Stripe:</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Automatic import of transactions and payments</li>
              <li>Real-time payment notifications</li>
              <li>Detailed financial reporting</li>
              <li>Simplified reconciliation process</li>
            </ul>
          </div>

          {statusMessage && (
              <div className={`mb-6 p-4 rounded-md ${statusMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {statusMessage}
              </div>
            )}
            
          <div className="flex justify-center">
            {stripe.connected ? (
              <button
                onClick={handleDisconnectClick}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Disconnecting...' : 'Disconnect Stripe'}
              </button>
            ) : (
              <StripeConnect
                onSuccess={handleConnectSuccess}
                onError={handleConnectError}
              />
            )}
          </div>
          
          {/* Disconnect Confirmation Modal */}
          {showDisconnectModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Disconnect Stripe Account</h3>
                <p className="text-gray-600 mb-6">Are you sure you want to disconnect your Stripe account? This will stop all automatic data imports.</p>
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={handleDisconnectCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDisconnect}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Display Stripe balance and account info if connected */}
        {stripe.connected && (
          <>
            <div className="max-w-4xl mx-auto mt-6 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Stripe Dashboard Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-purple-50 p-4 rounded-md">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Monthly Revenue</h3>
                    <p className="text-2xl font-bold text-purple-700">$12,450</p>
                    <p className="text-xs text-green-600">↑ 12% from last month</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Transaction Count</h3>
                    <p className="text-2xl font-bold text-blue-700">156</p>
                    <p className="text-xs text-green-600">↑ 8% from last month</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-md">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Payment Success Rate</h3>
                    <p className="text-2xl font-bold text-green-700">98.2%</p>
                    <p className="text-xs text-green-600">↑ 1.5% from last month</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-2">Connected since: {new Date(stripe.connectedAt || Date.now()).toLocaleDateString()}</p>
                <div className="mt-4">
                  <a 
                    href="https://dashboard.stripe.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Open Stripe Dashboard →
                  </a>
                </div>
              </div>
            </div>
            
            {/* Revenue Chart */}
            <div className="max-w-4xl mx-auto mb-6">
              <div className="bg-white rounded-lg shadow-md p-6 mb-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Revenue Visualization</h2>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setRevenuePeriod('week')} 
                      className={`px-3 py-1 rounded-md ${revenuePeriod === 'week' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      Week
                    </button>
                    <button 
                      onClick={() => setRevenuePeriod('month')} 
                      className={`px-3 py-1 rounded-md ${revenuePeriod === 'month' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      Month
                    </button>
                    <button 
                      onClick={() => setRevenuePeriod('year')} 
                      className={`px-3 py-1 rounded-md ${revenuePeriod === 'year' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      Year
                    </button>
                  </div>
                </div>
                <StripeRevenue period={revenuePeriod} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <StripeBalance />
              <StripeWebhookHandler />
            </div>
            <StripeTransactions className="mb-6" limit={10} />
          </>
        )}
      </main>
    </div>
  );
};

export default StripeIntegration;