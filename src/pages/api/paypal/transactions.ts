import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getValidPayPalToken } from '../../../utils/paypalTokenRefresh';
import { trackEvent } from '../../../utils/analytics';
import { getFirebaseAdminAuth } from '../../../utils/firebaseAdmin';

// Initialize Firebase Admin
getFirebaseAdminAuth();

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
      const decodedToken = await getFirebaseAdminAuth().verifyIdToken(authToken);
      const userId = decodedToken.uid;
      
      // Get a valid PayPal access token
      const paypalToken = await getValidPayPalToken(userId);
      
      if (!paypalToken) {
        return res.status(400).json({ error: 'PayPal integration not found or token refresh failed' });
      }
      
      // Parse query parameters
      const { start_date, end_date } = req.query;
      
      // Default to last 30 days if dates not provided
      const endDate = end_date ? new Date(end_date as string) : new Date();
      const startDate = start_date ? new Date(start_date as string) : new Date(endDate);
      if (!start_date) {
        startDate.setDate(startDate.getDate() - 30);
      }
      
      // Track the transaction fetch event
      trackEvent('paypal_transactions_fetch', {
        user_id: userId,
        date_range: `${startDate.toISOString()} to ${endDate.toISOString()}`
      });

      // Fetch transactions from PayPal
      const response = await axios.get('https://api.paypal.com/v1/reporting/transactions', {
        headers: {
          'Authorization': `Bearer ${paypalToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          fields: 'all'
        }
      });
      
      return res.status(200).json(response.data);
    } catch (error) {
      console.error('Error fetching PayPal transactions:', error);
      
      // Check if it's an API error from PayPal
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json({
          error: 'PayPal API error',
          details: error.response.data
        });
      }
      
      return res.status(500).json({ error: 'Failed to fetch PayPal transactions' });
    }
  } catch (error) {
    console.error('Error in PayPal transactions handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}