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
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 mb-6 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-blue-600 text-xl">🎓</span>
          <div>
            <p className="font-medium text-gray-900">
              New to AI Accounting?{' '}
              <button className="text-blue-600 hover:underline focus:outline-none">
                Start here →
              </button>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Upload a sample CSV to see your financial forecast in seconds
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}