# Firebase Admin SDK Setup Guide

## Overview

This guide explains how to set up the Firebase Admin SDK for server-side authentication in the AI Accounting Dashboard. The Admin SDK is required for API endpoints that need to verify Firebase authentication tokens on the server side, such as the PayPal integration endpoints.

## Steps to Configure Firebase Admin SDK

### 1. Create a Firebase Service Account Key

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`synthai-d9ea4`)
3. Navigate to Project Settings > Service accounts
4. Click on "Generate new private key" for the Firebase Admin SDK
5. Save the downloaded JSON file securely

### 2. Replace the Placeholder Service Account Key

The repository includes a placeholder service account key file at `firebase-service-account.json`. You need to replace its contents with your actual service account key.

```json
// Replace the contents of firebase-service-account.json with your actual service account key
{
  "type": "service_account",
  "project_id": "synthai-d9ea4",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "YOUR_PRIVATE_KEY",
  "client_email": "YOUR_CLIENT_EMAIL",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "YOUR_CLIENT_X509_CERT_URL",
  "universe_domain": "googleapis.com"
}
```

### 3. Verify Environment Variables

Ensure your `.env` file contains the path to the service account key file:

```
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./firebase-service-account.json
```

## Troubleshooting

### Common Issues

1. **"Firebase service account key path not configured"**:
   - Ensure the `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` environment variable is set correctly in your `.env` file

2. **"Error initializing Firebase Admin"**:
   - Verify that the service account key file exists at the specified path
   - Check that the service account key file contains valid JSON
   - Ensure the service account has the necessary permissions

3. **"Unauthorized: Invalid token"**:
   - The Firebase Admin SDK is unable to verify the authentication token
   - Ensure you're using the correct service account for your Firebase project
   - Check that the client is sending a valid Firebase authentication token

## Security Considerations

- **NEVER** commit your actual Firebase service account key to version control
- Consider using environment variables or a secrets management solution in production
- Restrict the permissions of your service account to only what's necessary
- Regularly rotate your service account keys

## Related Files

- `src/utils/firebaseAdmin.ts`: Utility functions for initializing the Firebase Admin SDK
- `src/pages/api/paypal/redirect.ts`: Uses Firebase Admin for authentication in the PayPal redirect endpoint
- `src/pages/api/paypal/transactions.ts`: Uses Firebase Admin for authentication in the PayPal transactions endpoint