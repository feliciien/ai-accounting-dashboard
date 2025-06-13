import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirebaseAdminAuth } from '../../../utils/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { FirebaseError } from 'firebase-admin/app';

// Initialize Firebase Admin
getFirebaseAdminAuth();

type AnalyticsEvent = {
  event: string;
  timestamp: string;
  user_id?: string;
  page_path?: string;
  page_title?: string;
  page_location?: string;
  [key: string]: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const eventData: AnalyticsEvent = req.body;
    
    if (!eventData.event) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    // Get Firestore instance
    const db = getFirestore();
    
    // Prepare the event data
    const analyticsData = {
      ...eventData,
      server_timestamp: new Date().toISOString(),
      ip_hash: hashIp(req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || ''),
      user_agent: req.headers['user-agent'],
      referrer: req.headers.referer || '',
    };
    
    // Store the event in Firestore with retry logic
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        await db.collection('analytics_events').add(analyticsData);
        // Return success
        return res.status(200).json({ success: true });
      } catch (firestoreError) {
        retries++;
        
        // Log the specific error
        console.error(`Firestore error (attempt ${retries}/${maxRetries}):`, firestoreError);
        
        if (retries >= maxRetries) {
          // We've exhausted our retries, throw the error to be caught by the outer catch
          throw firestoreError;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retries), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to track analytics event';
    
    // Type guard for Firebase errors
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      errorMessage = `Firebase error: ${error.code} - ${error.message}`;
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

// Hash IP address for privacy
function hashIp(ip: string): string {
  // Simple hash function for demo purposes
  // In production, use a proper hashing algorithm
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}