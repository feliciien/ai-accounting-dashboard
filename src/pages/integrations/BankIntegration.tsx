import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '../../context/AuthContext';
import { useIntegration } from '../../context/IntegrationContext';
import { useNotification } from '../../context/NotificationContext';
import { trackEvent } from '../../utils/analytics';
import BankTransactions from '../../components/integrations/BankTransactions';
import { format } from 'date-fns';

const BankIntegration: React.FC = () => {
  const { currentUser } = useAuth();
  const { bank, updateBankStatus } = useIntegration();
  const { addNotification } = useNotification();
  const [linkToken, setLinkToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Create a link token when the component mounts
  useEffect(() => {
    const createLinkToken = async () => {
      if (!currentUser || bank.connected) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to create link token');
        }
        
        const data = await response.json();
        setLinkToken(data.link_token);
      } catch (err: any) {
        console.error('Error creating link token:', err);
        setError(err.message || 'Failed to initialize bank connection');
        trackEvent('bank_link_token_error', { error: err.message, timestamp: new Date().toISOString() });
      } finally {
        setIsLoading(false);
      }
    };
    
    createLinkToken();
  }, [currentUser, bank.connected]);

  // Handle successful Plaid Link connection
  const handleSuccess = useCallback(
    async (public_token: string, metadata: any) => {
      if (!currentUser) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ public_token }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to exchange token');
        }
        
        // Update integration status
        updateBankStatus({
          connected: true,
          connectedAt: new Date().getTime(),
          institution: metadata.institution?.name || 'Your Bank',
        });
        
        addNotification('success', '🏦 Bank account connected successfully!');
        trackEvent('bank_connected', { institution: metadata.institution?.name, timestamp: new Date().toISOString() });
      } catch (err: any) {
        console.error('Error exchanging token:', err);
        setError(err.message || 'Failed to connect bank account');
        trackEvent('bank_exchange_token_error', { error: err.message, timestamp: new Date().toISOString() });
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser, updateBankStatus, addNotification]
  );

  // Handle Plaid Link exit
  const handleExit = useCallback(() => {
    trackEvent('bank_link_exit', { timestamp: new Date().toISOString() });
  }, []);

  // Initialize Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
    onEvent: (eventName, metadata) => {
      trackEvent(`plaid_${eventName}`, { ...metadata, timestamp: new Date().toISOString() });
    },
  });

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/plaid/disconnect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect bank account');
      }
      
      // Update integration status
      updateBankStatus({
        connected: false,
      });
      
      addNotification('info', 'Bank account disconnected');
      trackEvent('bank_disconnected', { timestamp: new Date().toISOString() });
    } catch (err: any) {
      console.error('Error disconnecting bank:', err);
      setError(err.message || 'Failed to disconnect bank account');
      trackEvent('bank_disconnect_error', { error: err.message, timestamp: new Date().toISOString() });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <span className="mr-2">🏦</span> Bank Account Integration
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Securely connect your bank accounts to import transactions and track your finances.
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {bank.connected ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
                <div className="flex-shrink-0 text-blue-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Connected to {bank.institution as string || 'Your Bank'}</h3>
                  <div className="mt-1 text-xs text-blue-700">
                    Connected on {bank.connectedAt ? format(new Date(bank.connectedAt), 'MMMM d, yyyy') : 'Unknown date'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
                <BankTransactions limit={10} />
              </div>

              <div className="mt-6">
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Disconnecting...' : 'Disconnect Bank Account'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Bank Account</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                Securely connect your bank account to automatically import transactions and track your finances in real-time.
              </p>
              <button
                onClick={() => open()}
                disabled={!ready || isLoading || !linkToken}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Initializing...' : 'Connect Bank Account'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankIntegration;