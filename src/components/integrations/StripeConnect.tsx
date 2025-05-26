import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useIntegration } from '../../context/IntegrationContext';
import { trackEvent } from '../../utils/analytics';

interface StripeConnectProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const StripeConnect: React.FC<StripeConnectProps> = ({ onSuccess, onError }) => {
  const { currentUser } = useAuth();
  const { refreshStatus } = useIntegration();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Track the connection attempt
      trackEvent('stripe_connect_attempt', {
        user_id: currentUser.uid
      });

      // Get the auth token
      const token = await currentUser.getIdToken();

      // Initiate Stripe connection
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Stripe account');
      }

      if (!data.url) {
        throw new Error('Invalid response: missing redirect URL');
      }

      // Redirect to Stripe OAuth page
      window.location.href = data.url;

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to connect Stripe:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      trackEvent('stripe_connect_error', {
        user_id: currentUser.uid,
        error: errorMessage
      });

      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <button
        onClick={handleConnect}
        disabled={isLoading}
        className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Connecting...
          </>
        ) : (
          'Connect Stripe Account'
        )}
      </button>
    </div>
  );
};

export default StripeConnect;