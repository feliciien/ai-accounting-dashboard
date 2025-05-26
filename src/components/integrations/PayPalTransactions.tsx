import React, { useState, useMemo, useEffect } from 'react';
import { useIntegration } from '../../context/IntegrationContext';
import { format } from 'date-fns';

interface PayPalTransactionsProps {
  limit: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  onError?: (error: Error) => void;
  className?: string;
}

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'declined';
  type: 'payment' | 'refund' | 'withdrawal' | 'deposit';
}

const PayPalTransactions: React.FC<PayPalTransactionsProps> = ({ limit, dateRange, onError, className = '' }) => {
  const { paypal } = useIntegration();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Transaction;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });
  const [filterConfig, setFilterConfig] = useState<{
    status: string[];
    type: string[];
    search: string;
  }>({
    status: [],
    type: [],
    search: ''
  });

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API call or data processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!paypal.transactions) {
          throw new Error('No transaction data available');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load transactions');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, [paypal.transactions, onError]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      case 'declined':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'payment':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        );
      case 'refund':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        );
      case 'withdrawal':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      case 'deposit':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l-7 7m-7-7v18" />
          </svg>
        );
    }
  };

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...(paypal.transactions || [])];

    // Apply date range filter
    result = result.filter(
      (transaction) =>
        transaction.date >= dateRange.startDate && transaction.date <= dateRange.endDate
    );

    // Apply status filter
    if (filterConfig.status.length > 0) {
      result = result.filter((transaction) =>
        filterConfig.status.includes(transaction.status)
      );
    }

    // Apply type filter
    if (filterConfig.type.length > 0) {
      result = result.filter((transaction) =>
        filterConfig.type.includes(transaction.type)
      );
    }

    // Apply search filter
    if (filterConfig.search) {
      const searchLower = filterConfig.search.toLowerCase();
      result = result.filter(
        (transaction) =>
          transaction.description.toLowerCase().includes(searchLower) ||
          transaction.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortConfig.key === 'date') {
        return sortConfig.direction === 'asc'
          ? a.date.getTime() - b.date.getTime()
          : b.date.getTime() - a.date.getTime();
      }
      
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc'
          ? a.amount - b.amount
          : b.amount - a.amount;
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result.slice(0, limit);
  }, [paypal.transactions, dateRange, filterConfig, sortConfig, limit]);

  const handleSort = (key: keyof Transaction) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleFilterChange = (filterType: 'status' | 'type', value: string) => {
    setFilterConfig((prev) => {
      const currentValues = prev[filterType];
      return {
        ...prev,
        [filterType]: currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value],
      };
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-full max-w-[200px]" />
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded w-24" />
          ))}
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded mt-4 first:mt-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !paypal.transactions) {
    return (
      <div className="text-center py-12">
        <div className="p-3 bg-danger-100 rounded-full inline-flex mb-4">
          <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Transactions</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          {error?.message || 'Unable to load transaction data. Please try again later.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search transactions..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            value={filterConfig.search}
            onChange={(e) =>
              setFilterConfig((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>
        <div className="flex space-x-2">
          {['completed', 'pending', 'declined'].map((status) => (
            <button
              key={status}
              onClick={() => handleFilterChange('status', status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filterConfig.status.includes(status)
                  ? getStatusColor(status as Transaction['status'])
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex space-x-2">
          {['payment', 'refund', 'withdrawal', 'deposit'].map((type) => (
            <button
              key={type}
              onClick={() => handleFilterChange('type', type)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filterConfig.type.includes(type)
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="flex items-center">
                {getTypeIcon(type as Transaction['type'])}
                <span className="ml-1">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  Date
                  {sortConfig.key === 'date' && (
                    <svg
                      className={`ml-1 w-4 h-4 transition-transform ${
                        sortConfig.direction === 'desc' ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Description
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center">
                  Amount
                  {sortConfig.key === 'amount' && (
                    <svg
                      className={`ml-1 w-4 h-4 transition-transform ${
                        sortConfig.direction === 'desc' ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Type
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(transaction.date, 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {transaction.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <span className={transaction.amount >= 0 ? 'text-success-600' : 'text-danger-600'}>
                    {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      transaction.status
                    )}`}
                  >
                    {transaction.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center text-sm text-gray-600">
                    {getTypeIcon(transaction.type)}
                    <span className="ml-1.5">{transaction.type}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* No Results Message */}
      {filteredAndSortedTransactions.length === 0 && (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">No transactions found matching your filters</p>
        </div>
      )}
    </div>
  );
};

export default PayPalTransactions;