import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirebaseAdminAuth } from '../../../utils/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

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
    
    // Store the event in Firestore
    await db.collection('analytics_events').add({
      ...eventData,
      server_timestamp: new Date().toISOString(),
      ip_hash: hashIp(req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || ''),
      user_agent: req.headers['user-agent'],
      referrer: req.headers.referer || '',
    });

    // Return success
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    return res.status(500).json({ error: 'Failed to track analytics event' });
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