import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { trackEvent } from '../../utils/analytics';
import Sidebar from '../../components/Sidebar';
import { usePlaidLink } from 'react-plaid-link';
import BankTransactions from '../../components/integrations/BankTransactions';

const BankIntegration: React.FC = () => {
  const { currentUser } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState('');
  const [bankName, setBankName] = useState('');

  // Fetch the link token from our backend
  useEffect(() => {
    const fetchLinkToken = async () => {
      if (!currentUser) return;
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch link token');
        }
        
        const { link_token } = await response.json();
        setLinkToken(link_token);
      } catch (error) {
        console.error('Failed to fetch link token:', error);
      }
    };

    if (currentUser && !isConnected) {
      fetchLinkToken();
    }
  }, [currentUser, isConnected]);

  const onSuccess = useCallback(async (public_token: string, metadata: any) => {
    try {
      setIsLoading(true);
      
      // Set the bank name from metadata
      if (metadata.institution && metadata.institution.name) {
        setBankName(metadata.institution.name);
      }
      
      // Exchange the public token for an access token
      const token = await currentUser?.getIdToken();
      const response = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ public_token })
      });
      
      if (!response.ok) {
        throw new Error('Failed to exchange token');
      }
      
      setIsConnected(true);
      trackEvent('bank_connect_success', {
        user_id: currentUser?.uid,
        institution: metadata.institution?.name
      });
    } catch (error) {
      console.error('Failed to exchange public token:', error);
      trackEvent('bank_connect_error', {
        user_id: currentUser?.uid,
        error: String(error)
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);
  
  // Initialize Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => {
      // Handle the case when a user exits the Plaid Link flow
      setIsLoading(false);
    },
  });
  
  const handleConnect = () => {
    try {
      setIsLoading(true);
      
      // Track the connection attempt
      trackEvent('bank_connect_attempt', {
        user_id: currentUser?.uid
      });

      // Open Plaid Link
      open();
    } catch (error) {
      console.error('Failed to open Plaid Link:', error);
      trackEvent('bank_connect_error', {
        user_id: currentUser?.uid,
        error: String(error)
      });
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      
      // Call the disconnect endpoint
      const token = await currentUser?.getIdToken();
      const response = await fetch('/api/plaid/disconnect', { 
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect bank account');
      }
      
      setIsConnected(false);
      setBankName('');
      trackEvent('bank_disconnect_success', {
        user_id: currentUser?.uid
      });
    } catch (error) {
      console.error('Failed to disconnect bank account:', error);
      trackEvent('bank_disconnect_error', {
        user_id: currentUser?.uid,
        error: String(error)
      });
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
            <h1 className="text-2xl font-bold text-gray-800">Bank Account Integration</h1>
            <div className="bg-green-100 p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l2-2m0 0l7-7 7 7M5 4v16M12 2v16m7-14v16" />
              </svg>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-gray-600">
              Connect your bank account to automatically import your transactions and streamline your financial management.
            </p>
          </div>

          {!isConnected && (
            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <h3 className="font-medium text-gray-800 mb-2">Benefits of connecting your bank account:</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Automatic import of transactions</li>
                <li>Real-time balance updates</li>
                <li>Simplified expense tracking</li>
                <li>Comprehensive financial reporting</li>
                <li>Secure and encrypted connection</li>
              </ul>
            </div>
          )}

          {isConnected && (
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-600 font-medium">
                  {bankName ? `Connected to ${bankName}` : 'Bank account connected'}
                </span>
              </div>
              <BankTransactions className="mt-4" />
            </div>
          )}

          <div className="flex justify-center mt-6">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Disconnecting...' : 'Disconnect Bank Account'}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading || !linkToken || !ready}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect Bank Account'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BankIntegration;