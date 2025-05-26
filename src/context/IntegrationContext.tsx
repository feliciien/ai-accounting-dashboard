import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { getFirebaseFirestore } from '../lib/firebase';

interface PayPalTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'declined';
  type: 'payment' | 'refund' | 'withdrawal' | 'deposit';
}

interface PayPalBalance {
  available: number;
  pending: number;
  previousBalance?: number;
}

interface PayPalAnalytics {
  monthlyIncome: number;
  previousMonthIncome?: number;
  successRate: number;
  volume: number;
  avgTransaction: number;
}

interface IntegrationStatus {
  connected: boolean;
  connectedAt?: number;
  balance?: PayPalBalance;
  transactions?: PayPalTransaction[];
  analytics?: PayPalAnalytics;
}

interface IntegrationContextType {
  xero: IntegrationStatus;
  paypal: IntegrationStatus;
  stripe: IntegrationStatus;
  bank: IntegrationStatus;
  refreshStatus: () => Promise<void>;
  updatePayPalStatus: (status: Partial<IntegrationStatus>) => void;
}

const defaultStatus: IntegrationStatus = {
  connected: false
};

const defaultContext: IntegrationContextType = {
  xero: defaultStatus,
  paypal: defaultStatus,
  stripe: defaultStatus,
  bank: defaultStatus,
  refreshStatus: async () => {},
  updatePayPalStatus: () => {}
};

const IntegrationContext = createContext<IntegrationContextType>(defaultContext);

export const useIntegration = () => {
  const context = useContext(IntegrationContext);
  if (context === undefined) {
    throw new Error('useIntegration must be used within an IntegrationProvider');
  }
  return context;
};

export const IntegrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [xero, setXero] = useState<IntegrationStatus>(defaultStatus);
  const [paypal, setPaypal] = useState<IntegrationStatus>(defaultStatus);
  const [stripe, setStripe] = useState<IntegrationStatus>(defaultStatus);
  const [bank, setBank] = useState<IntegrationStatus>(defaultStatus);

  const refreshStatus = async () => {
    if (!currentUser) return;

    try {
      // Get integration status from Firestore
      const db = getFirebaseFirestore();
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if PayPal integration exists
        if (userData.paypal && userData.paypal.access_token) {
          setPaypal({
            connected: true,
            connectedAt: userData.paypal.created_at,
            balance: userData.paypal.balance,
            transactions: userData.paypal.transactions,
            analytics: userData.paypal.analytics
          });
        } else {
          setPaypal(defaultStatus);
        }
        
        // Set other integration statuses if they exist
        setXero(userData.xero ? { connected: true, connectedAt: userData.xero.created_at } : defaultStatus);
        setStripe(userData.stripe ? { connected: true, connectedAt: userData.stripe.created_at } : defaultStatus);
        setBank(userData.bank ? { connected: true, connectedAt: userData.bank.created_at } : defaultStatus);
      }
    } catch (error) {
      console.error('Failed to fetch integration status:', error);
    }
  };

  const updatePayPalStatus = (status: Partial<IntegrationStatus>) => {
    setPaypal(prev => ({ ...prev, ...status }));
  };

  useEffect(() => {
    if (currentUser) {
      refreshStatus();
    } else {
      // Reset status when user logs out
      setXero(defaultStatus);
      setPaypal(defaultStatus);
      setStripe(defaultStatus);
      setBank(defaultStatus);
    }
  }, [currentUser]);

  return (
    <IntegrationContext.Provider
      value={{
        xero,
        paypal,
        stripe,
        bank,
        refreshStatus,
        updatePayPalStatus
      }}
    >
      {children}
    </IntegrationContext.Provider>
  );
};