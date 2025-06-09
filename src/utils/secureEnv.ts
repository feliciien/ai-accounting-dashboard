/**
 * Secure Environment Variable Utility
 * 
 * This utility provides secure access to environment variables with proper validation
 * and protection against client-side exposure of sensitive keys.
 */

// Define environment variable types
export interface EnvVars {
  // Firebase configuration
  REACT_APP_FIREBASE_API_KEY: string;
  REACT_APP_FIREBASE_AUTH_DOMAIN: string;
  REACT_APP_FIREBASE_PROJECT_ID: string;
  REACT_APP_FIREBASE_STORAGE_BUCKET: string;
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: string;
  REACT_APP_FIREBASE_APP_ID: string;
  REACT_APP_FIREBASE_MEASUREMENT_ID: string;
  
  // OpenAI configuration
  REACT_APP_OPENAI_API_KEY: string;
  
  // Integration API keys
  REACT_APP_XERO_CLIENT_ID: string;
  REACT_APP_XERO_CLIENT_SECRET: string;
  REACT_APP_XERO_WEBHOOK_KEY: string;
  REACT_APP_PAYPAL_CLIENT_ID: string;
  REACT_APP_PAYPAL_SECRET: string;
  REACT_APP_STRIPE_CLIENT_ID: string;
  REACT_APP_STRIPE_SECRET_KEY: string;
  REACT_APP_EXCHANGE_RATE_API_KEY: string;
  
  // Plaid configuration
  PLAID_CLIENT_ID: string;
  PLAID_SECRET: string;
  PLAID_ENV: string;
  PLAID_REDIRECT_URI: string;
  
  // Application URL
  REACT_APP_URL: string;
  
  // Node environment
  NODE_ENV: 'development' | 'production' | 'test';
}

// Define sensitive keys that should never be exposed to the client
const SENSITIVE_KEYS: (keyof EnvVars)[] = [
  'REACT_APP_OPENAI_API_KEY',
  'REACT_APP_XERO_CLIENT_SECRET',
  'REACT_APP_XERO_WEBHOOK_KEY',
  'REACT_APP_PAYPAL_SECRET',
  'REACT_APP_STRIPE_SECRET_KEY',
  'PLAID_SECRET',
  'REACT_APP_FIREBASE_API_KEY'
];

/**
 * Check if we're running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Check if we're running in production
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Safely get an environment variable
 * In production browser context, sensitive keys will return null
 */
export const getEnvVar = <K extends keyof EnvVars>(key: K): string | null => {
  // In browser + production, don't allow access to sensitive keys
  if (isBrowser && isProduction && SENSITIVE_KEYS.includes(key)) {
    console.warn(`Attempted to access sensitive environment variable ${key} in client-side code`);
    return null;
  }
  
  return process.env[key] as string || null;
};

/**
 * Get a required environment variable
 * Throws an error if the variable is not defined
 */
export const getRequiredEnvVar = <K extends keyof EnvVars>(key: K): string => {
  const value = getEnvVar(key);
  
  if (value === null || value === undefined) {
    throw new Error(`Required environment variable ${key} is not defined`);
  }
  
  return value;
};

/**
 * Validate required environment variables
 */
export const validateRequiredEnvVars = (keys: (keyof EnvVars)[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  keys.forEach(key => {
    try {
      getRequiredEnvVar(key);
    } catch (error) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get Firebase configuration with proper security handling
 */
export const getFirebaseConfig = () => {
  // In production browser context, use a minimal config that doesn't expose sensitive keys
  if (isBrowser && isProduction) {
    return {
      projectId: getEnvVar('REACT_APP_FIREBASE_PROJECT_ID'),
      authDomain: getEnvVar('REACT_APP_FIREBASE_AUTH_DOMAIN'),
      storageBucket: getEnvVar('REACT_APP_FIREBASE_STORAGE_BUCKET'),
      // API key and other sensitive values are managed server-side
    };
  }
  
  // In development or server-side code, return the full config
  return {
    apiKey: getEnvVar('REACT_APP_FIREBASE_API_KEY'),
    authDomain: getEnvVar('REACT_APP_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('REACT_APP_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('REACT_APP_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('REACT_APP_FIREBASE_APP_ID'),
    measurementId: getEnvVar('REACT_APP_FIREBASE_MEASUREMENT_ID')
  };
};