import axios from 'axios';
import qs from 'querystring';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '../lib/firebase';

interface PayPalTokens {
  access_token: string;
  refresh_token: string;
  created_at: number;
  expires_in: number;
}

/**
 * Checks if a PayPal access token is expired
 */
export const isTokenExpired = (tokens: PayPalTokens): boolean => {
  const expiryTime = tokens.created_at + (tokens.expires_in * 1000);
  // Consider token expired 5 minutes before actual expiry to avoid edge cases
  return Date.now() > expiryTime - 5 * 60 * 1000;
};

/**
 * Refreshes PayPal access token using the refresh token
 */
export const refreshPayPalToken = async (userId: string): Promise<PayPalTokens | null> => {
  try {
    // Get current tokens from Firestore
    const db = getFirebaseFirestore();
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists() || !userDoc.data().paypal) {
      console.error('No PayPal integration found for user');
      return null;
    }
    
    const paypalData = userDoc.data().paypal as PayPalTokens;
    
    // If token is not expired, return current tokens
    if (!isTokenExpired(paypalData)) {
      return paypalData;
    }
    
    // Get PayPal credentials
    const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_PAYPAL_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }
    
    // Create the authorization header
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Exchange the refresh token for a new access token
    const tokenResponse = await axios.post('https://api.paypal.com/v1/oauth2/token', 
      qs.stringify({
        grant_type: 'refresh_token',
        refresh_token: paypalData.refresh_token
      }), {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Update tokens in Firestore
    const updatedTokens: PayPalTokens = {
      access_token,
      refresh_token: refresh_token || paypalData.refresh_token, // Use new refresh token if provided, otherwise keep the old one
      created_at: Date.now(),
      expires_in
    };
    
    await updateDoc(doc(db, 'users', userId), {
      paypal: updatedTokens
    });
    
    return updatedTokens;
  } catch (error) {
    console.error('Error refreshing PayPal token:', error);
    return null;
  }
};

/**
 * Gets a valid PayPal access token, refreshing if necessary
 */
export const getValidPayPalToken = async (userId: string): Promise<string | null> => {
  try {
    const tokens = await refreshPayPalToken(userId);
    return tokens?.access_token || null;
  } catch (error) {
    console.error('Error getting valid PayPal token:', error);
    return null;
  }
};