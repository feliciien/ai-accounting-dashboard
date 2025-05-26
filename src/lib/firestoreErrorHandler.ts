/**
 * Firestore Error Handler
 * 
 * This utility provides enhanced error handling for Firestore operations,
 * specifically addressing common issues like 403 errors and "Unknown SID" errors.
 */

import { FirebaseError } from 'firebase/app';
import { logFirestoreSecurityHelp } from './firestoreSecurityHelper';

// Error types that can be handled
export type FirestoreErrorType = 
  | 'permission-denied'
  | 'unavailable'
  | 'resource-exhausted'
  | 'unauthenticated'
  | 'failed-precondition'
  | 'invalid-argument'
  | 'unknown-sid'
  | 'unknown';

// Error handler function type
export type FirestoreErrorHandler = (error: any) => void;

/**
 * Determines the type of Firestore error
 */
export const getFirestoreErrorType = (error: any): FirestoreErrorType => {
  // Handle Firebase errors
  if (error instanceof FirebaseError) {
    return error.code as FirestoreErrorType;
  }
  
  // Handle the specific 403 error with "Unknown SID" message
  if (error && error.name === 'i' && error.code === 403) {
    return 'unknown-sid';
  }
  
  // Handle other error types
  if (error && error.message) {
    if (error.message.includes('permission denied')) return 'permission-denied';
    if (error.message.includes('unavailable')) return 'unavailable';
    if (error.message.includes('resource exhausted')) return 'resource-exhausted';
    if (error.message.includes('unauthenticated')) return 'unauthenticated';
    if (error.message.includes('failed precondition')) return 'failed-precondition';
    if (error.message.includes('invalid argument')) return 'invalid-argument';
    if (error.message.includes('Unknown SID')) return 'unknown-sid';
  }
  
  return 'unknown';
};

/**
 * Gets a user-friendly error message for a Firestore error
 */
export const getFirestoreErrorMessage = (error: any): string => {
  const errorType = getFirestoreErrorType(error);
  
  switch (errorType) {
    case 'permission-denied':
      return 'You don\'t have permission to access this data. Please check your authentication status.';
    case 'unavailable':
      return 'The Firestore service is currently unavailable. Please try again later.';
    case 'resource-exhausted':
      return 'Firestore quota exceeded. Please try again later or consider upgrading your plan.';
    case 'unauthenticated':
      return 'Authentication required. Please sign in to access this data.';
    case 'failed-precondition':
      return 'Operation failed. This might be due to a missing index or other configuration issue.';
    case 'invalid-argument':
      return 'Invalid query or document data format.';
    case 'unknown-sid':
      return 'Session error: Unknown SID. Your session may have expired. Try signing out and back in.';
    default:
      return `Firestore error: ${error.message || 'Unknown error'}`;
  }
};

/**
 * Handles Firestore errors with appropriate actions
 */
export const handleFirestoreError = (error: any, customHandler?: FirestoreErrorHandler): void => {
  const errorType = getFirestoreErrorType(error);
  const errorMessage = getFirestoreErrorMessage(error);
  
  // Log the error
  console.error(`Firestore Error (${errorType}):`, errorMessage);
  
  // For specific error types, provide additional help
  if (errorType === 'permission-denied' || errorType === 'unknown-sid') {
    logFirestoreSecurityHelp();
  }
  
  // Call custom handler if provided
  if (customHandler) {
    customHandler(error);
  }
};

/**
 * Creates a wrapped version of a Firestore operation that includes error handling
 */
export const withFirestoreErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  operation: T,
  customHandler?: FirestoreErrorHandler
): ((...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>) => {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return await operation(...args);
    } catch (error) {
      handleFirestoreError(error, customHandler);
      throw error; // Re-throw to allow calling code to handle it as well
    }
  };
};

/**
 * Utility to retry a Firestore operation with exponential backoff
 */
export const retryFirestoreOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> => {
  let lastError: any;
  let delay = initialDelayMs;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry for permission errors
      const errorType = getFirestoreErrorType(error);
      if (errorType === 'permission-denied' || errorType === 'invalid-argument') {
        handleFirestoreError(error);
        throw error;
      }
      
      // Last attempt failed, handle the error and throw
      if (attempt === maxRetries) {
        handleFirestoreError(error);
        throw error;
      }
      
      // Wait before retrying
      console.warn(`Firestore operation failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay *= 2;
    }
  }
  
  // This should never happen due to the throw in the loop
  throw lastError;
};