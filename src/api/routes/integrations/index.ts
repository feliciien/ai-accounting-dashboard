import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirestoreErrorMessage } from '../../../lib/firestoreErrorHandler';

declare global {
  namespace Express {
    interface Request {
      session: {
        uid?: string;
        xeroState?: string;
      };
    }
  }
}

import { getAuth } from 'firebase-admin/auth';
import xeroDataRoutes from '../xero/data';
import xeroWebhookRoutes from '../xero/webhook';

const router = express.Router();

// Mount Xero data routes
router.use('/xero/data', xeroDataRoutes);

// Mount Xero webhook routes
router.use('/xero/webhook', xeroWebhookRoutes);

// Xero integration routes
router.get('/xero/callback', async (req, res) => {
  try {
    const { code, state, error: xeroError } = req.query;
    
    // Validate state parameter against session
    if (!state || state !== req.session.xeroState) {
      console.error('Invalid state parameter');
      return res.status(403).json({ 
        error: 'Invalid state parameter',
        code: 'invalid_state'
      });
    }

    if (xeroError) {
      console.error('Xero authorization error:', xeroError);
      return res.status(400).json({
        error: 'Authorization failed',
        code: xeroError
      });
    }

    if (!code) {
      return res.status(400).json({
        error: 'Authorization code is required',
        code: 'missing_code'
      });
    }

    const uid = req.session.uid;

    if (!uid) {
      console.error('No authenticated session found');
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'unauthorized'
      });
    }
    
    // Exchange the code for tokens
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: `${process.env.REACT_APP_URL || 'http://localhost:3000'}/api/integrations/xero/callback`,
        client_id: process.env.REACT_APP_XERO_CLIENT_ID as string,
        client_secret: process.env.REACT_APP_XERO_CLIENT_SECRET as string
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Xero token exchange error:', errorData);
      return res.status(tokenResponse.status).json({
        error: 'Token exchange failed',
        code: errorData.error,
        xero_error: errorData.error_description
      });
    }
    
    const tokens = await tokenResponse.json();
    
    // Store the tokens in Firestore
    const db = getFirestore();
    await db.collection('integrations').doc(uid).set({
      xero: {
        connected: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + tokens.expires_in * 1000,
        connected_at: Date.now()
      }
    }, { merge: true });
    
    // Redirect back to the integration page
    res.json({
      success: true,
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      tenant_id: tokens.tenant_id
    });
  } catch (error: unknown) {
      console.error('Xero callback error:', error);
      const errorMessage = getFirestoreErrorMessage(error);
      const errorCode = error instanceof Error && 'code' in error ? error.code : 'internal_error';
      res.status(500).json({
        error: errorMessage,
        code: errorCode
      });
    }
  });


// Disconnect Xero integration
router.post('/xero/disconnect', async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get the current integration data
    const db = getFirestore();
    const doc = await db.collection('integrations').doc(uid).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    const data = doc.data();
    
    // If we have a refresh token, we should revoke it with Xero
    if (data?.xero?.refresh_token) {
      try {
        await fetch('https://identity.xero.com/connect/revocation', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.REACT_APP_XERO_CLIENT_ID}:${process.env.REACT_APP_XERO_CLIENT_SECRET}`).toString('base64')}`
          },
          body: new URLSearchParams({
            token: data.xero.refresh_token,
            token_type_hint: 'refresh_token'
          })
        });
      } catch (revokeError) {
        console.error('Error revoking Xero token:', revokeError);
        // Continue anyway to remove the local connection
      }
    }
    
    // Update Firestore to disconnect Xero
    await db.collection('integrations').doc(uid).set({
      xero: {
        connected: false,
        disconnected_at: Date.now()
      }
    }, { merge: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Xero disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Xero integration' });
  }
});

// PayPal integration routes
router.get('/paypal/onboard', async (req, res) => {
  try {
    const { uid } = req.body; // This would come from your auth middleware
    
    // In a real implementation, you would call PayPal's API to create a partner referral
    // const response = await fetch('https://api-m.paypal.com/v2/customer/partner-referrals', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.PAYPAL_ACCESS_TOKEN}`
    //   },
    //   body: JSON.stringify({
    //     // PayPal partner referral configuration
    //   })
    // });
    // 
    // const result = await response.json();
    // const redirectUrl = result.links.find(link => link.rel === 'action_url').href;
    
    // For demo purposes, we'll just return a mock URL
    const redirectUrl = 'https://www.sandbox.paypal.com/merchantsignup/partner/onboardingentry?token=mock_token';
    
    res.json({ url: redirectUrl });
  } catch (error) {
    console.error('PayPal onboarding error:', error);
    res.status(500).json({ error: 'Failed to initiate PayPal onboarding' });
  }
});

// Stripe integration routes
router.get('/stripe/connect', async (req, res) => {
  try {
    const { uid } = req.body; // This would come from your auth middleware
    
    // In a real implementation, you would use Stripe's API to create an account link
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // 
    // // First, create or retrieve a Stripe account for this user
    // let account;
    // const userDoc = await getFirestore().collection('users').doc(uid).get();
    // const userData = userDoc.data();
    // 
    // if (userData?.stripeAccountId) {
    //   account = { id: userData.stripeAccountId };
    // } else {
    //   account = await stripe.accounts.create({ type: 'standard' });
    //   await getFirestore().collection('users').doc(uid).update({
    //     stripeAccountId: account.id
    //   });
    // }
    // 
    // const accountLink = await stripe.accountLinks.create({
    //   account: account.id,
    //   refresh_url: `${process.env.APP_URL}/integrations/stripe`,
    //   return_url: `${process.env.APP_URL}/integrations/stripe`,
    //   type: 'account_onboarding',
    // });
    
    // For demo purposes, we'll just return a mock URL
    const accountLinkUrl = 'https://connect.stripe.com/setup/s/mock_token';
    
    res.json({ url: accountLinkUrl });
  } catch (error) {
    console.error('Stripe connect error:', error);
    res.status(500).json({ error: 'Failed to initiate Stripe connection' });
  }
});

// Bank account (Plaid) integration routes
router.get('/plaid/link-token', async (req, res) => {
  try {
    const { uid } = req.body; // This would come from your auth middleware
    
    // In a real implementation, you would use Plaid's API to create a link token
    // const plaid = require('plaid');
    // const client = new plaid.Client({
    //   clientID: process.env.PLAID_CLIENT_ID,
    //   secret: process.env.PLAID_SECRET,
    //   env: plaid.environments.sandbox
    // });
    // 
    // const response = await client.createLinkToken({
    //   user: { client_user_id: uid },
    //   client_name: 'AI Accounting Dashboard',
    //   products: ['transactions'],
    //   country_codes: ['US'],
    //   language: 'en'
    // });
    
    // For demo purposes, we'll just return a mock token
    res.json({ link_token: 'link-sandbox-mock-token' });
  } catch (error) {
    console.error('Plaid link token error:', error);
    res.status(500).json({ error: 'Failed to create Plaid link token' });
  }
});

router.post('/plaid/exchange', async (req, res) => {
  try {
    const { public_token } = req.body;
    const { uid } = req.body; // This would come from your auth middleware
    
    if (!public_token) {
      return res.status(400).json({ error: 'Public token is required' });
    }
    
    // In a real implementation, you would exchange the public token for an access token
    // const plaid = require('plaid');
    // const client = new plaid.Client({
    //   clientID: process.env.PLAID_CLIENT_ID,
    //   secret: process.env.PLAID_SECRET,
    //   env: plaid.environments.sandbox
    // });
    // 
    // const response = await client.exchangePublicToken(public_token);
    // const accessToken = response.access_token;
    // const itemId = response.item_id;
    
    // Store the access token in Firestore
    const db = getFirestore();
    await db.collection('integrations').doc(uid).set({
      bank: {
        connected: true,
        // access_token: accessToken,
        // item_id: itemId,
        connected_at: Date.now()
      }
    }, { merge: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Plaid exchange error:', error);
    res.status(500).json({ error: 'Failed to exchange Plaid public token' });
  }
});

// Get integration status for a user
router.get('/status', async (req, res) => {
  try {
    const { uid } = req.body; // This would come from your auth middleware
    
    const db = getFirestore();
    const doc = await db.collection('integrations').doc(uid).get();
    
    if (!doc.exists) {
      return res.json({
        xero: { connected: false },
        paypal: { connected: false },
        stripe: { connected: false },
        bank: { connected: false }
      });
    }
    
    const data = doc.data();
    
    res.json({
      xero: data?.xero || { connected: false },
      paypal: data?.paypal || { connected: false },
      stripe: data?.stripe || { connected: false },
      bank: data?.bank || { connected: false }
    });
  } catch (error) {
    console.error('Get integration status error:', error);
    res.status(500).json({ error: 'Failed to get integration status' });
  }
});

export default router;