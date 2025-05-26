import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirebaseAdminAuth } from '../../../utils/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
getFirebaseAdminAuth();

type AnalyticsResponse = {
  events?: number;
  topEvents?: Record<string, number>;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyticsResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authToken = req.headers.authorization?.split('Bearer ')[1];
    if (!authToken) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
      // Verify the token
      const decodedToken = await getFirebaseAdminAuth().verifyIdToken(authToken);
      const userId = decodedToken.uid;
      
      // Get Firestore instance
      const db = getFirestore();
      
      // Get analytics data for the user
      const eventsSnapshot = await db.collection('analytics_events')
        .where('user_id', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

      // Count events by type
      const eventCounts: Record<string, number> = {};
      eventsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const eventName = data.event;
        eventCounts[eventName] = (eventCounts[eventName] || 0) + 1;
      });

      // Sort events by count
      const topEvents = Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {} as Record<string, number>);

      return res.status(200).json({
        events: eventsSnapshot.size,
        topEvents
      });
    } catch (error) {
      console.error('Error verifying auth token:', error);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}