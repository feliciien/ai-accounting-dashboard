# Stripe Integration Setup Guide

This guide will help you set up the Stripe integration for the AI Accounting Dashboard.

## Prerequisites

1. A Stripe account (create one at [stripe.com](https://dashboard.stripe.com) if you don't have one)
2. Access to the Stripe Dashboard to create API keys

## Step 1: Create a Stripe Connect Application

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** > **Connect Settings**
3. Under **Integration** section, set up your platform:
   - Add a name for your platform
   - Add a description
   - Upload a logo (optional)
   - Set your website URL
4. Under **OAuth settings**, add the following redirect URI:
   - `http://localhost:3000/api/stripe/callback` (for local development)
   - `https://yourdomain.com/api/stripe/callback` (for production)
5. Save your changes

## Step 2: Get Your API Keys

1. In the Stripe Dashboard, go to **Developers** > **API keys**
2. Note down your **Secret key** (starts with `sk_`)
3. Go back to **Connect Settings** and note down your **Client ID** (starts with `ca_`)

## Step 3: Configure Environment Variables

1. Open your project's `.env` file (or create one based on `.env.example`)
2. Add the following environment variables:

```
REACT_APP_STRIPE_CLIENT_ID=your-stripe-client-id
REACT_APP_STRIPE_SECRET_KEY=your-stripe-secret-key
```

3. Replace the placeholder values with your actual Stripe credentials

## Step 4: Install Required Dependencies

Make sure you have the Stripe SDK installed:

```bash
npm install stripe
# or
yarn add stripe
```

## Step 5: Test the Integration

1. Start your development server
2. Navigate to `/integrations/stripe` in your application
3. Click the "Connect Stripe Account" button
4. You should be redirected to Stripe's authorization page
5. Authorize the connection
6. You should be redirected back to your application with a success message

## Stripe Integration Features

Once connected, the integration provides:

1. **Balance Information**: View your available and pending Stripe balance
2. **Transaction History**: View recent payments processed through Stripe
3. **Account Information**: See when your Stripe account was connected

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**: Ensure the redirect URI in your Stripe Connect settings exactly matches the callback URL in your application
2. **Invalid Credentials**: Double-check your Client ID and Secret Key
3. **Connection Errors**: Ensure your application can reach the Stripe API (no network/firewall issues)

### Stripe API Rate Limits

Be aware that Stripe has [rate limits](https://stripe.com/docs/rate-limits) for API requests. Design your application to handle potential rate limiting gracefully.

## Security Considerations

1. **Never expose your Stripe Secret Key** in client-side code
2. All Stripe API calls should be made from your server-side code
3. Implement proper authentication to ensure only authorized users can access Stripe data
4. Store Stripe tokens securely in your database

## Additional Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Connect OAuth Reference](https://stripe.com/docs/connect/oauth-reference)