import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { trackEvent } from '../../utils/analytics';

interface Transaction {
  transaction_id: string;
  date: string;
  name: string;
  amount: number;
  category: string[];
  pending: boolean;
}

interface Balance {
  available: number;
  current: number;
  limit?: number;
  currency: string;
  account_name: string;
  account_type: string;
}

interface BankTransactionsProps {
  limit?: number;
  className?: string;
}

const BankTransactions: React.FC<BankTransactionsProps> = ({ limit = 5, className = '' }) => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBankData = async () => {
      if (!currentUser) return;

      setIsLoading(true);
      setError(null);

      try {
        // Get the auth token
        const token = await currentUser.getIdToken();

        // Fetch transactions
        const transactionsResponse = await fetch('/api/plaid/transactions', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!transactionsResponse.ok) {
          throw new Error('Failed to fetch bank transactions');
        }

        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);

        // Fetch balances
        const balancesResponse = await fetch('/api/plaid/balances', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!balancesResponse.ok) {
          throw new Error('Failed to fetch bank balances');
        }

        const balancesData = await balancesResponse.json();
        setBalances(balancesData.accounts || []);

        // Track successful fetch
        trackEvent('bank_data_loaded', {
          user_id: currentUser.uid,
          transaction_count: transactionsData.transactions?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching bank data:', error);
        setError('Failed to load bank data. Please try again later.');
        
        // Track error
        trackEvent('bank_data_error', {
          user_id: currentUser.uid,
          error: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBankData();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Accounts & Transactions</h3>
        <div className="flex justify-center py-4">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Bank Accounts & Transactions</h3>
        <div className="text-red-500 py-2">{error}</div>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Bank Accounts & Transactions</h3>
        <p className="text-gray-500">Connect your bank account to view transactions and balances.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Accounts & Balances</h3>
      
      {/* Account Balances */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-800 mb-2">Accounts</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {balances.map((account, index) => (
            <div key={index} className="border rounded-md p-3 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{account.account_name}</span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {account.account_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency })
                    .format(account.available)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current</span>
                <span>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency })
                    .format(account.current)}
                </span>
              </div>
              {account.limit && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Limit</span>
                  <span>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency })
                      .format(account.limit)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h4 className="text-md font-medium text-gray-800 mb-2">Recent Transactions</h4>
        {transactions.length === 0 ? (
          <p className="text-gray-500 py-2">No transactions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.slice(0, limit).map((transaction) => (
                  <tr key={transaction.transaction_id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {transaction.name}
                      {transaction.pending && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {transaction.category?.[0] || 'Uncategorized'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <span className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
                          .format(Math.abs(transaction.amount))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankTransactions;