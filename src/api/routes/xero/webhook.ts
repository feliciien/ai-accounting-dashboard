/**
 * Xero Webhook Handler
 *
 * This file handles incoming webhook notifications from Xero.
 * It verifies the webhook signature and processes events like invoice creation,
 * contact updates, and payments.
 */

import express from 'express';
import crypto from 'crypto';
import { 
  getCollection, 
  getDocument, 
  enhancedGetDoc, 
  enhancedSetDoc, 
  enhancedUpdateDoc 
} from '../../../lib/enhancedFirebase';
import { 
  query,
  where,
  limit,
  getDocs
} from 'firebase/firestore';
import { fetchFromXero } from '../../../utils/xeroTokenRefresh';
import { logger } from '../../../utils/logger';

const router = express.Router();

// Webhook signature verification middleware
const verifyXeroWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Get the Xero signature from the request headers
    const xeroSignature = req.headers['x-xero-signature'];
    
    if (!xeroSignature) {
      logger.warn('Missing Xero signature header');
      return res.status(401).json({ error: 'Missing signature' });
    }
    
    // Get the webhook key from environment variables
    const webhookKey = process.env.REACT_APP_XERO_WEBHOOK_KEY;
    
    if (!webhookKey) {
      logger.error('Xero webhook key not configured');
      return res.status(500).json({ error: 'Webhook key not configured' });
    }
    
    // Create HMAC using the webhook key
    const hmac = crypto.createHmac('sha256', webhookKey);
    
    // Update HMAC with request body as string
    const rawBody = JSON.stringify(req.body);
    hmac.update(rawBody);
    
    // Get the calculated signature
    const calculatedSignature = hmac.digest('base64');
    
    // Compare the calculated signature with the one from Xero
    if (calculatedSignature !== xeroSignature) {
      logger.warn('Invalid Xero webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // If signature is valid, proceed to the route handler
    next();
  } catch (error) {
    logger.error('Error verifying Xero webhook signature:', error);
    res.status(500).json({ error: 'Failed to verify webhook signature' });
  }
};

// Main webhook endpoint
router.post('/', verifyXeroWebhook, async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
    
    logger.info(`Received ${events.length} Xero webhook events`);
    
    // Process each event
    for (const event of events) {
      const { resourceUrl, eventType, tenantId } = event;
      
      if (!resourceUrl || !eventType || !tenantId) {
        logger.warn('Incomplete event data received', { event });
        continue;
      }
      
      logger.info(`Processing Xero event: ${eventType}`, { tenantId });
      
      // Find the user associated with this tenant ID
      const usersCollection = getCollection('users');
      const usersSnapshot = await getDocs(
        query(usersCollection, where('xero.tenant_id', '==', tenantId), limit(1))
      );
      
      if (usersSnapshot.empty) {
        logger.warn(`No user found for Xero tenant ID: ${tenantId}`);
        continue;
      }
      
      const userDoc = usersSnapshot.docs[0];
      const userId = userDoc.id;
      
      // Process different event types
      switch (eventType) {
        case 'Invoice.created':
        case 'Invoice.updated':
          await processInvoiceEvent(userId, resourceUrl, tenantId);
          break;
          
        case 'Contact.created':
        case 'Contact.updated':
          await processContactEvent(userId, resourceUrl, tenantId);
          break;
          
        case 'Payment.created':
          await processPaymentEvent(userId, resourceUrl, tenantId);
          break;
          
        default:
          logger.info(`Unhandled Xero event type: ${eventType}`);
      }
    }
    
    // Always respond with 200 OK to acknowledge receipt
    return res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing Xero webhook:', error);
    // Still return 200 to prevent Xero from retrying
    return res.status(200).send('OK');
  }
});

/**
 * Process invoice events from Xero
 */
async function processInvoiceEvent(userId: string, resourceUrl: string, tenantId: string) {
  try {
    // Extract the endpoint from the resource URL
    // Example: https://api.xero.com/api.xro/2.0/Invoices/12345678-aaaa-bbbb-cccc-123456789012
    const endpoint = resourceUrl.replace('https://api.xero.com', '');
    
    // Fetch the full invoice data from Xero API
    const invoiceData = await fetchFromXero(userId, endpoint);
    
    if (!invoiceData) {
      logger.warn(`Failed to fetch invoice data for user ${userId}`);
      return;
    }
    
    // Update the invoice in Firestore
    const invoiceRef = getDocument(`users/${userId}/xero_invoices`, invoiceData.InvoiceID);
    
    await enhancedSetDoc(invoiceRef, {
      ...invoiceData,
      updated_at: new Date().toISOString(),
      tenant_id: tenantId
    });
    
    logger.info(`Updated Xero invoice ${invoiceData.InvoiceID} for user ${userId}`);
  } catch (error) {
    logger.error(`Error processing Xero invoice event for user ${userId}:`, error);
  }
}

/**
 * Process contact events from Xero
 */
async function processContactEvent(userId: string, resourceUrl: string, tenantId: string) {
  try {
    // Extract the endpoint from the resource URL
    const endpoint = resourceUrl.replace('https://api.xero.com', '');
    
    // Fetch the full contact data from Xero API
    const contactData = await fetchFromXero(userId, endpoint);
    
    if (!contactData) {
      logger.warn(`Failed to fetch contact data for user ${userId}`);
      return;
    }
    
    // Update the contact in Firestore
    const contactRef = getDocument(`users/${userId}/xero_contacts`, contactData.ContactID);
    
    await enhancedSetDoc(contactRef, {
      ...contactData,
      updated_at: new Date().toISOString(),
      tenant_id: tenantId
    });
    
    logger.info(`Updated Xero contact ${contactData.ContactID} for user ${userId}`);
  } catch (error) {
    logger.error(`Error processing Xero contact event for user ${userId}:`, error);
  }
}

/**
 * Process payment events from Xero
 */
async function processPaymentEvent(userId: string, resourceUrl: string, tenantId: string) {
  try {
    // Extract the endpoint from the resource URL
    const endpoint = resourceUrl.replace('https://api.xero.com', '');
    
    // Fetch the full payment data from Xero API
    const paymentData = await fetchFromXero(userId, endpoint);
    
    if (!paymentData) {
      logger.warn(`Failed to fetch payment data for user ${userId}`);
      return;
    }
    
    // Update the payment in Firestore
    const paymentRef = getDocument(`users/${userId}/xero_payments`, paymentData.PaymentID);
    
    await enhancedSetDoc(paymentRef, {
      ...paymentData,
      updated_at: new Date().toISOString(),
      tenant_id: tenantId
    });
    
    // Also update the related invoice to reflect the payment
    if (paymentData.Invoice && paymentData.Invoice.InvoiceID) {
      const invoiceRef = getDocument(`users/${userId}/xero_invoices`, paymentData.Invoice.InvoiceID);
      
      // Get the current invoice data
      const invoiceDoc = await enhancedGetDoc(invoiceRef);
      
      if (invoiceDoc.exists()) {
        // Update the invoice with the new payment information
        await enhancedUpdateDoc(invoiceRef, {
          AmountPaid: paymentData.Amount,
          Status: 'PAID',
          updated_at: new Date().toISOString()
        });
        
        logger.info(`Updated invoice ${paymentData.Invoice.InvoiceID} payment status for user ${userId}`);
      }
    }
    
    logger.info(`Processed Xero payment ${paymentData.PaymentID} for user ${userId}`);
  } catch (error) {
    logger.error(`Error processing Xero payment event for user ${userId}:`, error);
  }
}

export default router;