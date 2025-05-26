/**
 * Firestore Configuration Verification Utility
 * 
 * This utility helps diagnose Firestore connection issues
 * by checking environment variables, testing connections, and validating permissions.
 */

import { getFirestore, collection, getDocs, query, limit, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

export interface FirestoreConfigStatus {
  isConfigured: boolean;
  isConnected: boolean;
  hasPermissions: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verifies Firestore configuration and tests connection
 */
export const verifyFirestoreConfig = async (): Promise<FirestoreConfigStatus> => {
  const status: FirestoreConfigStatus = {
    isConfigured: false,
    isConnected: false,
    hasPermissions: false,
    errors: [],
    warnings: []
  };

  // Check environment variables
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_PROJECT_ID'
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    status.errors.push(`Missing required Firestore environment variables: ${missingEnvVars.join(', ')}`);
    return status;
  }

  // Check for placeholder values
  if (process.env.REACT_APP_FIREBASE_PROJECT_ID === 'your-project-id' ||
      (process.env.REACT_APP_FIREBASE_PROJECT_ID && process.env.REACT_APP_FIREBASE_PROJECT_ID.length < 5)) {
    status.errors.push('Firebase Project ID appears to be invalid or a placeholder');
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
    const tempApp = initializeApp(tempConfig, 'firestoreConfigVerifier');
    const tempDb = getFirestore(tempApp);

    // Test Firestore connection
    try {
      // Try to access a test collection
      const testQuery = query(collection(tempDb, 'test_connection'), limit(1));
      await getDocs(testQuery);
      status.isConnected = true;
      status.hasPermissions = true;
    } catch (dbError: any) {
      // Check for specific error codes
      if (dbError.code === 'permission-denied') {
        status.isConnected = true; // Connection works but permissions are an issue
        status.errors.push('Firestore permission denied. Check your security rules.');
      } else if (dbError.code === 'unavailable') {
        status.errors.push('Firestore service is currently unavailable. Try again later.');
      } else if (dbError.code === 'resource-exhausted') {
        status.isConnected = true;
        status.warnings.push('Firestore quota exceeded. Consider upgrading your plan.');
      } else if (dbError.code === 'unauthenticated') {
        status.isConnected = true;
        status.errors.push('Authentication required to access Firestore. Make sure you are signed in.');
      } else if (dbError.code === 'failed-precondition') {
        status.isConnected = true;
        status.errors.push('Firestore operation failed. This might be due to an index not being configured.');
      } else if (dbError.code === 'invalid-argument') {
        status.isConnected = true;
        status.errors.push('Invalid query or document data format.');
      } else if (dbError.name === 'i' && dbError.code === 403) {
        // Special case for the specific error in the logs
        status.errors.push(`Firestore access forbidden (403). This could be due to:
          1. Firebase security rules blocking access
          2. Project billing issues
          3. Invalid or expired authentication token
          4. Cross-origin resource sharing (CORS) issues`);

      } else {
        status.errors.push(`Firestore access error: ${dbError.message} (${dbError.code})`);
      }
    }
  } catch (error: any) {
    status.errors.push(`Firestore initialization error: ${error.message}`);
  }

  return status;
};

/**
 * Logs Firestore configuration status to console
 */
export const logFirestoreConfigStatus = async (): Promise<void> => {
  console.group('Firestore Connection Status');
  try {
    const status = await verifyFirestoreConfig();
    
    console.log('Configuration present:', status.isConfigured ? '✅' : '❌');
    console.log('Connection established:', status.isConnected ? '✅' : '❌');
    console.log('Has required permissions:', status.hasPermissions ? '✅' : '❌');
    
    if (status.errors.length > 0) {
      console.error('Errors:');
      status.errors.forEach(err => console.error(`- ${err}`));
    }
    
    if (status.warnings.length > 0) {
      console.warn('Warnings:');
      status.warnings.forEach(warn => console.warn(`- ${warn}`));
    }
    
    if (status.errors.length === 0 && status.warnings.length === 0 && status.isConnected) {
      console.log('Firestore connection looks good! 👍');
    }
  } catch (error) {
    console.error('Failed to verify Firestore configuration:', error);
  }
  console.groupEnd();
};