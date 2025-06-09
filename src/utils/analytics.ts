/**
 * Analytics Utility
 * 
 * This utility provides centralized analytics functionality using both
 * Vercel Analytics and Firebase Analytics for comprehensive tracking.
 */

import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { getEnhancedFirebaseApp } from '../lib/enhancedFirebaseInit';

// Initialize Firebase Analytics
let firebaseAnalytics: ReturnType<typeof getAnalytics> | null = null;

/**
 * Initialize Firebase Analytics
 */
export const initializeFirebaseAnalytics = async () => {
  try {
    const app = await getEnhancedFirebaseApp();
    firebaseAnalytics = getAnalytics(app);
    console.log('Firebase Analytics initialized successfully');
    return firebaseAnalytics;
  } catch (error) {
    console.error('Failed to initialize Firebase Analytics:', error);
    return null;
  }
};

/**
 * Get the Firebase Analytics instance, initializing if needed
 */
export const getFirebaseAnalytics = async () => {
  if (!firebaseAnalytics) {
    return await initializeFirebaseAnalytics();
  }
  return firebaseAnalytics;
};

/**
 * Track a custom event in Firebase Analytics with retries
 */
export const trackEvent = async (eventName: string, eventData: AnalyticsEvent, retryCount = 3) => {
  try {
    const payload = {
      event: eventName,
      timestamp: eventData.timestamp || new Date().toISOString(),
      ...eventData
    };

    // Try to send to server endpoint
    for (let i = 0; i < retryCount; i++) {
      try {
        const response = await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // If successful, also log to Firebase Analytics
        const analytics = await getFirebaseAnalytics();
        if (analytics) {
          logEvent(analytics, eventName, payload);
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Analytics Event:', eventName, payload);
        }

        return;
      } catch (retryError) {
        if (i === retryCount - 1) throw retryError;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
      }
    }
  } catch (error) {
    console.error('Failed to track analytics event:', error);
    // Fall back to local storage if all retries fail
    try {
      const failedEvents = JSON.parse(localStorage.getItem('failed_analytics_events') || '[]');
      failedEvents.push({ eventName, eventData, timestamp: new Date().toISOString() });
      localStorage.setItem('failed_analytics_events', JSON.stringify(failedEvents));
    } catch (storageError) {
      console.error('Failed to store failed analytics event:', storageError);
    }
  }
};

/**
 * Set user ID for analytics tracking
 */
export const setAnalyticsUserId = async (userId: string) => {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      setUserId(analytics, userId);
      console.log(`User ID set for analytics: ${userId}`);
    }
  } catch (error) {
    console.error('Failed to set user ID for analytics:', error);
  }
};

/**
 * Set user properties for analytics tracking
 */
export const setAnalyticsUserProperties = async (properties: Record<string, any>) => {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      setUserProperties(analytics, properties);
      console.log('User properties set for analytics:', properties);
    }
  } catch (error) {
    console.error('Failed to set user properties for analytics:', error);
  }
};

/**
 * Track page view in Firebase Analytics
 */
export const trackPageView = (pagePath: string, pageTitle?: string) => {
  trackEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
    page_location: window.location.href
  });
};

/**
 * PayPal specific analytics functions
 */
export const trackPayPalEvent = (eventName: string, eventData: AnalyticsEvent) => {
  return trackEvent(`paypal_${eventName}`, eventData);
};

export const trackPayPalTransaction = (transactionData: {
  id: string;
  amount: number;
  type: string;
  status: string;
  user_id?: string;
}) => {
  return trackPayPalEvent('transaction', {
    ...transactionData,
    timestamp: new Date().toISOString()
  });
};

export const trackPayPalError = (error: Error, context: string, user_id?: string) => {
  return trackPayPalEvent('error', {
    error_message: error.message,
    error_stack: error.stack,
    context,
    user_id,
    timestamp: new Date().toISOString()
  });
};

export const trackPayPalBalanceCheck = (balance: number, user_id?: string) => {
  return trackPayPalEvent('balance_check', {
    balance,
    user_id,
    timestamp: new Date().toISOString()
  });
};

export const trackPayPalAnalyticsView = (metrics: {
  monthlyIncome: number;
  successRate: number;
  volume: number;
  user_id?: string;
}) => {
  return trackPayPalEvent('analytics_view', {
    ...metrics,
    timestamp: new Date().toISOString()
  });
};

export interface AnalyticsEvent {
  timestamp?: string;
  user_id?: string;
  page_path?: string;
  page_title?: string;
  page_location?: string;
  [key: string]: any;
}