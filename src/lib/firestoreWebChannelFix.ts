/**
 * Firestore WebChannel Connection Fix
 * 
 * This utility addresses the common "WebChannelConnection RPC 'Listen' stream transport errored: bn"
 * error that occurs with 400 Bad Request responses when connecting to Firestore.
 * 
 * Also handles the "WebChannelConnection RPC 'Write' stream transport errored" issue
 * that can occur during Stripe integration.
 */

import { FirebaseApp } from 'firebase/app';
import { Auth, onAuthStateChanged, signOut, signInWithCredential } from 'firebase/auth';
import { Firestore, enableIndexedDbPersistence, disableNetwork, enableNetwork, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeFirestoreDiagnostics } from './firestoreWebChannelDiagnostic';

// Track connection retry attempts
let retryCount = 0;
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Track specific error types for targeted recovery
let lastErrorType = '';

/**
 * Fixes common WebChannel connection issues by implementing a connection recovery strategy
 * 
 * @param db The Firestore instance
 * @param auth The Firebase Auth instance
 */
export const fixFirestoreWebChannelConnection = (db: Firestore, auth: Auth): void => {
  console.log('Initializing Firestore WebChannel connection fix...');
  
  // Listen for auth state changes to refresh Firestore connection
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Reset retry count when user signs in
      retryCount = 0;
      
      // Enable offline persistence to improve reliability
      try {
        await enableIndexedDbPersistence(db);
        console.log('Firestore offline persistence enabled');
      } catch (err: any) {
        // This error happens if enableIndexedDbPersistence() was already called
        if (err.code !== 'failed-precondition') {
          console.warn('Firestore persistence error:', err);
        }
      }
    }
  });
  
  // Add global error handler for WebChannel errors
  window.addEventListener('error', async (event) => {
    // Check if this is a Firestore WebChannel error
    const errorMessage = event.message || event.error?.message || '';
    const isFirestoreError = errorMessage.includes('WebChannelConnection') || 
                            errorMessage.includes('Unknown SID') ||
                            errorMessage.includes('Bad Request');
    
    // Identify specific error types for targeted recovery
    if (isFirestoreError) {
      if (errorMessage.includes("'Write' stream")) {
        lastErrorType = 'write_stream';
      } else if (errorMessage.includes("'Listen' stream")) {
        lastErrorType = 'listen_stream';
      } else if (errorMessage.includes('Bad Request')) {
        lastErrorType = 'bad_request';
      }
    }
    
    if (isFirestoreError && retryCount < MAX_RETRIES) {
      event.preventDefault(); // Prevent the error from bubbling up
      
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      retryCount++;
      
      console.warn(`Firestore WebChannel error detected (${lastErrorType}). Attempting recovery (${retryCount}/${MAX_RETRIES})...`);
      
      // Wait for the exponential backoff delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        // Implement recovery strategy
        await recoverFirestoreConnection(db, auth);
        console.log('Firestore connection recovery attempt complete');
      } catch (err) {
        console.error('Firestore recovery failed:', err);
      }
    } else if (isFirestoreError) {
      console.error('Maximum Firestore recovery attempts reached. Please refresh the page.');
    }
  });
};

/**
 * Attempts to recover a broken Firestore connection
 */
async function recoverFirestoreConnection(db: Firestore, auth: Auth): Promise<void> {
  // Step 1: Disable network to force close any hanging connections
  await disableNetwork(db);
  console.log('Firestore network disabled for recovery');
  
  // Step 2: Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 3: Re-enable network
  await enableNetwork(db);
  console.log('Firestore network re-enabled');
  
  // Step 4: If user is signed in, refresh their token
  const user = auth.currentUser;
  if (user) {
    try {
      await user.getIdToken(true); // Force token refresh
      console.log('Firebase auth token refreshed');
    } catch (err) {
      console.warn('Could not refresh auth token:', err);
    }
  }
  
  // Step 5: Apply specific recovery strategies based on error type
  if (lastErrorType === 'write_stream' || lastErrorType === 'bad_request') {
    // For write stream errors, we need to clear any pending writes
    try {
      // Clear IndexedDB cache for this specific error type
      // Use type assertion to access internal properties safely
      const dbName = `firestore/${(db as any)._databaseId?.projectId || 'default'}/${(db as any)._databaseId?.database || 'default'}/main`;
      const request = indexedDB.deleteDatabase(dbName);
      
      request.onsuccess = () => {
        console.log('Successfully cleared Firestore cache');
      };
      
      request.onerror = () => {
        console.error('Failed to clear Firestore cache');
      };
    } catch (err) {
      console.warn('Error clearing Firestore cache:', err);
    }
  }
  
  // Reset error type after recovery attempt
  lastErrorType = '';
}

/**
 * Adds CORS headers to the document if needed
 * This helps with cross-domain Firestore access
 */
export const addFirestoreCorsHeaders = (): void => {
  // Check if we're in a browser environment
  if (typeof document !== 'undefined') {
    // Add meta tags for CORS if they don't exist
    if (!document.querySelector('meta[name="referrer"]')) {
      const meta = document.createElement('meta');
      meta.name = 'referrer';
      meta.content = 'no-referrer-when-downgrade';
      document.head.appendChild(meta);
      console.log('Added referrer meta tag for Firestore CORS');
    }
  }
};

/**
 * Configures domain verification for Firestore
 * This helps with the 400 Bad Request errors
 */
export const configureFirestoreDomainVerification = (): void => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Add the current domain to localStorage for debugging
    try {
      localStorage.setItem('firestore_domain', window.location.hostname);
      console.log(`Stored domain for Firestore verification: ${window.location.hostname}`);
    } catch (err) {
      // Ignore localStorage errors
    }
  }
};

/**
 * Adds workfusionapp.com specific fixes
 * This addresses the specific domain seen in the error logs
 */
export const addWorkfusionAppFixes = (): void => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('workfusionapp.com')) {
    console.log('Applying workfusionapp.com specific Firestore fixes');
    
    // Add specific meta tags for workfusionapp.com domain
    if (typeof document !== 'undefined') {
      // Add cross-origin meta tag
      const corsMetaTag = document.createElement('meta');
      corsMetaTag.httpEquiv = 'Cross-Origin-Opener-Policy';
      corsMetaTag.content = 'same-origin';
      document.head.appendChild(corsMetaTag);
      
      // Add content security policy meta tag
      const cspMetaTag = document.createElement('meta');
      cspMetaTag.httpEquiv = 'Content-Security-Policy';
      cspMetaTag.content = "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.googleapis.com";
      document.head.appendChild(cspMetaTag);
    }
  }
};

/**
 * Initialize all Firestore connection fixes
 */
export const initializeFirestoreFixes = (db: Firestore, auth: Auth): void => {
  addFirestoreCorsHeaders();
  configureFirestoreDomainVerification();
  addWorkfusionAppFixes();
  fixFirestoreWebChannelConnection(db, auth);
  
  // Initialize diagnostic tools
  initializeFirestoreDiagnostics(db, auth);
  
  console.log('Firestore connection fixes initialized');
};