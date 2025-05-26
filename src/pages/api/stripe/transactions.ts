import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from '../../../lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { trackEvent } from '../../../utils/analytics';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );
  
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the current user from Firebase Auth
    const authToken = req.headers.authorization?.split('Bearer ')[1];
    if (!authToken) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
      // Verify the token
      const decodedToken = await getAuth().verifyIdToken(authToken);
      const userId = decodedToken.uid;
      
      // Get the user document
      const db = getFirebaseFirestore();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data();
      
      // Check if Stripe is connected
      if (!userData.stripe || !userData.stripe.stripe_user_id) {
        return res.status(400).json({ error: 'Stripe not connected' });
      }
      
      // Initialize Stripe with the secret key
      const secretKey = process.env.REACT_APP_STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error('Stripe secret key not configured');
      }
      
      const stripe = new Stripe(secretKey, {
        apiVersion: '2025-04-30.basil' as any
      });
      
      // Get query parameters
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get the charges using the connected account ID
      const charges = await stripe.charges.list({
        limit,
      }, {
        stripeAccount: userData.stripe.stripe_user_id
      });
      
      // Track the transactions fetch event
      trackEvent('stripe_transactions_fetch_success', {
        user_id: userId
      });
      
      return res.status(200).json(charges);
    } catch (error) {
      console.error('Error verifying auth token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Error fetching Stripe transactions:', error);
    
    // Track the error
    trackEvent('stripe_transactions_fetch_error', {
      error: String(error)
    });
    
    return res.status(500).json({ error: 'Failed to fetch Stripe transactions' });
  }
}