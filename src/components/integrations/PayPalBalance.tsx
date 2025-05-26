import React, { useState, useEffect } from 'react';
import { useIntegration } from '../../context/IntegrationContext';

interface PayPalBalanceProps {
  className?: string;
  onError?: (error: Error) => void;
}

const PayPalBalance: React.FC<PayPalBalanceProps> = ({ className = '', onError }) => {
  const { paypal } = useIntegration();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API call or data processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!paypal.balance) {
          throw new Error('Balance data unavailable');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load balance');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBalance();
  }, [paypal.balance, onError]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const calculateTrend = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-3 flex-grow">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-7 bg-gray-200 rounded w-32" />
              </div>
              <div className="h-10 w-10 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !paypal.balance) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="p-3 bg-danger-100 rounded-full inline-flex mb-4">
            <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Balance</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-4">
            {error?.message || 'Unable to load balance data. Please try again later.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Primary Balance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Available Balance</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(paypal.balance?.available || 0, 'USD')}
            </p>
          </div>
          <div className="p-2 bg-primary-50 rounded-lg">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        {paypal.balance?.previousBalance && (
          <div className="mt-2 flex items-center">
            {calculateTrend(paypal.balance.available, paypal.balance.previousBalance) > 0 ? (
              <svg className="w-4 h-4 text-success-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-danger-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            <span className={`text-sm ${
              calculateTrend(paypal.balance.available, paypal.balance.previousBalance) > 0
                ? 'text-success-600'
                : 'text-danger-600'
            }`}>
              {Math.abs(calculateTrend(paypal.balance.available, paypal.balance.previousBalance)).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500 ml-1">vs last month</span>
          </div>
        )}
      </div>

      {/* Pending Balance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(paypal.balance?.pending || 0, 'USD')}
            </p>
          </div>
          <div className="p-2 bg-warning-50 rounded-lg">
            <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Expected within 1-3 business days
        </p>
      </div>

      {/* Monthly Income */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Monthly Income</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(paypal.analytics?.monthlyIncome || 0, 'USD')}
            </p>
          </div>
          <div className="p-2 bg-success-50 rounded-lg">
            <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        {paypal.analytics?.previousMonthIncome && (
          <div className="mt-2 flex items-center">
            {calculateTrend(
              paypal.analytics.monthlyIncome,
              paypal.analytics.previousMonthIncome
            ) > 0 ? (
              <svg className="w-4 h-4 text-success-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-danger-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            <span className={`text-sm ${
              calculateTrend(
                paypal.analytics.monthlyIncome,
                paypal.analytics.previousMonthIncome
              ) > 0
                ? 'text-success-600'
                : 'text-danger-600'
            }`}>
              {Math.abs(calculateTrend(
                paypal.analytics.monthlyIncome,
                paypal.analytics.previousMonthIncome
              )).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500 ml-1">vs last month</span>
          </div>
        )}
      </div>

      {/* Transaction Success */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Success Rate</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {((paypal.analytics?.successRate || 0) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-success-500 rounded-full h-2 transition-all duration-500"
              style={{ width: `${(paypal.analytics?.successRate || 0) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Based on last 100 transactions
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayPalBalance;