import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SubscriptionBannerProps {
  className?: string;
}

const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ className = '' }) => {
  const { uploadLimits } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    // Check if banner was previously dismissed in this session
    const isDismissed = sessionStorage.getItem('subscription_banner_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);
  
  // Only show this banner to non-premium users and if not dismissed
  if (uploadLimits.hasPremium || dismissed) {
    return null;
  }
  
  const handleDismiss = () => {
    setDismissed(true);
    // Store in session storage so it doesn't reappear on page refresh
    sessionStorage.setItem('subscription_banner_dismissed', 'true');
  };
  
  // Convert boolean to number for comparison
  const freeUploadUsedNum = uploadLimits.freeUploadUsed ? 1 : 0;
  const isLimitReached = freeUploadUsedNum >= 1;
  const remainingUploads = 1 - freeUploadUsedNum;
  const hasBonusUploads = uploadLimits.bonusUploadsAvailable > 0;
  
  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 sm:p-4 shadow-sm transition-all duration-300 hover:shadow-md ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-all duration-200 p-1.5 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 transform hover:rotate-90 hover:scale-110 z-10"
          aria-label="Dismiss banner"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center pr-8 sm:pr-0">
          <div className="flex-shrink-0">
            {isLimitReached ? (
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="ml-2 sm:ml-3">
            <h3 className={`text-xs sm:text-sm font-medium ${isLimitReached ? 'text-red-800' : 'text-blue-800'}`}>
              {isLimitReached ? (
                <span className="font-bold">Upload limit reached!</span>
              ) : (
                <>
                  {remainingUploads > 0 && (
                    <div className="bg-blue-50 p-2 sm:p-3 rounded-lg mb-2 sm:mb-4">
                      <span className="text-xs sm:text-sm">
                        You have <span className="font-bold">{remainingUploads}</span> free upload{remainingUploads === 1 ? '' : 's'} remaining this month
                        {hasBonusUploads && (
                          <span className="ml-1">plus <span className="font-bold">{uploadLimits.bonusUploadsAvailable}</span> bonus upload{uploadLimits.bonusUploadsAvailable === 1 ? '' : 's'}</span>
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}
              {hasBonusUploads && (
                <span className="ml-1">plus <span className="font-bold">{uploadLimits.bonusUploadsAvailable}</span> bonus upload{uploadLimits.bonusUploadsAvailable === 1 ? '' : 's'}</span>
              )}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5 sm:mt-1">
              {isLimitReached ? 
                'Upgrade to Pro for unlimited uploads and premium features' : 
                'Pro users enjoy unlimited uploads and advanced AI insights'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {isLimitReached && (
            <span className="hidden sm:inline-block text-xs font-medium text-red-600 animate-pulse">
              Unlock unlimited uploads →
            </span>
          )}
          <Link
            to="/pricing"
            className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm ${isLimitReached ? 'text-white bg-red-600 hover:bg-red-700' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105 hover:shadow-md`}
          >
            {isLimitReached ? 'Upgrade Now' : 'View Plans'}
            <svg className="ml-1 -mr-0.5 h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBanner;