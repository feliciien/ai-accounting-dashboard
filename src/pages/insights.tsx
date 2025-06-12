import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import Sidebar from '../components/Sidebar';
import { enhancedAnalytics } from '../services/EnhancedAnalyticsService';
import EnhancedAuthModal from '../components/auth/EnhancedAuthModal';

const InsightsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  useEffect(() => {
    // Track page view
    enhancedAnalytics.trackEnhancedPageView('/insights', 'Analytics Insights', currentUser?.uid);
  }, [currentUser]);
  
  return (
    <>
      <Head>
        <title>Analytics Insights | WorkFusion</title>
        <meta name="description" content="Gain valuable insights into your financial data and user activity" />
      </Head>
      
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
        <Sidebar isMobileMenuOpen={false} toggleMobileMenu={() => {}} />
        
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics Insights</h1>
                <p className="mt-1 text-gray-500">Gain valuable insights into your financial data and user activity</p>
              </div>
              
              {!currentUser && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="mt-4 md:mt-0 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Sign in to Access Full Insights
                </button>
              )}
              
              {currentUser && (
                <div className="mt-4 md:mt-0 flex items-center space-x-2">
                  <label htmlFor="timeRange" className="text-sm font-medium text-gray-700">
                    Time Range:
                  </label>
                  <select
                    id="timeRange"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as any)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="day">Last 24 Hours</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="year">Last 12 Months</option>
                  </select>
                </div>
              )}
            </div>
            
            {currentUser ? (
              <AnalyticsDashboard timeRange={timeRange} />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="mb-6">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Analytics Insights</h2>
                <p className="text-gray-600 mb-6">
                  Sign in to access detailed analytics about your financial data, user activity, and performance metrics.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}
            
            {/* Preview of insights for non-authenticated users */}
            {!currentUser && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">User Activity Tracking</h3>
                  <p className="text-gray-600">
                    Monitor user engagement and behavior patterns to optimize your application experience.
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Financial Performance</h3>
                  <p className="text-gray-600">
                    Track revenue, expenses, and other key financial metrics to make data-driven decisions.
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-purple-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Conversion Analytics</h3>
                  <p className="text-gray-600">
                    Analyze conversion rates and user journeys to identify opportunities for improvement.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {showAuthModal && (
        <EnhancedAuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          initialMode="login"
        />
      )}
    </>
  );
};

export default InsightsPage;
