import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
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
    const clientId = process.env.REACT_APP_STRIPE_CLIENT_ID;
    const secretKey = process.env.REACT_APP_STRIPE_SECRET_KEY;
    
    if (!clientId || !secretKey) {
      throw new Error('Stripe credentials not configured');
    }
    
    // Exchange the code for tokens
    const tokenResponse = await axios.post('https://connect.stripe.com/oauth/token', {
      grant_type: 'authorization_code',
      code: code as string,
      client_id: clientId,
      client_secret: secretKey
    });
    
    const { access_token, refresh_token, stripe_user_id } = tokenResponse.data;
    
    // Store the tokens in Firestore
    const db = getFirebaseFirestore();
    await setDoc(doc(db, 'users', userId), {
      stripe: {
        access_token,
        refresh_token,
        stripe_user_id,
        created_at: Date.now()
      }
    }, { merge: true });
    
    // Track the successful connection
    trackEvent('stripe_connect_success', {
      user_id: userId
    });
    
    // Redirect back to the Stripe integration page with success status
    return res.redirect('/integrations/stripe?status=success');
  } catch (error) {
    console.error('Error connecting Stripe account:', error);
    
    // Get more detailed error information
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (axios.isAxiosError(error) && error.response) {
      errorMessage = `Stripe API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    }
    
    // Track the error with detailed information
    trackEvent('stripe_connect_callback_error', {
      error: errorMessage
    });
    
    // Redirect back to the Stripe integration page with error status
    return res.redirect(`/integrations/stripe?status=error&message=${encodeURIComponent(errorMessage)}`);
  
  }
}