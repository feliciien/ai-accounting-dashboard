/**
 * Enhanced Firebase Initialization
 * 
 * This utility provides a robust Firebase initialization with built-in error handling
 * and fixes for common Firestore connection issues, including WebChannel errors.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
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
  
  // Check for required environment variables
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    const error = new Error(`Missing required Firebase environment variables: ${missingEnvVars.join(', ')}`);
    console.error(error);
    throw error;
  }

  try {
    // Firebase configuration
    const firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
    };

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