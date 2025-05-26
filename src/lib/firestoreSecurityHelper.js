"use strict";
/**
 * Firestore Security Rules Helper
 *
 * This utility provides guidance on configuring Firestore security rules
 * to resolve common permission issues and 403 errors.
 */
exports.__esModule = true;
exports.logFirestoreSecurityHelp = exports.getFirestorePermissionTroubleshootingSteps = exports.getRecommendedSecurityRules = void 0;
/**
 * Provides recommended Firestore security rules based on common application patterns
 */
var getRecommendedSecurityRules = function () {
    return "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    // Allow authenticated users to read and write their own data\n    match /users/{userId} {\n      allow read, write: if request.auth != null && request.auth.uid == userId;\n    }\n    \n    // Allow authenticated users to read test_connection collection\n    match /test_connection/{document=**} {\n      allow read: if request.auth != null;\n    }\n    \n    // Add more collection-specific rules here\n    \n    // Deny all other access by default\n    match /{document=**} {\n      allow read, write: if false;\n    }\n  }\n}";
};
exports.getRecommendedSecurityRules = getRecommendedSecurityRules;
/**
 * Provides troubleshooting steps for common Firestore permission issues
 */
var getFirestorePermissionTroubleshootingSteps = function () {
    return [
        "1. Check Firebase Console > Firestore Database > Rules to ensure your security rules are properly configured",
        "2. Verify that you're properly authenticated before accessing Firestore",
        "3. Ensure your Firebase project billing is active and not suspended",
        "4. Check if you've exceeded your Firestore quota limits",
        "5. Verify your app is using the correct Firebase project configuration",
        "6. If using Firebase Emulator locally, ensure it's properly configured",
        "7. Check for any CORS issues if accessing from a different domain",
        "8. Verify your Firebase API key restrictions in Google Cloud Console"
    ];
};
exports.getFirestorePermissionTroubleshootingSteps = getFirestorePermissionTroubleshootingSteps;
/**
 * Logs Firestore security troubleshooting information to console
 */
var logFirestoreSecurityHelp = function () {
    console.group('Firestore Security Troubleshooting');
    console.log('Common causes of 403 Forbidden errors in Firestore:');
    console.log('1. Security rules are too restrictive');
    console.log('2. User is not authenticated or token is expired');
    console.log('3. Project billing issues');
    console.log('4. Quota exceeded');
    console.log('\nRecommended Security Rules:');
    console.log((0, exports.getRecommendedSecurityRules)());
    console.log('\nTroubleshooting Steps:');
    (0, exports.getFirestorePermissionTroubleshootingSteps)().forEach(function (step) {
        console.log(step);
    });
    console.log('\nTo fix the "Unknown SID" error:');
    console.log('1. This typically indicates an expired or invalid session');
    console.log('2. Try signing out and signing back in to refresh authentication');
    console.log('3. Clear browser cache and cookies');
    console.log('4. Check for network connectivity issues');
    console.groupEnd();
};
exports.logFirestoreSecurityHelp = logFirestoreSecurityHelp;
