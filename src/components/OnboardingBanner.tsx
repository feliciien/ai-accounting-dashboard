import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

export default function OnboardingBanner() {
  const { uploadLimits } = useAuth();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const hasDismissed = localStorage.getItem('dismissedOnboarding');
    if (!hasDismissed && !uploadLimits.freeUploadUsed) {
      setShowBanner(true);
    }
  }, [uploadLimits.freeUploadUsed]);

  const handleDismiss = () => {
    localStorage.setItem('dismissedOnboarding', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg border border-blue-200 shadow-sm transition-all duration-300 hover:shadow-md relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
          <span className="text-blue-600 text-lg sm:text-xl mt-0.5 sm:mt-0 animate-pulse">🎓</span>
          <div>
            <p className="font-medium text-gray-900 text-sm sm:text-base">
              New to AI Accounting?{' '}
              <a href="#getting-started" className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-2 py-1 transition-all duration-200 hover:scale-105 inline-flex items-center">
                Start here <span className="ml-1 transform transition-transform group-hover:translate-x-1">→</span>
              </a>
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
              Upload a sample CSV to see your financial forecast in seconds
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-all duration-200 absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto p-1.5 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 transform hover:rotate-90 hover:scale-110"
          aria-label="Dismiss banner"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}