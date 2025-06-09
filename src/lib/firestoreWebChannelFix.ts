/**
 * Firestore WebChannel Connection Fix
 * 
 * This utility addresses the common "WebChannelConnection RPC 'Listen' stream transport errored"
 * error that occurs with 400 Bad Request responses when connecting to Firestore.
 */

import { FirebaseApp } from 'firebase/app';
import { Auth, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { 
  Firestore, 
  enableIndexedDbPersistence, 
  disableNetwork, 
  enableNetwork,
  deleteField 
} from 'firebase/firestore';
import { initializeFirestoreDiagnostics } from './firestoreWebChannelDiagnostic';

// Track connection retry attempts
let retryCount = 0;
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Track specific error types for targeted recovery
let lastErrorType = '';

/**
 * Fixes common WebChannel connection issues
 */
export const fixFirestoreWebChannelConnection = (db: Firestore, auth: Auth): void => {
  console.log('Initializing Firestore WebChannel connection fix...');
  
  // Listen for auth state changes to refresh Firestore connection
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Reset retry count when user signs in
      retryCount = 0;
      
      try {
        await enableNetwork(db);
        console.log('Firestore network enabled after auth change');
      } catch (err) {
        console.warn('Error enabling Firestore network:', err);
      }
    }
  });
  
  // Add global error handler for WebChannel errors
  window.addEventListener('error', async (event) => {
    const errorMessage = event.message || event.error?.message || '';
    const isFirestoreError = 
      errorMessage.includes('WebChannelConnection') || 
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

      // Prevent the same error type from triggering multiple recoveries
      const now = Date.now();
      const lastRecoveryTime = parseInt(sessionStorage.getItem(`lastRecovery_${lastErrorType}`) || '0');
      if (now - lastRecoveryTime < 5000) { // 5 second cooldown
        return;
      }
      sessionStorage.setItem(`lastRecovery_${lastErrorType}`, now.toString());
      
      if (retryCount < MAX_RETRIES) {
        event.preventDefault(); // Prevent the error from bubbling up
        
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        retryCount++;
        
        console.warn(`Firestore WebChannel error detected (${lastErrorType}). Attempting recovery (${retryCount}/${MAX_RETRIES})...`);
        
        try {
          await recoverFirestoreConnection(db, auth);
          console.log('Firestore connection recovery attempt complete');
          
          // If recovery was successful, reset retry count
          if (await verifyFirestoreConnection(db)) {
            retryCount = 0;
            console.log('Firestore connection verified working');
          }
        } catch (err) {
          console.error('Firestore recovery failed:', err);
        }
      } else if (isFirestoreError) {
        console.error('Maximum Firestore recovery attempts reached. Please refresh the page.');
      }
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
  
  // Step 2: Clear IndexedDB for specific error types
  if (lastErrorType === 'write_stream' || lastErrorType === 'bad_request') {
    try {
      const dbName = `firestore/${(db as any)._databaseId?.projectId || 'default'}/${(db as any)._databaseId?.database || 'default'}/main`;
      await clearIndexedDB(dbName);
      console.log('Cleared Firestore IndexedDB cache');
    } catch (err) {
      console.warn('Error clearing Firestore cache:', err);
    }
  }
  
  // Step 3: Wait a moment for connections to fully close
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 4: Re-enable network
  await enableNetwork(db);
  console.log('Firestore network re-enabled');
  
  // Step 5: If user is signed in, refresh their token
  const user = auth.currentUser;
  if (user) {
    try {
      await user.getIdToken(true);
      console.log('Firebase auth token refreshed');
    } catch (err) {
      console.warn('Could not refresh auth token:', err);
      // Try anonymous auth as a fallback
      try {
        await signInAnonymously(auth);
        console.log('Anonymous auth successful');
      } catch (anonErr) {
        console.error('Anonymous auth failed:', anonErr);
      }
    }
  }
}

/**
 * Clear IndexedDB database
 */
function clearIndexedDB(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onerror = () => reject(new Error('Failed to delete IndexedDB'));
    request.onsuccess = () => resolve();
  });
}

/**
 * Verify Firestore connection is working
 */
async function verifyFirestoreConnection(db: Firestore): Promise<boolean> {
  try {
    await enableNetwork(db);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Adds CORS headers to the document
 */
export const addFirestoreCorsHeaders = (): void => {
  if (typeof document !== 'undefined') {
    // Add CORS meta tags if they don't exist
    const metaTags = [
      { name: 'referrer', content: 'no-referrer-when-downgrade' },
      { 'http-equiv': 'Cross-Origin-Opener-Policy', content: 'same-origin' },
      { 'http-equiv': 'Cross-Origin-Resource-Policy', content: 'cross-origin' }
    ];

    metaTags.forEach(tag => {
      if (!document.querySelector(`meta[${tag.name ? 'name' : 'http-equiv'}="${tag.name || tag['http-equiv']}"]`)) {
        const meta = document.createElement('meta');
        if (tag.name) meta.name = tag.name;
        if (tag['http-equiv']) meta.httpEquiv = tag['http-equiv'];
        meta.content = tag.content;
        document.head.appendChild(meta);
      }
    });
  }
};

/**
 * Initialize all Firestore connection fixes
 */
export const initializeFirestoreFixes = (db: Firestore, auth: Auth): void => {
  addFirestoreCorsHeaders();
  fixFirestoreWebChannelConnection(db, auth);
  
  // Initialize diagnostic tools
  initializeFirestoreDiagnostics(db, auth);
  
  console.log('Firestore connection fixes initialized');
};