import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useIntegration } from '../../context/IntegrationContext';
import { trackEvent } from '../../utils/analytics';
import Sidebar from '../../components/Sidebar';
import XeroDataDisplay from '../../components/integrations/XeroDataDisplay';

const XeroIntegration: React.FC = () => {
  const { currentUser } = useAuth();
  const { xero, refreshStatus } = useIntegration();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get Xero client ID from environment variables
  const XERO_CLIENT_ID = process.env.REACT_APP_XERO_CLIENT_ID;
  // This should match the redirect URI you've configured in your Xero app
  const REDIRECT_URI = `${window.location.origin}/api/integrations/xero/callback`;
  
  // Check for success or error query parameters (from redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const errorParam = urlParams.get('error');
    
    if (success === 'true') {
      refreshStatus();
    } else if (errorParam === 'true') {
      setError('Failed to connect to Xero. Please try again.');
    }
  }, [refreshStatus]);


  const handleConnect = () => {
    if (!XERO_CLIENT_ID) {
      setError('Xero Client ID is not configured. Please check your environment variables.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Track the connection attempt
    trackEvent('xero_connect_attempt', {
      user_id: currentUser?.uid
    });

    // Define the scopes needed for the integration
    const scopes = [
      'openid',
      'profile', 
      'email',
      'accounting.transactions',
      'accounting.contacts',
      'offline_access'
    ].join(' ');

    // Create state parameter with user ID for security
    const state = currentUser?.uid || 'anonymous';
    
    // Redirect to Xero OAuth flow
    const authUrl = `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${XERO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Call the backend to disconnect Xero
      const response = await fetch('/api/integrations/xero/disconnect', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uid: currentUser?.uid })
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect from Xero');
      }
      
      // Refresh integration status
      await refreshStatus();
      
      trackEvent('xero_disconnect_success', {
        user_id: currentUser?.uid
      });
    } catch (error) {
      console.error('Failed to disconnect Xero:', error);
      setError('Failed to disconnect from Xero. Please try again.');
      trackEvent('xero_disconnect_error', {
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
            <h1 className="text-2xl font-bold text-gray-800">Xero Integration</h1>
            <img 
              src="/workfusion-logo.svg" 
              alt="Xero Logo" 
              className="h-10" 
            />
          </div>

          <div className="mb-6">
            <p className="text-gray-600">
              Connect your Xero account to automatically import your accounting data, invoices, and contacts.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <h3 className="font-medium text-gray-800 mb-2">Benefits of connecting Xero:</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Automatic import of invoices and bills</li>
              <li>Real-time financial reporting</li>
              <li>Synchronized contact management</li>
              <li>Streamlined reconciliation process</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          {xero.connected && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
              ✅ Your Xero account is connected! Last connected: {xero.connectedAt ? new Date(xero.connectedAt).toLocaleString() : 'Unknown'}
            </div>
          )}
          
          <div className="flex justify-center">
            {xero.connected ? (
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Disconnecting...' : 'Disconnect Xero'}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect Xero Account'}
              </button>
            )}
          </div>
          
          {/* Display Xero data when connected */}
          {xero.connected && <XeroDataDisplay />}
        </div>
      </main>
    </div>
  );
};

export default XeroIntegration;