import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirebaseAuth } from '../../../lib/firebase';
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
      
      // Track the Stripe redirect event
      trackEvent('stripe_redirect_initiated', {
        user_id: userId
      });

      // Construct the Stripe OAuth URL
      const clientId = process.env.REACT_APP_STRIPE_CLIENT_ID;
      if (!clientId) {
        throw new Error('Stripe Client ID not configured');
      }

      // Use the actual domain in production
      const baseUrl = process.env.REACT_APP_URL || 'http://localhost:3000';
      
      const redirectUri = encodeURIComponent(`${baseUrl}/api/stripe/callback`);
      
      // Construct the Stripe Connect authorization URL
      const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&state=${userId}&redirect_uri=${redirectUri}`;

      // Redirect the user to Stripe's authorization page
      return res.redirect(url);
    } catch (error) {
      console.error('Error verifying auth token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Error redirecting to Stripe:', error);
    return res.status(500).json({ error: 'Failed to redirect to Stripe' });
  }
}