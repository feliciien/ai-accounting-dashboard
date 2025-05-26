/**
 * Xero Data API Routes
 * 
 * These routes handle fetching data from Xero API after successful authentication
 */

import express from 'express';
import { refreshXeroTokenIfNeeded } from '../../../utils/xeroTokenRefresh';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );
  
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );
  
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const router = express.Router();

// Get Xero invoices
router.get('/invoices', async (req, res) => {
  try {
    const { uid } = req.body;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!uid || !userDoc.exists || userDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Refresh token if needed and get valid tokens
    const tokens = await refreshXeroTokenIfNeeded(uid);
    
    if (!tokens) {
      return res.status(401).json({ 
        error: 'Xero not connected or token refresh failed',
        code: 'xero_auth_error'
      });
    }
    
    // Fetch invoices from Xero API
    const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
        'Xero-Tenant-Id': req.headers['xero-tenant-id'] as string // This would be stored during initial connection
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Xero API error:', errorText);
      return res.status(response.status).json({ error: 'Failed to fetch invoices from Xero' });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching Xero invoices:', error);
    res.status(500).json({ error: 'Failed to fetch Xero invoices' });
  }
});

// Get Xero contacts
router.get('/contacts', async (req, res) => {
  try {
    const { uid } = req.body;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!uid || !userDoc.exists || userDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Refresh token if needed and get valid tokens
    const tokens = await refreshXeroTokenIfNeeded(uid);
    
    if (!tokens) {
      return res.status(401).json({ 
        error: 'Xero not connected or token refresh failed',
        code: 'xero_auth_error'
      });
    }
    
    // Fetch contacts from Xero API
    const response = await fetch('https://api.xero.com/api.xro/2.0/Contacts', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
        'Xero-Tenant-Id': req.headers['xero-tenant-id'] as string // This would be stored during initial connection
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Xero API error:', errorText);
      return res.status(response.status).json({ error: 'Failed to fetch contacts from Xero' });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching Xero contacts:', error);
    res.status(500).json({ error: 'Failed to fetch Xero contacts' });
  }
});

export default router;