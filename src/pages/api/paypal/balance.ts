import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getValidPayPalToken } from '../../../utils/paypalTokenRefresh';
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
  // Only allow GET requests
  if (req.method !== 'GET') {
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
      
      // Get a valid PayPal access token
      const paypalToken = await getValidPayPalToken(userId);
      
      if (!paypalToken) {
        return res.status(400).json({ error: 'PayPal integration not found or token refresh failed' });
      }
      
      // Track the balance fetch event
      trackEvent('paypal_balance_fetch', {
        user_id: userId
      });

      // Fetch balance from PayPal
      const response = await axios.get('https://api.paypal.com/v1/reporting/balances', {
        headers: {
          'Authorization': `Bearer ${paypalToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          currency_code: 'USD', // Default to USD, can be made dynamic
          as_of_time: new Date().toISOString()
        }
      });
      
      return res.status(200).json(response.data);
    } catch (error) {
      console.error('Error fetching PayPal balance:', error);
      
      // Check if it's an API error from PayPal
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json({
          error: 'PayPal API error',
          details: error.response.data
        });
      }
      
      return res.status(500).json({ error: 'Failed to fetch PayPal balance' });
    }
  } catch (error) {
    console.error('Error in PayPal balance handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}