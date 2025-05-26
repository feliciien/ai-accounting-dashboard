import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import qs from 'querystring';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { getFirebaseFirestore } from '../../../lib/firebase';
import { trackEvent } from '../../../utils/analytics';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the authorization code and state (user ID) from the query parameters
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const userId = state as string;
    
    // Exchange the code for access and refresh tokens
    const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_PAYPAL_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }
    
    // Use the actual domain in production
    const baseUrl = process.env.REACT_APP_URL || 'http://localhost:3000';
    
    const redirectUri = `${baseUrl}/api/paypal/callback`;
    
    // Create the authorization header
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Exchange the code for tokens
    const tokenResponse = await axios.post('https://api.paypal.com/v1/oauth2/token', 
      qs.stringify({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri
      }), {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Store the tokens in Firestore
    const db = getFirebaseFirestore();
    await setDoc(doc(db, 'users', userId), {
      paypal: {
        access_token,
        refresh_token,
        created_at: Date.now(),
        expires_in
      }
    }, { merge: true });
    
    // Track successful connection
    trackEvent('paypal_connect_success', {
      user_id: userId
    });
    
    // Redirect back to the integrations page
    return res.redirect('/integrations/paypal?status=success');
  } catch (error) {
    console.error('Error handling PayPal callback:', error);
    
    // Track the error
    trackEvent('paypal_connect_error', {
      error: String(error)
    });
    
    // Redirect with error
    return res.redirect('/integrations/paypal?status=error');
  }
}