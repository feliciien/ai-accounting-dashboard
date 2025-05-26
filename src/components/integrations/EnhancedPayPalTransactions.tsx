import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useIntegration } from '../../context/IntegrationContext';
import { trackEvent } from '../../utils/analytics';
import { getValidPayPalToken } from '../../utils/paypalTokenRefresh';

interface Transaction {
  transaction_id: string;
  transaction_info: {
    transaction_amount: {
      value: string;
      currency_code: string;
    };
    transaction_status: string;
    transaction_note: string;
    transaction_date: string;
    transaction_type?: string;
    fee_amount?: {
      value: string;
      currency_code: string;
    };
  };
  payer_info: {
    email_address?: string;
    payer_name?: {
      given_name: string;
      surname: string;
    };
    account_id?: string;
  };
  shipping_info?: {
    address?: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country_code: string;
    };
  };
}

interface TransactionResponse {
  transaction_details: Transaction[];
  total_items: number;
  total_pages: number;
}

interface EnhancedPayPalTransactionsProps {
  limit?: number;
  className?: string;
  startDate?: Date;
  endDate?: Date;
  onTransactionsLoaded?: (count: number) => void;
  showFilters?: boolean;
}

const EnhancedPayPalTransactions: React.FC<EnhancedPayPalTransactionsProps> = ({
  limit = 10,
  className = '',
  startDate: initialStartDate,
  endDate: initialEndDate,
  onTransactionsLoaded,
  showFilters = false
}) => {
  const { currentUser } = useAuth();
  const { paypal } = useIntegration();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Local state for filters
  const [startDate, setStartDate] = useState<Date>(
    initialStartDate || new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState<Date>(initialEndDate || new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate);
    if (initialEndDate) setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  const fetchTransactions = async (page = 1) => {
    if (!paypal.connected || !currentUser) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get the auth token
      const token = await currentUser.getIdToken();

      // Format dates for API
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = endDate.toISOString();

      // Build query parameters
      const queryParams = new URLSearchParams({
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        page: page.toString(),
        limit: limit.toString()
      });

      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      // Fetch transactions from our API
      const response = await fetch(
        `/api/paypal/transactions?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch PayPal transactions');
      }

      const data: TransactionResponse = await response.json();
      setTransactions(data.transaction_details || []);
      setTotalTransactions(data.total_items || 0);
      setTotalPages(data.total_pages || 1);
      setCurrentPage(page);

      // Notify parent component if callback provided
      if (onTransactionsLoaded) {
        onTransactionsLoaded(data.transaction_details?.length || 0);
      }

      // Track successful fetch
      trackEvent('paypal_transactions_loaded', {
        user_id: currentUser.uid,
        count: data.transaction_details?.length || 0,
        total: data.total_items || 0,
        page,
      });
    } catch (error) {
      console.error('Error fetching PayPal transactions:', error);
      
      // Handle token refresh errors
      if (String(error).includes('token') && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        // Try to refresh token and retry
        try {
          await getValidPayPalToken(currentUser.uid);
          // Retry after token refresh
          setTimeout(() => fetchTransactions(page), 1000);
          return;
        } catch (refreshError) {
          setError('Authentication error. Please reconnect your PayPal account.');
        }
      } else {
        setError('Failed to load PayPal transactions. Please try again later.');
      }
      
      // Track error
      trackEvent('paypal_transactions_error', {
        user_id: currentUser.uid,
        error: String(error),
        retry_count: retryCount,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
    // Reset retry count when dependencies change
    setRetryCount(0);
  }, [currentUser, paypal.connected, startDate, endDate, statusFilter, searchTerm, limit]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchTransactions(newPage);
    }
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  // Format currency for display
  const formatCurrency = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  // Get transaction status display
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { text: string, className: string }> = {
      'S': { text: 'Success', className: 'bg-green-100 text-green-800' },
      'P': { text: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      'V': { text: 'Reversed', className: 'bg-red-100 text-red-800' },
      'F': { text: 'Failed', className: 'bg-red-100 text-red-800' },
      'D': { text: 'Denied', className: 'bg-red-100 text-red-800' },
    };
    
    return statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-800' };
  };

  if (!paypal.connected) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-2">PayPal Transactions</h3>
        <p className="text-gray-500">Connect your PayPal account to view transactions.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">PayPal Transactions</h3>
      
      {showFilters && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
            <div className="flex-1">
              <form onSubmit={handleSearchSubmit} className="flex">
                <input
                  type="text"
                  placeholder="Search transactions..."
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md hover:bg-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </button>
              </form>
            </div>
            <div className="sm:w-40">
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={handleStatusFilterChange}
              >
                <option value="all">All Status</option>
                <option value="S">Success</option>
                <option value="P">Pending</option>
                <option value="V">Reversed</option>
                <option value="F">Failed</option>
                <option value="D">Denied</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => fetchTransactions(currentPage)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Retry
            </button>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 border border-gray-200 rounded-md">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No transactions match your current filters.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.transaction_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.transaction_info.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {transaction.transaction_info?.transaction_note || 
                      (transaction.payer_info?.email_address ? `Payment from ${transaction.payer_info.email_address}` : 
                      (transaction.payer_info?.payer_name ? 
                        `Payment from ${transaction.payer_info.payer_name.given_name} ${transaction.payer_info.payer_name.surname}` : 
                        'PayPal Transaction'))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <span className={parseFloat(transaction.transaction_info?.transaction_amount?.value || '0') >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(
                          transaction.transaction_info?.transaction_amount?.value || '0',
                          transaction.transaction_info?.transaction_amount?.currency_code || 'USD'
                        )}
                      </span>
                      {transaction.transaction_info?.fee_amount && (
                        <div className="text-xs text-gray-500 mt-1">
                          Fee: {formatCurrency(
                            transaction.transaction_info.fee_amount.value,
                            transaction.transaction_info.fee_amount.currency_code
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusDisplay(transaction.transaction_info.transaction_status).className}`}
                      >
                        {getStatusDisplay(transaction.transaction_info.transaction_status).text}
                      </span>
                      {transaction.transaction_info.transaction_type && (
                        <div className="text-xs text-gray-500 mt-1">
                          {transaction.transaction_info.transaction_type}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{transactions.length > 0 ? (currentPage - 1) * limit + 1 : 0}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * limit, totalTransactions)}</span> of{' '}
                    <span className="font-medium">{totalTransactions}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Logic to show pages around current page
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === pageNum ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EnhancedPayPalTransactions;