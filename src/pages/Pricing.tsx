import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PaywallModal from '../components/payment/PaywallModal';
import Button from '../components/common/Button';
import Testimonials from '../components/Testimonials';

const Pricing: React.FC = () => {
  const [showPaywallModal, setShowPaywallModal] = React.useState(false);
  const { currentUser, uploadLimits } = useAuth();
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    if (!currentUser) {
      // Redirect to login if not logged in
      navigate('/login?redirect=pricing');
      return;
    }
    setShowPaywallModal(true);
  };

  return (
    <div className="bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 mb-4">
            Limited Time Offer: 20% Off Annual Plans
          </span>
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Workfusion Pro
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-xl text-gray-500">
            Unlock the full potential of your financial data with our premium features and transform your business decisions
          </p>
        </div>

      <div className="mt-12 space-y-12 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-8 relative">
        {/* Best Value Badge */}
        <div className="absolute top-0 right-1/2 transform translate-x-4 -translate-y-3 z-10 lg:translate-x-0 lg:right-0 lg:left-1/2">
          <div className="bg-secondary-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
            BEST VALUE
          </div>
        </div>
        {/* Free Plan */}
        <div className="relative p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">Free</h3>
            <p className="mt-4 flex items-baseline text-gray-900">
              <span className="text-5xl font-extrabold tracking-tight">$0</span>
              <span className="ml-1 text-xl font-semibold">/month</span>
            </p>
            <p className="mt-6 text-gray-500">Perfect for trying out Workfusion.</p>

            <ul className="mt-6 space-y-6">
              <li className="flex">
                <svg className="flex-shrink-0 w-6 h-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-500">First file upload free</span>
              </li>
              <li className="flex">
                <svg className="flex-shrink-0 w-6 h-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-500">Basic financial insights</span>
              </li>
              <li className="flex">
                <svg className="flex-shrink-0 w-6 h-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-500">One free upload per month (registered users)</span>
              </li>
              <li className="flex">
                <svg className="flex-shrink-0 w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="ml-3 text-gray-500">Limited report downloads</span>
              </li>
            </ul>
          </div>

          <div className="mt-8">
            <div className="rounded-lg shadow-md">
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => navigate('/')}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>

        {/* Premium Plan */}
        <div className="relative p-8 bg-primary-50 border border-primary-200 rounded-2xl shadow-sm flex flex-col">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-primary-900">Pro</h3>
            <p className="absolute top-0 py-1.5 px-4 bg-primary-600 rounded-full text-xs font-semibold uppercase tracking-wide text-white transform -translate-y-1/2">
              Most Popular
            </p>
            <p className="mt-4 flex items-baseline text-primary-900">
              <span className="text-5xl font-extrabold tracking-tight">$9.99</span>
              <span className="ml-1 text-xl font-semibold">/month</span>
            </p>
            <p className="mt-6 text-primary-700">Unlock the full power of Workfusion.</p>

            <ul className="mt-6 space-y-6">
              <li className="flex">
                <svg className="flex-shrink-0 w-6 h-6 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-primary-700">Unlimited file uploads</span>
              </li>
              <li className="flex">
                <svg className="flex-shrink-0 w-6 h-6 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-primary-700">Advanced financial insights</span>
              </li>
              <li className="flex">
                <svg className="flex-shrink-0 w-6 h-6 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-primary-700">Export to Excel/Notion</span>
              </li>
              <li className="flex">
                <svg className="flex-shrink-0 w-6 h-6 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-primary-700">Smart alerts & recommendations</span>
              </li>
              <li className="flex">
                <svg className="flex-shrink-0 w-6 h-6 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-primary-700">Priority support</span>
              </li>
              <li className="flex">
                <svg className="flex-shrink-0 w-6 h-6 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-primary-700">Bank integration</span>
              </li>
            </ul>
          </div>

          <div className="mt-8">
            <div className="rounded-lg shadow-md">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleUpgradeClick}
              >
                {uploadLimits.hasPremium ? 'Already Subscribed' : 'Upgrade Now'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-24">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center">Frequently Asked Questions</h2>
        <div className="mt-12 space-y-8">
          <div>
            <h3 className="text-xl font-medium text-gray-900">What's included in the free plan?</h3>
            <p className="mt-2 text-gray-500">The free plan includes one file upload for non-registered users, and one upload per month for registered users. You'll get basic insights into your financial data.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-gray-900">Can I cancel my subscription?</h3>
            <p className="mt-2 text-gray-500">Yes, you can cancel your subscription at any time. Your premium features will remain active until the end of your billing period.</p>
          </div>
          <div>
            <h3 className="text-xl font-medium text-gray-900">How do referrals work?</h3>
            <p className="mt-2 text-gray-500">Invite 3 friends to join Workfusion and you'll unlock an extra file upload for the month. Each friend needs to create an account using your unique referral link.</p>
          </div>
        </div>
      </div>

      {/* Paywall Modal */}
      {showPaywallModal && (
        <PaywallModal isOpen={showPaywallModal} onClose={() => setShowPaywallModal(false)} />
      )}
      </div>
      
      {/* Testimonials Section */}
      <div className="mt-24">
        <Testimonials withCTA={true} />
      </div>
    </div>
  );
};

export default Pricing;