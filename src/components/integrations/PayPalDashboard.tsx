import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useIntegration } from '../../context/IntegrationContext';
import { trackEvent } from '../../utils/analytics';
import PayPalBalance from './PayPalBalance';
import PayPalTransactions from './PayPalTransactions';
import PayPalAnalytics from './PayPalAnalytics';
import PayPalErrorBoundary from './PayPalErrorBoundary';
import { useNotification } from '../../context/NotificationContext';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

const PayPalDashboard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const { paypal } = useIntegration();
  const { showNotification } = useNotification();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date()
  });
  const [transactionLimit, setTransactionLimit] = useState<number>(10);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'transactions' | 'analytics'>('transactions');

  const handleConnect = async () => {
    setIsConnecting(true);
    trackEvent('paypal_connect_attempt', {
      user_id: currentUser?.uid,
      timestamp: new Date().toISOString()
    });
    
    try {
      window.location.href = '/api/paypal/connect';
    } catch (error) {
      console.error('Error connecting to PayPal:', error);
      showNotification({
        type: 'error',
        message: 'Unable to connect to PayPal. Please try again or contact support.',
        timestamp: Date.now(),
        id: 'paypal-connect-error',
        read: false
      });
      setIsConnecting(false);
    }
  };

  const handleDateRangeChange = (days: number) => {
    setDateRange({
      startDate: new Date(new Date().setDate(new Date().getDate() - days)),
      endDate: new Date()
    });
  };

  const handleLimitChange = (limit: number) => {
    setTransactionLimit(limit);
    trackEvent('paypal_limit_change', {
      user_id: currentUser?.uid,
      new_limit: limit
    });
  };

  return (
    <PayPalErrorBoundary>
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">PayPal Integration</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your PayPal transactions and view real-time analytics
            </p>
          </div>
          
          {paypal.connected && (
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <svg className="-ml-1 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                  <circle cx="4" cy="4" r="3" />
                </svg>
                Connected
              </span>
              <button 
                onClick={() => {
                  trackEvent('paypal_disconnect_attempt', {
                    user_id: currentUser?.uid
                  });
                  window.location.href = '/api/paypal/disconnect';
                }}
                className="text-sm text-danger-600 hover:text-danger-800 font-medium"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {paypal.connected ? (
          <>
            {/* View Toggle */}
            <div className="flex justify-center p-1 bg-gray-100 rounded-lg w-fit">
              <button
                onClick={() => setActiveView('transactions')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'transactions'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'analytics'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Analytics
              </button>
            </div>

            {/* Balance Card */}
            <div className="mb-6">
              <PayPalErrorBoundary>
                <PayPalBalance className="mb-6" />
              </PayPalErrorBoundary>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Filters */}
              <div className="border-b border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <label htmlFor="dateRange" className="text-sm font-medium text-gray-700">
                      Period:
                    </label>
                    <select
                      id="dateRange"
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                      onChange={(e) => handleDateRangeChange(Number(e.target.value))}
                      defaultValue="30"
                    >
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                      <option value="180">Last 6 months</option>
                      <option value="365">Last year</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label htmlFor="limit" className="text-sm font-medium text-gray-700">
                      Show:
                    </label>
                    <select
                      id="limit"
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                      onChange={(e) => handleLimitChange(Number(e.target.value))}
                      defaultValue="10"
                    >
                      <option value="5">5 per page</option>
                      <option value="10">10 per page</option>
                      <option value="25">25 per page</option>
                      <option value="50">50 per page</option>
                      <option value="100">100 per page</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-4">
                <PayPalErrorBoundary>
                  {activeView === 'transactions' ? (
                    <PayPalTransactions 
                      limit={transactionLimit}
                      dateRange={dateRange}
                      onError={(error) => {
                        showNotification({
                          type: 'error',
                          message: 'Unable to load transactions. Please try again.',
                          timestamp: Date.now(),
                          id: 'transaction-load-error',
                          read: false
                        });
                        console.error('Transaction load error:', error);
                      }}
                    />
                  ) : (
                    <PayPalAnalytics 
                      onError={(error) => {
                        showNotification({
                          type: 'error',
                          message: 'Unable to load analytics. Please try again.',
                          timestamp: Date.now(),
                          id: 'analytics-load-error',
                          read: false
                        });
                        console.error('Analytics load error:', error);
                      }}
                    />
                  )}
                </PayPalErrorBoundary>
              </div>
            </div>

            {/* External Link */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 mb-2">
                For real-time data and advanced features, visit your PayPal dashboard.
              </p>
              <a 
                href="https://www.paypal.com/signin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                onClick={() => {
                  trackEvent('paypal_external_link_clicked', {
                    user_id: currentUser?.uid,
                    location: 'dashboard_footer'
                  });
                }}
              >
                Open PayPal Dashboard
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="max-w-lg mx-auto text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your PayPal Account</h3>
              <p className="text-gray-600 mb-4">
                Link your PayPal Business account to view your balance and transaction history directly in your AI Accounting Dashboard.
              </p>
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">View your PayPal balance in real-time</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Track all transactions in one place</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Get insights into payment patterns</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">Export transaction data for accounting</span>
                </li>
              </ul>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-500">
                We only request read-only access to your PayPal account information.
              </div>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  'Connect PayPal Account'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </PayPalErrorBoundary>
  );
};

export default PayPalDashboard;