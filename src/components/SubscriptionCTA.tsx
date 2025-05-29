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
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 shadow-sm border border-blue-100 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Upgrade to Pro</h3>
            <p className="text-sm text-gray-500">Unlock all features and get unlimited uploads</p>
          </div>
          <button
            onClick={handleUpgradeClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 transform hover:scale-105"
          >
            Upgrade Now
            <svg className="ml-1 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl ${className}`}>
      <div className="relative">
        {/* Limited Time Offer Badge */}
        <div className="absolute top-0 right-0 bg-yellow-400 text-primary-900 font-bold py-1 px-4 rounded-bl-lg transform translate-x-2 -translate-y-0 rotate-12 shadow-md z-10">
          20% OFF
        </div>
        
        <div className="px-6 py-12 sm:px-12 lg:px-16">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8">
            <div>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                {title}
              </h2>
              <p className="mt-4 text-lg text-primary-100">
                {subtitle}
              </p>
              
              {/* Social Proof */}
              <div className="mt-6 bg-primary-700 bg-opacity-50 rounded-lg p-3 border border-primary-400">
                <div className="flex items-center">
                  <div className="flex -space-x-2 mr-3">
                    <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-xs font-bold text-white">JD</div>
                    <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-xs font-bold text-white">KL</div>
                    <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-white">MR</div>
                  </div>
                  <p className="text-sm text-primary-100">
                    <span className="font-medium text-white">93% of users</span> saw improved financial insights within 2 weeks
                  </p>
                </div>
              </div>
              
              <div className="mt-8">
                <div className="flex items-center">
                  <h3 className="flex-shrink-0 pr-4 text-sm font-semibold uppercase tracking-wider text-white">
                    Pro Features
                  </h3>
                  <div className="flex-1 border-t border-primary-400"></div>
                </div>
                <ul className="mt-6 space-y-4">
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
                  className="w-full sm:w-auto transform transition-all duration-150 hover:scale-105 hover:shadow-lg"
                >
                  <span>Upgrade to Pro</span>
                  <svg className="ml-2 -mr-0.5 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Button>
                <p className="mt-3 text-sm text-primary-100 flex items-center">
                  <svg className="h-5 w-5 text-secondary-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Try risk-free with our 14-day money-back guarantee
                </p>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-primary-700 bg-opacity-50 rounded-xl h-full w-full"></div>
                </div>
                <div className="relative bg-primary-700 bg-opacity-25 rounded-xl p-8 flex flex-col items-center justify-center h-full border border-primary-500 shadow-inner">
                  <div className="text-center">
                    <div className="inline-block bg-secondary-400 text-primary-900 text-xs font-bold px-3 py-1 rounded-full mb-4">
                      MOST POPULAR
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Pro Plan</h3>
                    <div className="flex justify-center items-baseline">
                      <span className="text-lg text-primary-300 line-through mr-2">$12.99</span>
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
                        className="transform transition-all duration-150 hover:scale-105 hover:shadow-lg"
                      >
                        <span>Get Started Now</span>
                        <svg className="ml-2 -mr-0.5 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </Button>
                    </div>
                    <div className="mt-4 flex justify-center">
                      <div className="flex items-center text-primary-100 text-xs">
                        <svg className="h-4 w-4 text-secondary-400 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Secure payment
                      </div>
                    </div>
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