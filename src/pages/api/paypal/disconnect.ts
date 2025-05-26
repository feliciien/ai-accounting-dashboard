import type { NextApiRequest, NextApiResponse } from 'next';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirebaseFirestore } from '../../../lib/firebase';
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
      
      // Track the PayPal disconnect event
      trackEvent('paypal_disconnect_initiated', {
        user_id: userId
      });

      // Remove PayPal integration data from Firestore
      const db = getFirebaseFirestore();
      await updateDoc(doc(db, 'users', userId), {
        paypal: deleteField()
      });
      
      // Return success
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error verifying auth token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Error disconnecting PayPal:', error);
    return res.status(500).json({ error: 'Failed to disconnect PayPal' });
  }
}