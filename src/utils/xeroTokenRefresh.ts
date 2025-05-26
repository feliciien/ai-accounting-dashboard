/**
 * Xero Token Refresh Utility
 * 
 * This utility handles refreshing Xero OAuth2 tokens when they expire.
 * Xero access tokens expire after 30 minutes, so we need to use the refresh token
 * to get a new access token before making API calls.
 */

import { getFirestore } from 'firebase-admin/firestore';

interface XeroTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  connected_at: number;
  connected: boolean;
}

/**
 * Refreshes the Xero access token if it's expired
 * @param uid User ID
 * @returns The current valid tokens
 */
export const refreshXeroTokenIfNeeded = async (uid: string): Promise<XeroTokens | null> => {
  try {
    const db = getFirestore();
    const doc = await db.collection('integrations').doc(uid).get();
    
    if (!doc.exists) {
      console.error('No integration found for user:', uid);
      return null;
    }
    
    const data = doc.data();
    const xeroData = data?.xero as XeroTokens | undefined;
    
    if (!xeroData || !xeroData.connected) {
      console.error('Xero not connected for user:', uid);
      return null;
    }
    
    // Check if token is expired or will expire in the next 5 minutes
    const isExpired = xeroData.expires_at < (Date.now() + 5 * 60 * 1000);
    
    if (!isExpired) {
      return xeroData;
    }
    
    console.log('Refreshing Xero token for user:', uid);
    
    // Exchange refresh token for a new access token
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: xeroData.refresh_token,
        client_id: process.env.REACT_APP_XERO_CLIENT_ID as string,
        client_secret: process.env.REACT_APP_XERO_CLIENT_SECRET as string
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Failed to refresh Xero token:', errorData);
      
      // If refresh token is invalid, mark as disconnected
      if (tokenResponse.status === 400) {
        await db.collection('integrations').doc(uid).set({
          xero: {
            connected: false,
            disconnected_at: Date.now(),
            error: 'Refresh token expired or invalid'
          }
        }, { merge: true });
      }
      
      return null;
    }
    
    const tokens = await tokenResponse.json();
    
    // Update tokens in Firestore
    const updatedTokens: XeroTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      connected_at: xeroData.connected_at,
      connected: true
    };
    
    await db.collection('integrations').doc(uid).set({
      xero: updatedTokens
    }, { merge: true });
    
    return updatedTokens;
  } catch (error) {
    console.error('Error refreshing Xero token:', error);
    return null;
  }
};

/**
 * Fetches data from Xero API with automatic token refresh
 * @param uid User ID
 * @param endpoint Xero API endpoint (e.g., '/api.xro/2.0/Invoices')
 * @returns The API response data or null if failed
 */
export const fetchFromXero = async (uid: string, endpoint: string): Promise<any> => {
  try {
    // First refresh the token if needed
    const tokens = await refreshXeroTokenIfNeeded(uid);
    
    if (!tokens) {
      throw new Error('No valid Xero tokens available');
    }
    
    // Make the API request with the valid token
    const response = await fetch(`https://api.xero.com${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Xero API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching from Xero:', error);
    return null;
  }
};