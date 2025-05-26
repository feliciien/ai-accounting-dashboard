# Xero Integration Setup Guide

## Fixing the "unauthorized_client" Error

You're experiencing an error with your Xero integration that shows:

```
Error: unauthorized_client : Unknown client or client not enabled
```

This error indicates that the Xero API credentials in your application are either invalid or the app has been disabled in the Xero Developer Portal.

## How to Fix the Issue

### 1. Create a New Xero App

1. Go to [Xero Developer Portal](https://developer.xero.com/app/manage)
2. Sign in with your Xero account
3. Click on "New App" to create a new application
4. Fill in the required details:
   - App Name: AI Accounting Dashboard (or your preferred name)
   - Company or application URL
   - OAuth 2.0 redirect URI: `http://localhost:3000/api/integrations/xero/callback`
   - Select the required API scopes (at minimum: openid, profile, email, accounting.transactions, accounting.contacts, offline_access)

### 2. Update Your Environment Variables

After creating the app, you'll receive a Client ID and Client Secret. Update your `.env` file with these new credentials:

```
REACT_APP_XERO_CLIENT_ID=YOUR_NEW_CLIENT_ID
REACT_APP_XERO_CLIENT_SECRET=YOUR_NEW_CLIENT_SECRET
```

### 3. Verify Redirect URI Configuration

Ensure that the redirect URI in your Xero Developer Portal exactly matches what's in your code:

- In your code: `${window.location.origin}/api/integrations/xero/callback`
- For local development: `http://localhost:3000/api/integrations/xero/callback`

### 4. Check App Status

Make sure your app is enabled in the Xero Developer Portal. Look for any status indicators showing that the app is active.

### 5. Test the Integration

After updating your credentials and ensuring your app is properly configured:

1. Restart your application
2. Navigate to the Xero integration page
3. Click "Connect Xero Account"
4. You should be redirected to Xero for authentication without the previous error

## Troubleshooting

If you continue to experience issues:

1. Check Xero's [Status Page](https://status.xero.com/) for any service disruptions
2. Verify that your Xero account has the necessary permissions
3. Ensure your app in the Xero Developer Portal has all required API scopes enabled
4. Check that the clock on your server is correctly synchronized (OAuth token validation is time-sensitive)

## Additional Resources

- [Xero API Documentation](https://developer.xero.com/documentation/)
- [OAuth 2.0 Implementation Guide](https://developer.xero.com/documentation/guides/oauth2/auth-flow)
- [Xero API Status Page](https://status.xero.com/)