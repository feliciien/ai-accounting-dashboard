import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      if (!userData.stripe || !userData.stripe.access_token) {
        return res.status(400).json({ error: 'Stripe not connected' });
      }
      
      // Remove Stripe data from the user document
      await updateDoc(doc(db, 'users', userId), {
        stripe: null
      });
      
      // Track the disconnect event
      trackEvent('stripe_disconnect_success', {
        user_id: userId
      });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error verifying auth token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Error disconnecting Stripe:', error);
    
    // Track the error
    trackEvent('stripe_disconnect_error', {
      error: String(error)
    });
    
    return res.status(500).json({ error: 'Failed to disconnect Stripe' });
  }
}