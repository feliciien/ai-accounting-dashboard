/**
 * User Service
 * 
 * Handles user-related operations including premium subscription management
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '../lib/firebase';

export interface PaymentDetails {
  transactionId: string;
  payerId: string;
  amount: string;
  currency: string;
  status: string;
  purchaseDate: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  planId?: string;
  planType?: 'monthly' | 'annual';
}

export interface SubscriptionStatus {
  hasPremium: boolean;
  premiumPurchaseDate?: string;
  paymentDetails?: PaymentDetails;
}

/**
 * Updates a user's premium subscription status in Firestore
 */
export const updateUserPremiumStatus = async (
  userId: string,
  paymentDetails: PaymentDetails
): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required to update premium status');
  }

  const db = getFirebaseFirestore();
  const userDocRef = doc(db, 'users', userId);

  // First check if the user document exists
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) {
    throw new Error('User document not found');
  }

  // Check if this is a subscription payment
  const isSubscription = paymentDetails.transactionId.startsWith('I-') || !!paymentDetails.subscriptionId;
  
  // Update the user's premium status
  await updateDoc(userDocRef, {
    hasPremium: true,
    premiumPurchaseDate: new Date().toISOString(),
    subscriptionActive: isSubscription,
    subscriptionId: paymentDetails.subscriptionId || paymentDetails.transactionId,
    planId: paymentDetails.planId || 'P-8Y551355TK076831TM5M7OZA',
    paymentDetails: {
      transactionId: paymentDetails.transactionId,
      payerId: paymentDetails.payerId,
      amount: paymentDetails.amount,
      currency: paymentDetails.currency,
      status: paymentDetails.status,
      purchaseDate: new Date().toISOString(),
      subscriptionId: paymentDetails.subscriptionId,
      subscriptionStatus: paymentDetails.subscriptionStatus || 'ACTIVE',
      planId: paymentDetails.planId || 'P-8Y551355TK076831TM5M7OZA',
      planType: paymentDetails.planType
    }
  });
};

/**
 * Gets a user's current subscription status
 */
export const getUserSubscriptionStatus = async (userId: string): Promise<SubscriptionStatus> => {
  if (!userId) {
    throw new Error('User ID is required to get subscription status');
  }

  const db = getFirebaseFirestore();
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    return { hasPremium: false };
  }

  const userData = userDoc.data();
  return {
    hasPremium: userData.hasPremium || false,
    premiumPurchaseDate: userData.premiumPurchaseDate,
    paymentDetails: userData.paymentDetails
  };
};