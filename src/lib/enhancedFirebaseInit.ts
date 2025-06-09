/**
 * Enhanced Firebase Initialization
 * 
 * This utility provides a robust Firebase initialization with built-in error handling
 * and fixes for common Firestore connection issues, including WebChannel errors.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInAnonymously } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { initializeFirestoreFixes } from './firestoreWebChannelFix';

// Store the Firebase instances
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

interface FirebaseInitOptions {
  enableMultiTab?: boolean;
  enableDiagnostics?: boolean;
  maxRetries?: number;
}

/**
 * Initialize Firebase with enhanced error handling and connection fixes
 */
export const initializeEnhancedFirebase = async (options: FirebaseInitOptions = {}): Promise<{ app: FirebaseApp; auth: Auth; db: Firestore }> => {
  // If already initialized, return existing instances
  if (app && auth && db) {
    return { app, auth, db };
  }
  
  const { 
    enableMultiTab = false, 
    enableDiagnostics = true,
    maxRetries = 3 
  } = options;

  // Check for required environment variables
  const requiredVars = [
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_AUTH_DOMAIN'
  ];

  // In non-production or server-side, also require API key
  if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') {
    requiredVars.push('REACT_APP_FIREBASE_API_KEY');
  }

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
  }

  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      // Initialize Firebase app
      if (!app) {
        const firebaseConfig = {
          apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
          authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
          storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.REACT_APP_FIREBASE_APP_ID,
          measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
        };
        
        app = initializeApp(firebaseConfig);
      }

      // Initialize Auth
      if (!auth) {
        auth = getAuth(app);
        // Ensure we have a user for Firestore access
        const user = auth.currentUser;
        if (!user) {
          try {
            await signInAnonymously(auth);
          } catch (authError) {
            console.warn('Anonymous auth failed:', authError);
            // Continue anyway as the user might sign in later
          }
        }
      }

      // Initialize Firestore with persistence
      if (!db) {
        db = getFirestore(app);
        if (typeof window !== 'undefined') {
          try {
            if (enableMultiTab) {
              await enableMultiTabIndexedDbPersistence(db);
            } else {
              await enableIndexedDbPersistence(db);
            }
            console.log('Firestore persistence enabled successfully');
          } catch (persistenceError: any) {
            if (persistenceError.code === 'failed-precondition') {
              console.warn('Multiple tabs open, persistence enabled in first tab only');
            } else if (persistenceError.code === 'unimplemented') {
              console.warn('Browser does not support persistence');
            } else {
              throw persistenceError;
            }
          }
        }
      }

      // Initialize Firestore connection fixes
      if (enableDiagnostics) {
        initializeFirestoreFixes(db, auth);
      }

      console.log('Enhanced Firebase initialized successfully');
      return { app, auth, db };
    } catch (error) {
      retryCount++;
      if (retryCount === maxRetries) {
        console.error('Enhanced Firebase initialization failed:', error);
        throw error;
      }
      console.warn(`Firebase initialization attempt ${retryCount} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
    }
  }

  throw new Error('Firebase initialization failed after all retries');
};

// Export singleton instances getter functions
export const getEnhancedFirebaseAuth = async (): Promise<Auth> => {
  if (!auth) {
    const { auth: newAuth } = await initializeEnhancedFirebase();
    return newAuth;
  }
  return auth;
};

export const getEnhancedFirebaseFirestore = async (): Promise<Firestore> => {
  if (!db) {
    const { db: newDb } = await initializeEnhancedFirebase();
    return newDb;
  }
  return db;
};

export const getEnhancedFirebaseApp = async (): Promise<FirebaseApp> => {
  if (!app) {
    const { app: newApp } = await initializeEnhancedFirebase();
    return newApp;
  }
  return app;
};