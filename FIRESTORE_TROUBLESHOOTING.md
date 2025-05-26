# Firestore Connection Troubleshooting Guide

## Issue Identified

The application is experiencing a Firestore connection error with the following symptoms:

- 403 Forbidden error with "Unknown SID" message
- Error occurs when trying to access Firestore database
- Firebase Auth initializes successfully, but Firestore operations fail

## Root Causes

This error typically indicates one of the following issues:

1. **Firebase Security Rules**: Overly restrictive security rules preventing access to Firestore collections
2. **Authentication Issues**: Invalid or expired authentication token/session
3. **Project Configuration**: Incorrect Firebase project configuration or billing issues
4. **CORS Issues**: Cross-origin resource sharing problems

## Solution Implemented

We've added several diagnostic and error handling utilities to help identify and fix the issue:

1. **Firestore Configuration Verifier**: Tests Firestore connection and identifies specific error types
2. **Firestore Security Helper**: Provides recommended security rules and troubleshooting steps
3. **Firestore Error Handler**: Enhanced error handling with specific solutions for the "Unknown SID" error
4. **Enhanced Firebase Wrapper**: Improved Firebase implementation with automatic retry and session refresh

## How to Fix the Issue

### 1. Check Firestore Security Rules

The most common cause of 403 errors is restrictive security rules. Update your Firestore security rules in the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `synthai-d9ea4`
3. Navigate to Firestore Database → Rules
4. Update the rules to allow proper access. Here's a recommended starting point:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read test_connection collection
    match /test_connection/{document=**} {
      allow read: if request.auth != null;
    }
    
    // Add more collection-specific rules here
    
    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2. Refresh Authentication

The "Unknown SID" error often indicates an expired session. Try these steps:

1. Sign out and sign back in to refresh your authentication token
2. Clear browser cache and cookies
3. Use the new `checkAndRefreshAuth()` function from the enhanced Firebase wrapper

### 3. Check Project Configuration

1. Verify your Firebase project is properly set up in the Firebase Console
2. Ensure billing is active and not suspended
3. Check if you've exceeded your Firestore quota limits

### 4. Using the New Utilities

The application now includes several utilities to help diagnose and fix Firestore issues:

#### Diagnostic Tools

- Open your browser console to see detailed diagnostics from:
  - `logFirestoreConfigStatus()`: Tests Firestore connection and configuration
  - `logFirestoreSecurityHelp()`: Provides security rules guidance

#### Enhanced Firebase API

Replace standard Firebase operations with enhanced versions for better error handling:

```typescript
// Instead of:
import { getFirestore, doc, getDoc } from 'firebase/firestore';
const db = getFirestore();
const docRef = doc(db, 'collection', 'docId');
const docSnap = await getDoc(docRef);

// Use:
import { getEnhancedFirebaseFirestore, enhancedGetDoc } from './lib/enhancedFirebase';
const db = getEnhancedFirebaseFirestore();
const docRef = doc(db, 'collection', 'docId');
const docSnap = await enhancedGetDoc(docRef);
```

The enhanced versions include:
- Automatic retry with exponential backoff
- Detailed error messages
- Session refresh for "Unknown SID" errors

## Next Steps

If the issue persists after trying these solutions:

1. Check the browser console for specific error messages
2. Review Firebase project logs in the Firebase Console
3. Consider temporarily enabling more permissive security rules for testing
4. Verify network connectivity and CORS configuration

## Additional Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Troubleshooting Guide](https://firebase.google.com/docs/firestore/troubleshoot)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)