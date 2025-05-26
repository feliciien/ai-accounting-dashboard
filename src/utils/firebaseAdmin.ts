import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

/**
 * Initializes Firebase Admin SDK if not already initialized
 * Uses the service account file specified in FIREBASE_SERVICE_ACCOUNT_KEY_PATH
 */
export const initFirebaseAdmin = (): App | null => {
  // If already initialized, return
  if (getApps().length > 0) {
    return getApps()[0];
  }
  try {
    // Get the service account file path from environment variable
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
    if (!serviceAccountPath) {
      console.error('FIREBASE_SERVICE_ACCOUNT_KEY_PATH env variable is missing.');
      throw new Error('Firebase service account key path not configured');
    }
    // Read the service account file
    const serviceAccountFile = path.resolve(process.cwd(), serviceAccountPath);
    if (!fs.existsSync(serviceAccountFile)) {
      console.error(`Service account file not found at: ${serviceAccountFile}`);
      throw new Error('Firebase service account key file does not exist');
    }
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountFile, 'utf8'));
    } catch (parseError) {
      console.error('Failed to parse Firebase service account key JSON:', parseError);
      throw new Error('Invalid Firebase service account key JSON');
    }
    // Initialize the app
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    return null;
  }
};

/**
 * Gets Firebase Auth instance, initializing Firebase Admin if necessary
 */
export const getFirebaseAdminAuth = () => {
  initFirebaseAdmin();
  return getAuth();
};