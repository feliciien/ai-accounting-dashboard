import React, { useEffect, useState } from 'react';
import { 
  PayPalScriptProvider, 
  PayPalButtons,
  ReactPayPalScriptOptions,
  PayPalButtonsComponentProps,
  FUNDING
} from '@paypal/react-paypal-js';
import { useAuth } from '../../context/AuthContext';
import { updateUserPremiumStatus, PaymentDetails } from '../../services/userService';
import { verifyPayPalConfig, PayPalConfigStatus } from '../../lib/paypalConfigVerifier';

// Define the types that are missing from the library
type OrderResponseBody = {
  id: string;
  status: string;
  payer: {
    payer_id: string;
  };
  purchase_units: Array<{
    amount: {
      value: string;
      currency_code: string;
    };
  }>;
  create_time?: string;
  update_time?: string;
};

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [paypalStatus, setPaypalStatus] = useState<PayPalConfigStatus | null>(null);
  
  const { currentUser, updateUploadLimits } = useAuth();
  
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
  
  const handlePaymentSuccess = async (details: OrderResponseBody) => {
    setLoading(true);
    setError('');
    
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to complete this purchase');
      }
      
      // Create payment details object
      const paymentDetails: PaymentDetails = {
        transactionId: details.id,
        payerId: details.payer.payer_id,
        amount: details.purchase_units[0].amount.value,
        currency: details.purchase_units[0].amount.currency_code,
        status: details.status,
        purchaseDate: new Date().toISOString()
      };
      
      // Update user's premium status using the service
      await updateUserPremiumStatus(currentUser.uid, paymentDetails);
      
      // Update local state
      await updateUploadLimits({ hasPremium: true });
      
      setSuccess(true);
      console.log('Premium subscription activated successfully');
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };
  
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
                className="text-gray-400 hover:text-gray-500"
                disabled={loading}
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
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Subscription activated!</h3>
                <p className="mt-1 text-sm text-gray-500">Thank you for subscribing to our premium plan. You now have unlimited uploads and access to all premium features.</p>
              </div>
            ) : (
              <>
                <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-100">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Premium Benefits</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">Unlimited document uploads</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">Advanced financial insights</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">Priority customer support</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-center items-baseline">
                    <span className="text-5xl font-extrabold text-gray-900">$9.99</span>
                    <span className="text-gray-500 ml-1">/month</span>
                  </div>
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
                          // Use environment variable for plan ID if available, otherwise use default
                          const planId = process.env.REACT_APP_PAYPAL_MONTHLY_PLAN_ID || 'P-8Y551355TK076831TM5M7OZA';
                          return actions.subscription.create({
                            plan_id: planId
                          });
                        }}
                        onApprove={(data, actions) => {
                          setLoading(true);
                          
                          // Return a Promise to satisfy the PayPalButtonOnApprove type
                          return new Promise<void>((resolve, reject) => {
                            // Create a custom OrderResponseBody from subscription data
                            const subscriptionDetails: OrderResponseBody = {
                              id: data.subscriptionID || 'unknown-subscription',
                              status: 'COMPLETED',
                              payer: {
                                payer_id: data.payerID || 'unknown'
                              },
                              purchase_units: [{
                                amount: {
                                  value: '10',
                                  currency_code: 'USD'
                                }
                              }]
                            };
                            
                            // Add subscription-specific data to payment details
                            const paymentDetails: PaymentDetails = {
                              transactionId: data.orderID || data.subscriptionID || 'unknown-transaction',
                              payerId: data.payerID || 'unknown',
                              amount: '9.99',
                              currency: 'USD',
                              status: 'COMPLETED',
                              purchaseDate: new Date().toISOString(),
                              subscriptionId: data.subscriptionID || undefined,
                              subscriptionStatus: 'ACTIVE',
                              planId: process.env.REACT_APP_PAYPAL_MONTHLY_PLAN_ID || 'P-8Y551355TK076831TM5M7OZA'
                            };
                            
                            // Update user's premium status directly with subscription data
                            if (currentUser) {
                              updateUserPremiumStatus(currentUser.uid, paymentDetails)
                                .then(() => {
                                  // Update local state
                                  updateUploadLimits({ hasPremium: true });
                                  setSuccess(true);
                                  console.log('Premium subscription activated successfully');
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