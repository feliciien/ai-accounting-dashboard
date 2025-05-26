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
      
      // Track the Stripe connect attempt event
      trackEvent('stripe_connect_attempt', {
        user_id: userId
      });

      // Validate required environment variables
      const clientId = process.env.REACT_APP_STRIPE_CLIENT_ID;
      const secretKey = process.env.REACT_APP_STRIPE_SECRET_KEY;
      
      if (!clientId) {
        const error = 'Stripe Client ID not configured';
        console.error(error);
        trackEvent('stripe_connect_config_error', {
          user_id: userId,
          error: error
        });
        return res.status(500).json({ error });
      }
      
      if (!secretKey) {
        const error = 'Stripe Secret Key not configured';
        console.error(error);
        trackEvent('stripe_connect_config_error', {
          user_id: userId,
          error: error
        });
        return res.status(500).json({ error });
      }

      // Use the actual domain in production
      const baseUrl = process.env.REACT_APP_URL || 'http://localhost:3000';
      
      const redirectUri = encodeURIComponent(`${baseUrl}/api/stripe/callback`);
      
      // Construct the Stripe Connect authorization URL
      const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&state=${userId}&redirect_uri=${redirectUri}`;

      // Return the URL for the frontend to redirect to
      return res.status(200).json({ url });
    } catch (error) {
      console.error('Error verifying auth token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Error creating Stripe connect URL:', error);
    return res.status(500).json({ error: 'Failed to create Stripe connect URL' });
  }
}