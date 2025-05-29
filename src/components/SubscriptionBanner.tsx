import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SubscriptionBannerProps {
  className?: string;
}

const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ className = '' }) => {
  const { uploadLimits } = useAuth();
  
  // Only show this banner to non-premium users
  if (uploadLimits.hasPremium) {
    return null;
  }
  
  // Convert boolean to number for comparison
  const freeUploadUsedNum = uploadLimits.freeUploadUsed ? 1 : 0;
  const isLimitReached = freeUploadUsedNum >= 1;
  const remainingUploads = 1 - freeUploadUsedNum;
  const hasBonusUploads = uploadLimits.bonusUploadsAvailable > 0;
  
  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {isLimitReached ? (
              <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${isLimitReached ? 'text-red-800' : 'text-blue-800'}`}>
              {isLimitReached ? (
                <span className="font-bold">Upload limit reached!</span>
              ) : (
                <>
                  <span className="font-bold">{remainingUploads}</span> free upload{remainingUploads === 1 ? '' : 's'} remaining this month
                </>
              )}
              {hasBonusUploads && (
                <span className="ml-1">plus <span className="font-bold">{uploadLimits.bonusUploadsAvailable}</span> bonus upload{uploadLimits.bonusUploadsAvailable === 1 ? '' : 's'}</span>
              )}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {isLimitReached ? 
                'Upgrade to Pro for unlimited uploads and premium features' : 
                'Pro users enjoy unlimited uploads and advanced AI insights'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isLimitReached && (
            <span className="text-xs font-medium text-red-600 animate-pulse">
              Unlock unlimited uploads →
            </span>
          )}
          <Link
            to="/pricing"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${isLimitReached ? 'text-white bg-red-600 hover:bg-red-700' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 transform hover:scale-105`}
          >
            {isLimitReached ? 'Upgrade Now' : 'View Plans'}
            <svg className="ml-1 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBanner;