import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './common/Button';
import { useAuth } from '../context/AuthContext';

interface SubscriptionBannerProps {
  className?: string;
}

const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { uploadLimits } = useAuth();
  
  // Don't show banner for premium users
  if (uploadLimits.hasPremium) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center">
            <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-primary-500 bg-opacity-30 mr-4">
              <svg className="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Upgrade to Pro</h3>
              <p className="text-primary-100 text-sm">
                {uploadLimits.freeUploadUsed && uploadLimits.bonusUploadsAvailable === 0 
                  ? "You've reached your upload limit for this month" 
                  : `${uploadLimits.bonusUploadsAvailable} bonus uploads available`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => navigate('/pricing')}
          >
            View Plans
          </Button>
          <div className="text-primary-100 text-xs">
            Starting at $9.99/month
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBanner;