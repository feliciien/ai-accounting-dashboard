/**
 * Firebase Configuration Verification Utility
 * 
 * This utility helps diagnose Firebase configuration and authentication issues
 * by checking environment variables and testing authentication services.
 */

import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

export interface FirebaseConfigStatus {
  isConfigured: boolean;
  authEnabled: boolean;
  firestoreEnabled: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verifies Firebase configuration and tests authentication services
 */
export const verifyFirebaseConfig = async (): Promise<FirebaseConfigStatus> => {
  const status: FirebaseConfigStatus = {
    isConfigured: false,
    authEnabled: false,
    firestoreEnabled: false,
    errors: [],
    warnings: []
  };

  // Check environment variables
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    status.errors.push(`Missing required Firebase environment variables: ${missingEnvVars.join(', ')}`);
    return status;
  }

  // Check for placeholder values
  if (process.env.REACT_APP_FIREBASE_API_KEY === 'your-api-key' ||
      (process.env.REACT_APP_FIREBASE_API_KEY && process.env.REACT_APP_FIREBASE_API_KEY.length < 10)) {
    status.errors.push('Firebase API key appears to be invalid or a placeholder');
  }

  if (process.env.REACT_APP_FIREBASE_AUTH_DOMAIN?.includes('example.com')) {
    status.errors.push('Firebase Auth Domain appears to be a placeholder');
  }

  // If we have critical errors, return early
  if (status.errors.length > 0) {
    return status;
  }

  // Basic configuration is present
  status.isConfigured = true;

  // Create a temporary Firebase instance for testing
  const tempConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
  };

  try {
    // Initialize a temporary app for testing
    const tempApp = initializeApp(tempConfig, 'configVerifier');
    const tempAuth = getAuth(tempApp);
    const tempDb = getFirestore(tempApp);

    // Test authentication
    try {
      // Try anonymous auth as a basic test
      await signInAnonymously(tempAuth);
      status.authEnabled = true;
    } catch (authError: any) {
      if (authError.code === 'auth/configuration-not-found') {
        status.errors.push('Firebase Authentication is not enabled in the Firebase Console');
      } else if (authError.code === 'auth/admin-restricted-operation') {
        status.errors.push('Anonymous authentication is not enabled in the Firebase Console');
        status.warnings.push('Enable Anonymous Authentication in the Firebase Console or use a different auth method');
      } else {
        status.errors.push(`Authentication error: ${authError.message} (${authError.code})`);
      }
    }

    // Test Firestore
    try {
      // Just try to access any collection
      const testQuery = query(collection(tempDb, 'users'), limit(1));
      await getDocs(testQuery);
      status.firestoreEnabled = true;
    } catch (dbError: any) {
      status.warnings.push(`Firestore access error: ${dbError.message}`);
    }

  } catch (error: any) {
    status.errors.push(`Firebase initialization error: ${error.message}`);
  }

  return status;
};

/**
 * Logs Firebase configuration status to console
 */
export const logFirebaseConfigStatus = async (): Promise<void> => {
  console.group('Firebase Configuration Status');
  try {
    const status = await verifyFirebaseConfig();
    
    console.log('Configuration present:', status.isConfigured ? '✅' : '❌');
    console.log('Auth enabled:', status.authEnabled ? '✅' : '❌');
    console.log('Firestore enabled:', status.firestoreEnabled ? '✅' : '❌');
    
    if (status.errors.length > 0) {
      console.error('Errors:');
      status.errors.forEach(err => console.error(`- ${err}`));
    }
    
    if (status.warnings.length > 0) {
      console.warn('Warnings:');
      status.warnings.forEach(warn => console.warn(`- ${warn}`));
    }
    
    if (status.errors.length === 0 && status.warnings.length === 0) {
      console.log('Firebase configuration looks good! 👍');
    }
  } catch (error) {
    console.error('Failed to verify Firebase configuration:', error);
  }
  console.groupEnd();
};