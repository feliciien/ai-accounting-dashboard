import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { enhancedAnalytics, AnalyticsDashboardData } from '../../services/EnhancedAnalyticsService';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface AnalyticsDashboardProps {
  timeRange?: 'day' | 'week' | 'month' | 'year';
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ timeRange = 'week' }) => {
  const { currentUser } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Calculate date range based on timeRange
        const endDate = new Date();
        const startDate = new Date();
        
        switch (timeRange) {
          case 'day':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }
        
        const data = await enhancedAnalytics.getAnalyticsDashboardData({
          startDate,
          endDate,
          userId: currentUser?.uid
        });
        
        setAnalyticsData(data);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [timeRange, currentUser]);
  
  // Convert event counts to chart data
  const getEventCountsChartData = () => {
    if (!analyticsData?.eventCounts) return [];
    
    return Object.entries(analyticsData.eventCounts).map(([name, value]) => ({
      name,
      value
    }));
  };
  
  // Convert user activity to chart data
  const getUserActivityChartData = () => {
    if (!analyticsData?.userActivity) return [];
    
    return Object.entries(analyticsData.userActivity).map(([date, count]) => ({
      date,
      visits: count
    }));
  };
  
  // Convert conversion rates to chart data
  const getConversionRatesChartData = () => {
    if (!analyticsData?.conversionRates) return [];
    
    return Object.entries(analyticsData.conversionRates).map(([name, rate]) => ({
      name,
      rate: rate * 100 // Convert to percentage
    }));
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-red-700">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!analyticsData) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-yellow-700">
        <p>No analytics data available for the selected time period.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Analytics Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-blue-700 mb-2">Total Events</h3>
          <p className="text-3xl font-bold text-blue-800">
            {Object.values(analyticsData.eventCounts).reduce((sum, count) => sum + count, 0)}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-green-700 mb-2">User Sessions</h3>
          <p className="text-3xl font-bold text-green-800">
            {Object.values(analyticsData.userActivity).reduce((sum, count) => sum + count, 0)}
          </p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-purple-700 mb-2">Avg. Conversion Rate</h3>
          <p className="text-3xl font-bold text-purple-800">
            {Object.values(analyticsData.conversionRates).length > 0 
              ? `${(Object.values(analyticsData.conversionRates).reduce((sum, rate) => sum + rate, 0) / Object.values(analyticsData.conversionRates).length * 100).toFixed(1)}%` 
              : '0%'}
          </p>
        </div>
        
        {analyticsData.revenueData && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-yellow-700 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-yellow-800">
              ${Object.values(analyticsData.revenueData).reduce((sum, amount) => sum + amount, 0).toFixed(2)}
            </p>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Event Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getEventCountsChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {getEventCountsChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-4">User Activity</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={getUserActivityChartData()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="visits" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Conversion Rates</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getConversionRatesChartData()}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="rate" fill="#82ca9d" name="Conversion Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-primary-500 focus:text-primary-700"
          >
            Refresh Data
          </button>
          <button
            type="button"
            onClick={() => {
              // Track this analytics view
              enhancedAnalytics.trackUserAction('analytics_dashboard_viewed', {
                time_range: timeRange
              }, currentUser?.uid);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-primary-500 focus:text-primary-700"
          >
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AnalyticsDashboard);
