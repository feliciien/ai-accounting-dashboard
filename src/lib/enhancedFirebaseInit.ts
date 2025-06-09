/**
 * Enhanced Firebase Initialization
 * 
 * This utility provides a robust Firebase initialization with built-in error handling
 * and fixes for common Firestore connection issues, including WebChannel errors.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { initializeFirestoreFixes } from './firestoreWebChannelFix';

// Store the Firebase instances
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

/**
 * Initialize Firebase with enhanced error handling and connection fixes
 */
export const initializeEnhancedFirebase = (): { app: FirebaseApp; auth: Auth; db: Firestore } => {
  // If already initialized, return existing instances
  if (app && auth && db) {
    return { app, auth, db };
  }
  
  // Import secure environment variable utility
  const { validateRequiredEnvVars, getFirebaseConfig, isProduction, isBrowser } = require('../utils/secureEnv');

  // Check for required environment variables
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_AUTH_DOMAIN'
  ];

  // In non-production or server-side, also require API key
  if (!isProduction || !isBrowser) {
    requiredEnvVars.push('REACT_APP_FIREBASE_API_KEY');
    requiredEnvVars.push('REACT_APP_FIREBASE_APP_ID');
  }

  const validation = validateRequiredEnvVars(requiredEnvVars);
  
  if (!validation.isValid) {
    const error = new Error(`Firebase initialization error: ${validation.errors.join(', ')}`);
    console.error(error);
    throw error;
  }

  try {
    // Get Firebase configuration with proper security handling
    const firebaseConfig = getFirebaseConfig();

    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Verify auth is properly initialized
    if (auth) {
      console.log('Firebase Auth initialized successfully');
    }
    
    // Apply Firestore connection fixes
    if (db && auth) {
      initializeFirestoreFixes(db, auth);
    }
    
    console.log('Enhanced Firebase initialized successfully');
    
    return { app, auth, db };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
};

/**
 * Get the Firebase Auth instance, initializing if needed
 */
export const getEnhancedFirebaseAuth = (): Auth => {
  if (!auth) {
    const { auth: newAuth } = initializeEnhancedFirebase();
    return newAuth;
  }
  return auth;
};

/**
 * Get the Firestore instance, initializing if needed
 */
export const getEnhancedFirebaseFirestore = (): Firestore => {
  if (!db) {
    const { db: newDb } = initializeEnhancedFirebase();
    return newDb;
  }
  return db;
};

/**
 * Get the Firebase App instance, initializing if needed
 */
export const getEnhancedFirebaseApp = (): FirebaseApp => {
  if (!app) {
    const { app: newApp } = initializeEnhancedFirebase();
    return newApp;
  }
  return app;
};