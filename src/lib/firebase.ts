import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Check for required environment variables
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required Firebase environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please check your .env file and ensure all required variables are set.');
}

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

// Initialize Firebase with better error handling
let app: ReturnType<typeof initializeApp> | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let analytics: Analytics | undefined;
let googleProvider: GoogleAuthProvider | undefined;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  analytics = getAnalytics(app);
  googleProvider = new GoogleAuthProvider();
  
  // Verify auth is properly initialized
  if (auth) {
    console.log('Firebase Auth initialized successfully');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  console.error('Please verify your Firebase project configuration and ensure Authentication is enabled in the Firebase Console');
}

// Create wrapper functions that handle potential initialization errors
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    console.error('Firebase Auth not initialized. Please check your Firebase configuration.');
    throw new Error('Firebase Auth not initialized. Check if Authentication is enabled in Firebase Console.');
  }
  return auth;
};

export const getFirebaseFirestore = (): Firestore => {
  if (!db) {
    console.error('Firebase Firestore not initialized. Please check your Firebase configuration.');
    throw new Error('Firebase Firestore not initialized');
  }
  return db;
};

export const getGoogleAuthProvider = (): GoogleAuthProvider => {
  if (!googleProvider) {
    console.error('Google Auth Provider not initialized. Please check your Firebase configuration.');
    throw new Error('Google Auth Provider not initialized');
  }
  return googleProvider;
};

// For backward compatibility, still export the original objects
export const getFirebaseAnalytics = (): Analytics => {
  if (!analytics) {
    console.error('Firebase Analytics not initialized. Please check your Firebase configuration.');
    throw new Error('Firebase Analytics not initialized');
  }
  return analytics;
};

export { auth, db, googleProvider, analytics };

// Verify and log Firebase initialization status
if (app && auth && db) {
  console.log('Firebase initialized successfully');
  
  // Verify Firebase project configuration
  if (!process.env.REACT_APP_FIREBASE_API_KEY || 
      !process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 
      !process.env.REACT_APP_FIREBASE_PROJECT_ID) {
    console.warn('Some Firebase configuration values may be missing. This could cause authentication issues.');
  }
  
  // Check if the API key looks valid (basic check)
  if (process.env.REACT_APP_FIREBASE_API_KEY && 
      (process.env.REACT_APP_FIREBASE_API_KEY === 'your-api-key' || 
       process.env.REACT_APP_FIREBASE_API_KEY.length < 10)) {
    console.error('Firebase API key appears to be invalid or placeholder. Authentication will fail.');
  }
} else {
  console.error('Firebase initialization failed. Authentication and database operations will not work.');
}