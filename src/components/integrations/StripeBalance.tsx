import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface StripeBalanceProps {
  className?: string;
}

interface BalanceAmount {
  amount: number;
  currency: string;
}

interface BalanceObject {
  available: BalanceAmount[];
  pending: BalanceAmount[];
}

const StripeBalance: React.FC<StripeBalanceProps> = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const [balance, setBalance] = useState<BalanceObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!currentUser) return;

      try {
        setIsLoading(true);
        setError(null);

        // Get the auth token
        const token = await currentUser.getIdToken();

        // Fetch the balance from our API
        const response = await fetch('/api/stripe/balance', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch Stripe balance');
        }

        const data = await response.json();
        setBalance(data);
      } catch (err) {
        console.error('Error fetching Stripe balance:', err);
        setError('Failed to load balance information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [currentUser]);

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2
    });
    
    // Stripe amounts are in cents, convert to dollars
    return formatter.format(amount / 100);
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Stripe Balance</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Stripe Balance</h2>
        <div className="bg-red-100 text-red-800 p-4 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Stripe Balance</h2>
      
      {balance && (
        <div>
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-2">Available Balance</h3>
            {balance.available.length > 0 ? (
              <ul className="space-y-2">
                {balance.available.map((item, index) => (
                  <li key={`available-${index}`} className="flex justify-between items-center bg-green-50 p-3 rounded-md">
                    <span className="text-gray-700">{item.currency.toUpperCase()}</span>
                    <span className="font-medium text-green-700">{formatCurrency(item.amount, item.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No available balance</p>
            )}
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Pending Balance</h3>
            {balance.pending.length > 0 ? (
              <ul className="space-y-2">
                {balance.pending.map((item, index) => (
                  <li key={`pending-${index}`} className="flex justify-between items-center bg-yellow-50 p-3 rounded-md">
                    <span className="text-gray-700">{item.currency.toUpperCase()}</span>
                    <span className="font-medium text-yellow-700">{formatCurrency(item.amount, item.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No pending balance</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StripeBalance;