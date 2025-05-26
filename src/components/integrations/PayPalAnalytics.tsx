import React, { useState, useEffect } from 'react';
import { useIntegration } from '../../context/IntegrationContext';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays } from 'date-fns';
import PayPalAnalyticsSkeleton from './PayPalAnalyticsSkeleton';

const COLORS = {
  payment: '#22c55e',
  refund: '#ef4444',
  withdrawal: '#f59e0b',
  deposit: '#3b82f6'
};

interface PayPalAnalyticsProps {
  onError?: (error: Error) => void;
}

const PayPalAnalytics: React.FC<PayPalAnalyticsProps> = ({ onError }) => {
  const { paypal } = useIntegration();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API call or data processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!paypal.transactions) {
          throw new Error('No transaction data available');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load analytics');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [paypal.transactions, onError]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Calculate transaction volume over time
  const volumeData = React.useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM d');
      const dayTransactions = paypal.transactions?.filter(
        t => format(t.date, 'MMM d') === dateStr
      ) || [];

      return {
        date: dateStr,
        volume: dayTransactions.length,
        income: dayTransactions
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0),
        expense: dayTransactions
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      };
    }).reverse();

    return last30Days;
  }, [paypal.transactions]);

  // Calculate transaction type distribution
  const typeDistribution = React.useMemo(() => {
    const distribution: { [key: string]: number } = {
      payment: 0,
      refund: 0,
      withdrawal: 0,
      deposit: 0
    };

    paypal.transactions?.forEach(transaction => {
      distribution[transaction.type]++;
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value
    }));
  }, [paypal.transactions]);

  // Calculate hourly transaction pattern
  const hourlyPattern = React.useMemo(() => {
    const pattern = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      transactions: 0
    }));

    paypal.transactions?.forEach(transaction => {
      const hour = new Date(transaction.date).getHours();
      pattern[hour].transactions++;
    });

    return pattern;
  }, [paypal.transactions]);

  if (isLoading) {
    return <PayPalAnalyticsSkeleton />;
  }

  if (error || !paypal.transactions) {
    return (
      <div className="text-center py-12">
        <div className="p-3 bg-danger-100 rounded-full inline-flex mb-4">
          <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Analytics</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          {error?.message || 'Unable to load analytics data. Please try again later.'}
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
    <div className="space-y-8">
      {/* Volume and Cash Flow Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Volume & Cash Flow</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volumeData}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
                tickFormatter={formatCurrency}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-lg">
                        <p className="text-sm font-medium text-gray-900 mb-2">{payload[0].payload.date}</p>
                        <div className="space-y-1">
                          <p className="text-sm text-success-600">
                            Income: {formatCurrency(payload[0].payload.income)}
                          </p>
                          <p className="text-sm text-danger-600">
                            Expense: {formatCurrency(payload[0].payload.expense)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Transactions: {payload[0].payload.volume}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="income"
                stroke="#22c55e"
                fill="url(#incomeGradient)"
                strokeWidth={2}
                name="Income"
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                fill="url(#expenseGradient)"
                strokeWidth={2}
                name="Expense"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="volume"
                stroke="#6b7280"
                strokeDasharray="4 4"
                fill="none"
                strokeWidth={2}
                name="Transaction Volume"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Type Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Types</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({
                    cx,
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    value,
                    index
                  }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#ffffff"
                        textAnchor={x > cx ? 'start' : 'end'}
                        dominantBaseline="central"
                        className="text-xs font-medium"
                      >
                        {`${typeDistribution[index].name} (${value})`}
                      </text>
                    );
                  }}
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={index} fill={COLORS[entry.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="text-sm font-medium text-gray-900">
                            {payload[0].name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {payload[0].value} transactions
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Transaction Pattern */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Activity by Hour</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyPattern}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="hour"
                  tick={{ fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis
                  tick={{ fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const hour = payload[0].payload.hour;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="text-sm font-medium text-gray-900">
                            {`${hour}:00 - ${hour + 1}:00`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {payload[0].value} transactions
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="transactions"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayPalAnalytics;