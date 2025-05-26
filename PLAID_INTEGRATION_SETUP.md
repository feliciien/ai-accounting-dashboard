# Plaid Integration Setup Guide

This guide explains how to set up and use the Plaid integration for bank account connectivity in the Workfusion AI Accounting Dashboard.

## Overview

The Plaid integration allows users to:
- Connect their bank accounts securely
- View account balances
- Import transactions
- Track financial activity

## Prerequisites

1. Create a Plaid developer account at [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
2. Create a new Plaid application in the dashboard
3. Obtain your Plaid credentials:
   - Client ID
   - Secret (for sandbox, development, and production environments)

## Configuration

1. Add the following environment variables to your `.env` file:

```
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox  # or development, production
PLAID_REDIRECT_URI=https://yourdomain.com/plaid/oauth-return
```

2. Install the required dependencies:

```bash
npm install plaid react-plaid-link
```

## Integration Flow

1. User clicks "Connect Bank Account" button
2. Plaid Link opens in a secure iframe
3. User selects their bank and provides credentials
4. On successful authentication, Plaid returns a public token
5. Backend exchanges public token for an access token
6. Access token is stored securely in the database
7. Access token is used to fetch account data (balances, transactions)

## API Endpoints

The integration includes the following API endpoints:

- `POST /api/plaid/create-link-token` - Creates a link token for initializing Plaid Link
- `POST /api/plaid/exchange-token` - Exchanges a public token for an access token
- `GET /api/plaid/transactions` - Retrieves user transactions
- `GET /api/plaid/balances` - Retrieves account balances
- `POST /api/plaid/disconnect` - Disconnects a bank account

## Testing

In sandbox mode, you can use Plaid's test credentials:

- For most banks: username `user_good`, password `pass_good`
- For OAuth testing: username `user_oauth`, password `pass_oauth`

## Security Considerations

- Never expose Plaid access tokens to the frontend
- Store tokens securely in your database
- Use environment variables for Plaid credentials
- Implement proper authentication for all API endpoints

## Troubleshooting

- If you encounter CORS issues, ensure your Plaid allowed redirect URIs are configured correctly
- For OAuth banks, make sure your redirect URI is whitelisted in the Plaid dashboard
- Check server logs for detailed error messages from the Plaid API

## Resources

- [Plaid Documentation](https://plaid.com/docs/)
- [react-plaid-link Documentation](https://github.com/plaid/react-plaid-link)