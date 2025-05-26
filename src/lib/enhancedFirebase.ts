/**
 * Enhanced Firebase Wrapper
 * 
 * This utility provides enhanced Firebase functionality with better error handling,
 * retry mechanisms, and session management to address common Firestore issues.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  signOut, 
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  query,
  limit,
  setDoc,
  updateDoc,
  onSnapshot,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { handleFirestoreError, retryFirestoreOperation, withFirestoreErrorHandling } from './firestoreErrorHandler';

// Store the original Firebase instances
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

// Export the db instance for direct use
export { db };

// Initialize Firebase with better error handling
export const initializeEnhancedFirebase = () => {
  try {
    // Your web app's Firebase configuration
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
    auth = getAuth(app);
    db = getFirestore(app);
    
    console.log('Enhanced Firebase initialized successfully');
    return { app, auth, db };
  } catch (error) {
    console.error('Enhanced Firebase initialization error:', error);
    throw error;
  }
};

// Get the Firebase instances, initializing if needed
export const getEnhancedFirebaseAuth = (): Auth => {
  if (!auth) {
    const { auth: newAuth } = initializeEnhancedFirebase();
    return newAuth!;
  }
  return auth;
};

export const getEnhancedFirebaseFirestore = (): Firestore => {
  if (!db) {
    const { db: newDb } = initializeEnhancedFirebase();
    return newDb!;
  }
  return db;
};

// Helper functions for Firestore collections
export const getCollection = (collectionPath: string): CollectionReference => {
  const firestore = getEnhancedFirebaseFirestore();
  return collection(firestore, collectionPath);
};

export const getDocument = <T = DocumentData>(collectionPath: string, docId: string): DocumentReference<T> => {
  const firestore = getEnhancedFirebaseFirestore();
  return doc(firestore, collectionPath, docId) as DocumentReference<T>;
};

// Enhanced Firestore operations with error handling and retry
export const enhancedGetDoc = async<T = DocumentData>(
  docRef: DocumentReference<T>
) => {
  return retryFirestoreOperation(async () => {
    try {
      return await getDoc(docRef);
    } catch (error) {
      handleFirestoreError(error);
      throw error;
    }
  });
};
export const enhancedGetDocs = async<T = DocumentData>(
  queryRef: Query<T>
) => {
  return retryFirestoreOperation(async () => {
    try {
      return await getDocs(queryRef);
    } catch (error) {
      handleFirestoreError(error);
      throw error;
    }
  });
};
export const enhancedSetDoc = async<T = DocumentData>(
  docRef: DocumentReference<T>,
  data: any
) => {
  return retryFirestoreOperation(async () => {
    try {
      return await setDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error);
      throw error;
    }
  });
};
export const enhancedUpdateDoc = async<T = DocumentData>(
  docRef: DocumentReference<T>,
  data: any
) => {
  return retryFirestoreOperation(async () => {
    try {
      return await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error);
      throw error;
    }
  });
};
// Enhanced onSnapshot with error handling and automatic reconnection
export const enhancedOnSnapshot = <T = DocumentData>(
  queryRef: Query<T> | DocumentReference<T>,
  callback: (snapshot: QuerySnapshot<T> | DocumentSnapshot<T>) => void,
  errorCallback?: (error: Error) => void
) => {
  let unsubscribe: (() => void) | null = null;
  let retryCount = 0;
  const maxRetries = 5;
  const retryDelay = 1000; // Start with 1 second delay

  // Define attemptRetry function before it's used
  const attemptRetry = () => {
    if (retryCount < maxRetries) {
      retryCount++;
      const delay = retryDelay * Math.pow(2, retryCount - 1); // Exponential backoff
      
      console.warn(`Firestore listener disconnected. Retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
      
      setTimeout(() => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        setupListener();
      }, delay);
    } else {
      console.error(`Failed to establish Firestore listener after ${maxRetries} attempts.`);
    }
  };

  const setupListener = () => {
    try {
      // Handle different reference types
      if (queryRef.type === 'document') {
        // It's a DocumentReference
        unsubscribe = onSnapshot(
          queryRef as DocumentReference<T>,
          (snapshot) => {
            // Reset retry count on successful snapshot
            retryCount = 0;
            callback(snapshot as any);
          },
          (error: Error) => {
            handleFirestoreError(error);
            
            // Check if it's a session error (Unknown SID)
            if (error.name === 'i' && (error as any).code === 403) {
              console.warn('Firestore session error detected. Attempting to refresh authentication...');
              
              // Try to refresh authentication
              const auth = getEnhancedFirebaseAuth();
              signOut(auth).then(() => {
                // Try anonymous auth to refresh the session
                return signInAnonymously(auth);
              }).then(() => {
                console.log('Authentication refreshed. Reconnecting Firestore listener...');
                // Reconnect after auth refresh
                if (unsubscribe) {
                  unsubscribe();
                  unsubscribe = null;
                }
                setupListener();
              }).catch((authError) => {
                console.error('Failed to refresh authentication:', authError);
                attemptRetry();
              });
            } else {
              // For other errors, attempt retry with backoff
              attemptRetry();
            }
            
            // Call error callback if provided
            if (errorCallback) {
              errorCallback(error);
            }
          }
        );
      } else {
        // It's a Query
        unsubscribe = onSnapshot(
          queryRef as Query<T>,
          (snapshot) => {
            // Reset retry count on successful snapshot
            retryCount = 0;
            callback(snapshot);
          },
          (error: Error) => {
            handleFirestoreError(error);
            
            // Check if it's a session error (Unknown SID)
            if (error.name === 'i' && (error as any).code === 403) {
              console.warn('Firestore session error detected. Attempting to refresh authentication...');
              
              // Try to refresh authentication
              const auth = getEnhancedFirebaseAuth();
              signOut(auth).then(() => {
                // Try anonymous auth to refresh the session
                return signInAnonymously(auth);
              }).then(() => {
                console.log('Authentication refreshed. Reconnecting Firestore listener...');
                // Reconnect after auth refresh
                if (unsubscribe) {
                  unsubscribe();
                  unsubscribe = null;
                }
                setupListener();
              }).catch((authError) => {
                console.error('Failed to refresh authentication:', authError);
                attemptRetry();
              });
            } else {
              // For other errors, attempt retry with backoff
              attemptRetry();
            }
            
            // Call error callback if provided
            if (errorCallback) {
              errorCallback(error);
            }
          }
        );
      }
    } catch (setupError) {
      console.error('Error setting up Firestore listener:', setupError);
      attemptRetry();
    }
  };

  // Initial setup
  setupListener();

  // Return function to unsubscribe
  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
};

// Function to check and refresh authentication if needed
export const checkAndRefreshAuth = async (): Promise<boolean> => {
  const auth = getEnhancedFirebaseAuth();
  
  return new Promise((resolve) => {
    // Check current auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      
      if (user) {
        // User is signed in, check if token needs refresh
        user.getIdToken(true).then(() => {
          console.log('Authentication token refreshed successfully');
          resolve(true);
        }).catch((error) => {
          console.error('Failed to refresh token:', error);
          // Try to sign out and sign in anonymously
          signOut(auth).then(() => {
            return signInAnonymously(auth);
          }).then(() => {
            console.log('Re-authenticated successfully');
            resolve(true);
          }).catch((error) => {
            console.error('Failed to re-authenticate:', error);
            resolve(false);
          });
        });
      } else {
        // No user signed in, try anonymous auth
        signInAnonymously(auth).then(() => {
          console.log('Signed in anonymously');
          resolve(true);
        }).catch((error) => {
          console.error('Failed to sign in anonymously:', error);
          resolve(false);
        });
      }
    });
  });
};

// Initialize Firebase on module load to ensure db is available
(() => {
  try {
    const { app: initialApp, auth: initialAuth, db: initialDb } = initializeEnhancedFirebase();
    app = initialApp;
    auth = initialAuth;
    db = initialDb;
    console.log('Firebase initialized on module load');
  } catch (error) {
    console.error('Failed to initialize Firebase on module load:', error);
  }
})();