import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './common/Button';
import { useAuth } from '../context/AuthContext';

interface SubscriptionCTAProps {
  variant?: 'full' | 'compact';
  className?: string;
  title?: string;
  subtitle?: string;
}

const SubscriptionCTA: React.FC<SubscriptionCTAProps> = ({
  variant = 'full',
  className = '',
  title = 'Unlock the Full Potential of Your Financial Data',
  subtitle = 'Upgrade to Pro for unlimited uploads, advanced AI insights, and premium features',
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleUpgradeClick = () => {
    navigate('/pricing');
  };

  const features = [
    'Unlimited file uploads',
    'Advanced AI financial insights',
    'Real-time anomaly detection',
    'Custom financial reports',
    'Priority customer support',
  ];

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-primary-100 mt-1">{subtitle}</p>
          </div>
          <Button 
            variant="secondary" 
            size="lg" 
            onClick={handleUpgradeClick}
            className="whitespace-nowrap"
          >
            Upgrade to Pro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-xl overflow-hidden ${className}`}>
      <div className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-lg text-primary-100">
              {subtitle}
            </p>
            <div className="mt-8">
              <div className="flex items-center">
                <h3 className="flex-shrink-0 pr-4 text-sm font-semibold uppercase tracking-wider text-white">
                  What's included
                </h3>
                <div className="flex-1 border-t border-primary-400"></div>
              </div>
              <ul className="mt-8 space-y-4">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-secondary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-base text-primary-100">{feature}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10">
              <Button 
                variant="secondary" 
                size="xl" 
                onClick={handleUpgradeClick}
                className="w-full sm:w-auto"
              >
                Upgrade to Pro
              </Button>
              <p className="mt-3 text-sm text-primary-100">
                Try risk-free with our 14-day money-back guarantee
              </p>
            </div>
          </div>
          <div className="mt-12 lg:mt-0">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-primary-700 bg-opacity-50 rounded-xl h-full w-full"></div>
              </div>
              <div className="relative bg-primary-700 bg-opacity-25 rounded-xl p-8 flex flex-col items-center justify-center h-full">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-2">Pro Plan</h3>
                  <div className="flex justify-center items-baseline">
                    <span className="text-5xl font-extrabold text-white">$9.99</span>
                    <span className="text-xl text-primary-100 ml-1">/month</span>
                  </div>
                  <p className="mt-4 text-primary-100 text-sm">
                    Cancel anytime. Upgrade or downgrade as needed.
                  </p>
                  <div className="mt-6">
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      fullWidth 
                      onClick={handleUpgradeClick}
                    >
                      Get Started Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCTA;