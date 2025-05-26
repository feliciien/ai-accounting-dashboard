import type { NextApiRequest, NextApiResponse } from 'next';
import { trackEvent } from '../../../utils/analytics';
import { getFirebaseAdminAuth } from '../../../utils/firebaseAdmin';

// Initialize Firebase Admin
getFirebaseAdminAuth();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the current user from Firebase Auth
    const authToken = req.headers.authorization?.split('Bearer ')[1];
    if (!authToken) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
      // Verify the token
      const decodedToken = await getFirebaseAdminAuth().verifyIdToken(authToken);
      const userId = decodedToken.uid;
      
      // Track the PayPal redirect event
      trackEvent('paypal_redirect_initiated', {
        user_id: userId
      });

      // Construct the PayPal OAuth URL
      const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;
      if (!clientId) {
        throw new Error('PayPal Client ID not configured');
      }

      // Use the actual domain in production
      const baseUrl = process.env.REACT_APP_URL || 'http://localhost:3000';
      
      const redirectUri = encodeURIComponent(`${baseUrl}/api/paypal/callback`);
      
      // Construct the PayPal authorization URL with required scopes
      const url = `https://www.paypal.com/signin/authorize?response_type=code&client_id=${clientId}&scope=openid profile email https://uri.paypal.com/services/invoicing https://uri.paypal.com/services/paypalattributes https://uri.paypal.com/services/reporting/search/read&redirect_uri=${redirectUri}&state=${userId}`;

      // Redirect the user to PayPal's authorization page
      return res.redirect(url);
    } catch (error) {
      console.error('Error verifying auth token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Error redirecting to PayPal:', error);
    return res.status(500).json({ error: 'Failed to redirect to PayPal' });
  }
}