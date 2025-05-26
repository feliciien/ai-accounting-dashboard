import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface StripeRevenueProps {
  className?: string;
  period?: 'week' | 'month' | 'year';
}

interface RevenueData {
  date: string;
  amount: number;
}

const StripeRevenue: React.FC<StripeRevenueProps> = ({ 
  className = '',
  period = 'month'
}) => {
  const { currentUser } = useAuth();
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'line' | 'bar'>('line');

  useEffect(() => {
    const fetchRevenueData = async () => {
      if (!currentUser) return;

      try {
        setIsLoading(true);
        setError(null);

        // Get the auth token
        const token = await currentUser.getIdToken();

        // Fetch the revenue data from our API
        const response = await fetch(`/api/stripe/revenue?period=${period}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch Stripe revenue data');
        }

        const data = await response.json();
        setRevenueData(data);
      } catch (err) {
        console.error('Error fetching Stripe revenue:', err);
        setError('Failed to load revenue information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenueData();
  }, [currentUser, period]);

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-md rounded-md border border-gray-200">
          <p className="font-medium text-gray-700">{label}</p>
          <p className="text-purple-600">
            Revenue: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Revenue Overview</h2>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Revenue Overview</h2>
        <div className="bg-red-100 text-red-800 p-4 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Revenue Overview</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setViewType('line')} 
            className={`px-3 py-1 rounded-md ${viewType === 'line' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
          >
            Line
          </button>
          <button 
            onClick={() => setViewType('bar')} 
            className={`px-3 py-1 rounded-md ${viewType === 'bar' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
          >
            Bar
          </button>
        </div>
      </div>
      
      <div className="h-64">
        {revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {viewType === 'line' ? (
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis 
                  tickFormatter={(value) => `$${value}`}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 1 }}
                  activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis 
                  tickFormatter={(value) => `$${value}`}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="amount" 
                  fill="#8884d8" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 italic">No revenue data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StripeRevenue;