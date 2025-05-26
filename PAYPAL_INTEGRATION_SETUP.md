# PayPal Integration Setup Guide

This guide will help you set up the PayPal integration for the AI Accounting Dashboard, allowing you to access transaction data and account balances directly in your dashboard.

## Prerequisites

1. A PayPal Business account
2. Access to the [PayPal Developer Dashboard](https://developer.paypal.com/)
3. Node.js and npm installed on your development machine

## Step 1: Create a PayPal App

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Log in with your PayPal Business account
3. Navigate to **My Apps & Credentials**
4. Click on **Create App** under the **Live** environment (not Sandbox)
5. Enter a name for your app (e.g., "AI Accounting Dashboard")
6. Select **Merchant** as the app type
7. Click **Create App**

## Step 2: Configure App Permissions

1. In your newly created app, scroll down to **App Settings**
2. Under **Live App Settings**, add the following Redirect URL:
   ```
   http://localhost:3000/api/paypal/callback
   ```
   (In production, replace with your actual domain)

3. Under **Advanced Settings**, enable the following permissions:
   - `openid`
   - `profile`
   - `email`
   - `https://uri.paypal.com/services/invoicing`
   - `https://uri.paypal.com/services/paypalattributes`
   - `https://uri.paypal.com/services/reporting/search/read`
   - `https://uri.paypal.com/services/transactions/readall` (for transaction history)

4. Click **Save**

## Step 3: Get API Credentials

1. On your app's page, note down the following credentials:
   - **Client ID**
   - **Secret**

## Step 4: Configure Environment Variables

1. In your project, create or update the `.env` file with the following variables:

```
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_REDIRECT_URI=http://localhost:3000/api/paypal/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. Replace `your_paypal_client_id` and `your_paypal_client_secret` with the values from Step 3
3. In production, update `PAYPAL_REDIRECT_URI` and `NEXT_PUBLIC_APP_URL` to your actual domain

## Step 5: Implement Token Management

### Token Storage

Store PayPal access tokens securely in your backend database. Never store tokens in local storage or cookies accessible by JavaScript.

```javascript
// Example token storage schema
const PayPalTokenSchema = new Schema({
  userId: { type: String, required: true, index: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### Token Refresh Implementation

Implement a token refresh mechanism to maintain uninterrupted access to PayPal APIs:

```javascript
// Example token refresh function
async function refreshPayPalToken(userId) {
  const tokenData = await PayPalToken.findOne({ userId });
  
  // Check if token needs refresh (5 minutes buffer)
  if (tokenData.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return tokenData.accessToken; // Current token is still valid
  }
  
  // Token needs refresh
  const response = await fetch('https://api.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`
    },
    body: `grant_type=refresh_token&refresh_token=${tokenData.refreshToken}`
  });
  
  const data = await response.json();
  
  // Update token in database
  await PayPalToken.findOneAndUpdate(
    { userId },
    {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      updatedAt: new Date()
    }
  );
  
  return data.access_token;
}
```

## Step 6: Restart the Application

Restart your application to apply the environment variable changes.

## Testing the Integration

1. Navigate to the PayPal integration page in your application
2. Click on "Connect PayPal Account"
3. You should be redirected to PayPal's authorization page
4. Log in with your PayPal credentials and authorize the application
5. After successful authorization, you should be redirected back to your application
6. The integration status should now show as connected
7. Test retrieving transaction data by navigating to the Transactions tab

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**: 
   - Error: "Invalid redirect_uri"
   - Solution: Ensure the redirect URI in your PayPal app settings exactly matches the one used in your application
   - Check for trailing slashes or http/https mismatches

2. **Missing Permissions**: 
   - Error: "Insufficient scope"
   - Solution: Verify that all required permissions are enabled in your PayPal app settings
   - Re-authorize the application after adding new permissions

3. **Invalid Credentials**: 
   - Error: "Invalid client credentials"
   - Solution: Double-check that the Client ID and Secret in your `.env` file are correct
   - Ensure you're using Live credentials, not Sandbox

4. **Token Refresh Failures**:
   - Error: "Invalid refresh token"
   - Solution: The refresh token may have expired or been invalidated
   - Prompt the user to reconnect their PayPal account

5. **API Connection Issues**:
   - Error: Network timeouts or connection refused
   - Solution: Check your network configuration and firewall settings
   - Verify PayPal service status at [PayPal System Status](https://status.paypal.com/)

### API Rate Limits

PayPal has rate limits on their APIs. If you encounter rate limit errors:

1. Implement caching strategies for frequently accessed data
2. Add exponential backoff for retries
3. Batch API requests where possible
4. Consider using webhooks for real-time updates instead of polling

## Security Considerations

1. **Token Security**:
   - Never expose your PayPal Secret or access tokens in client-side code
   - Store tokens in secure, encrypted database fields
   - Implement token rotation and automatic refresh

2. **Transport Security**:
   - Always use HTTPS in production
   - Set secure and httpOnly flags on cookies
   - Implement proper CORS policies

3. **User Authentication**:
   - Require re-authentication for sensitive operations
   - Implement proper session management
   - Use CSRF tokens for all forms

4. **Error Handling**:
   - Sanitize error messages shown to users
   - Log detailed errors server-side only
   - Never expose stack traces or system information

## Accessing PayPal Data

### Retrieving Transactions

```javascript
async function getPayPalTransactions(userId, startDate, endDate) {
  const accessToken = await refreshPayPalToken(userId);
  
  const response = await fetch(
    `https://api.paypal.com/v1/reporting/transactions?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

### Retrieving Account Balance

```javascript
async function getPayPalBalance(userId) {
  const accessToken = await refreshPayPalToken(userId);
  
  const response = await fetch(
    'https://api.paypal.com/v1/reporting/balances',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

## Additional Resources

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal REST API Reference](https://developer.paypal.com/api/rest/)
- [PayPal OAuth Integration Guide](https://developer.paypal.com/api/rest/authentication/)
- [PayPal Reporting API](https://developer.paypal.com/docs/api/transaction-search/v1/)
- [PayPal Security Best Practices](https://developer.paypal.com/docs/security/)