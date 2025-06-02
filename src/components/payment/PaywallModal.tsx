import React, { useEffect, useState } from 'react';
import { 
  PayPalScriptProvider, 
  PayPalButtons,
  FUNDING
} from '@paypal/react-paypal-js';
import { useAuth } from '../../context/AuthContext';
import { updateUserPremiumStatus, PaymentDetails } from '../../services/userService';
import { verifyPayPalConfig, PayPalConfigStatus } from '../../lib/paypalConfigVerifier';
import { CheckIcon, ShieldCheckIcon } from '@heroicons/react/solid';

// Define the types that are missing from the library
// Removed unused OrderResponseBody type

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PlanType = 'monthly' | 'annual';

const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [paypalStatus, setPaypalStatus] = useState<PayPalConfigStatus | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  
  const { currentUser, updateUploadLimits } = useAuth();
  
  // Plan pricing details
  const plans = {
    monthly: {
      price: 9.99,
      planId: process.env.REACT_APP_PAYPAL_MONTHLY_PLAN_ID || 'P-8Y551355TK076831TM5M7OZA'
    },
    annual: {
      price: 95.88, // $7.99/month billed annually
      originalPrice: 119.88, // Original price before discount
      discount: 20, // 20% discount
      planId: process.env.REACT_APP_PAYPAL_ANNUAL_PLAN_ID || 'P-5ML4271244454362XMQWU3ZY'
    }
  };
  
  // Verify PayPal configuration when component mounts
  useEffect(() => {
    if (isOpen) {
      const status = verifyPayPalConfig();
      setPaypalStatus(status);
      
      if (!status.isConfigured && status.errors.length > 0) {
        setError(status.errors[0]);
      }
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success, onClose]);


  
  if (!isOpen) return null;
  
  // Remove unused handlePaymentSuccess function
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black opacity-40" onClick={onClose}></div>
        
        {/* Modal */}
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md z-10 relative">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Upgrade to Premium
              </h2>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 p-2"
                disabled={loading}
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            {success ? (
              <div className="text-center py-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                  <CheckIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900">Subscription activated!</h3>
                <p className="mt-2 text-gray-600">Thank you for subscribing to our premium plan. You now have unlimited uploads and access to all premium features.</p>
                <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-blue-800 font-medium">Your account has been upgraded successfully!</p>
                  <p className="text-sm text-blue-700 mt-1">Refresh the page to see all your new premium features.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Introduction section - Simplified with clear CTA */}
                <div className="mb-6 text-center">
                  <p className="text-gray-700 text-lg mb-4">Get unlimited uploads and AI-powered insights</p>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                    <p className="font-medium text-blue-800">Select a plan below to upgrade your account</p>
                  </div>
                </div>
                
                {/* Simplified plan selection */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
                    <button
                      onClick={() => setSelectedPlan('monthly')}
                      className={`flex-1 py-3 px-4 rounded-lg border ${selectedPlan === 'monthly' 
                        ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-200' 
                        : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                    >
                      <div className="text-center">
                        <div className="font-medium text-gray-900">Monthly</div>
                        <div className="text-sm text-gray-500">$9.99/month</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setSelectedPlan('annual')}
                      className={`flex-1 py-3 px-4 rounded-lg border relative ${selectedPlan === 'annual' 
                        ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-200' 
                        : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                    >
                      {/* Discount badge */}
                      <div className="absolute -top-3 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">SAVE 20%</div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900">Annual</div>
                        <div className="text-sm">
                          <span className="text-gray-500">$7.99/month</span>
                          <div className="text-xs text-gray-500">billed annually</div>
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  <div className="flex justify-center items-baseline">
                    {selectedPlan === 'monthly' ? (
                      <>
                        <span className="text-4xl font-extrabold text-gray-900">$9.99</span>
                        <span className="text-gray-500 ml-1">/month</span>
                      </>
                    ) : (
                      <div className="text-center">
                        <div className="flex items-center justify-center">
                          <span className="text-4xl font-extrabold text-gray-900">$95.88</span>
                          <span className="text-gray-500 ml-1">/year</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1 flex items-center justify-center">
                          <span className="line-through mr-2">$119.88</span>
                          <span className="text-red-500 font-medium">Save 20%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Top benefits - simplified */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Top benefits:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <CheckIcon className="h-4 w-4 text-primary-600 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Unlimited document uploads</span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-4 w-4 text-primary-600 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Advanced financial insights</span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-4 w-4 text-primary-600 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Priority customer support</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-8">
                  {paypalStatus && !paypalStatus.isConfigured ? (
                    <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
                      <h3 className="font-medium mb-2">PayPal Configuration Error</h3>
                      <p>{paypalStatus.errors[0] || 'PayPal is not properly configured.'}</p>
                      <p className="mt-2 text-sm">Please contact the administrator to resolve this issue.</p>
                    </div>
                  ) : (
                    <PayPalScriptProvider options={{ 
                      clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID || '', 
                      currency: 'USD',
                      intent: 'subscription',
                      vault: true,
                      'data-sdk-integration-source': 'button-factory'
                    }}>
                      {paypalStatus && paypalStatus.warnings.length > 0 && (
                        <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-100">
                          <p>{paypalStatus.warnings[0]}</p>
                        </div>
                      )}
                      <PayPalButtons
                        style={{ 
                          shape: 'rect', 
                          color: 'gold', 
                          layout: 'vertical', 
                          label: 'subscribe'
                        }}
                        disabled={loading}
                        fundingSource={FUNDING.PAYPAL}
                        createSubscription={(_data, actions) => {
                          // Use selected plan ID
                          const planId = plans[selectedPlan].planId;
                          return actions.subscription.create({
                            plan_id: planId
                          });
                        }}
                        onApprove={(data, actions) => {
                          setLoading(true);
                          
                          // Return a Promise to satisfy the PayPalButtonOnApprove type
                          return new Promise<void>((resolve, reject) => {
                            // Create a custom OrderResponseBody from subscription data
                            // Remove unused subscriptionDetails variable
                            
                            // Add subscription-specific data to payment details
                            const paymentDetails: PaymentDetails = {
                              transactionId: data.orderID || data.subscriptionID || 'unknown-transaction',
                              payerId: data.payerID || 'unknown',
                              amount: String(plans[selectedPlan].price),
                              currency: 'USD',
                              status: 'COMPLETED',
                              purchaseDate: new Date().toISOString(),
                              subscriptionId: data.subscriptionID || undefined,
                              subscriptionStatus: 'ACTIVE',
                              planId: plans[selectedPlan].planId,
                              planType: selectedPlan
                            };
                            
                            // Update user's premium status directly with subscription data
                            if (currentUser) {
                              updateUserPremiumStatus(currentUser.uid, paymentDetails)
                                .then(() => {
                                  // Update local state
                                  updateUploadLimits({ hasPremium: true });
                                  setSuccess(true);
                                  console.log(`Premium ${selectedPlan} subscription activated successfully`);
                                  resolve();
                                })
                                .catch((err) => {
                                  console.error('Payment processing error:', err);
                                  setError(err.message || 'Failed to process subscription');
                                  reject(err);
                                })
                                .finally(() => {
                                  setLoading(false);
                                });
                            } else {
                              const error = new Error('You must be logged in to complete this purchase');
                              setError(error.message);
                              setLoading(false);
                              reject(error);
                            }
                          });
                        }}
                        onError={(err: any) => {
                          setError('PayPal payment failed. Please try again.');
                          console.error('PayPal error:', err);
                        }}
                        onCancel={() => {
                          console.log('Payment cancelled');
                          setError('Payment was cancelled. You can try again when ready.');
                        }}
                      />
                      <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                        <ShieldCheckIcon className="h-4 w-4 mr-1 text-gray-400" />
                        <span>Secure payment processing by PayPal</span>
                      </div>
                      <div className="mt-3 text-center text-xs text-gray-500">
                        30-day money-back guarantee. Cancel anytime.  
                      </div>
                    </PayPalScriptProvider>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;