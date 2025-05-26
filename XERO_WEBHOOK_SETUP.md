# Xero Webhook Integration Guide

This guide explains how to set up and use Xero webhooks with the AI Accounting Dashboard to receive real-time notifications when events occur in your Xero account.

## What are Xero Webhooks?

Xero webhooks allow your application to receive real-time notifications when certain events occur in Xero, such as:

- Invoice creation or updates
- Contact creation or updates
- Payment creation
- Bank transaction events

Instead of polling the Xero API regularly, webhooks provide immediate updates, making your application more responsive and efficient.

## Prerequisites

1. A Xero Developer account with an application already set up
2. Your AI Accounting Dashboard application deployed with a publicly accessible HTTPS URL
3. Admin access to your Xero organization

## Setting Up Xero Webhooks

### 1. Generate a Webhook Key

1. Log in to the [Xero Developer Portal](https://developer.xero.com/app/manage)
2. Select your application
3. Navigate to the **Webhooks** tab
4. If this is your first time setting up webhooks, you'll need to generate a webhook key
5. Click on **Generate key** and securely store the key that is displayed

### 2. Configure Your Webhook URL

1. In the Webhooks section of your Xero Developer application, set the **Delivery URL** to:
   ```
   https://your-domain.com/api/integrations/xero/webhook
   ```
   Replace `your-domain.com` with your actual domain where the AI Accounting Dashboard is hosted.

2. Select the event types you want to subscribe to. We recommend:
   - Invoices (created, updated)
   - Contacts (created, updated)
   - Payments (created)

3. Save your webhook configuration

### 3. Update Your Environment Variables

Add the webhook key to your application's `.env` file:

```
REACT_APP_XERO_WEBHOOK_KEY=your-webhook-key-from-xero
```

### 4. Deploy Your Application

Ensure your application is deployed with the updated environment variables.

## How Webhooks Work in the AI Accounting Dashboard

When an event occurs in Xero:

1. Xero sends a POST request to your webhook URL with event details
2. Our application verifies the webhook signature using your webhook key
3. The application processes the event and updates the relevant data in Firestore
4. Your dashboard automatically reflects the changes

## Webhook Payload Example

```json
{
  "events": [
    {
      "resourceUrl": "https://api.xero.com/api.xro/2.0/Invoices/12345678-aaaa-bbbb-cccc-123456789012",
      "eventDateUtc": "2023-05-15T19:00:00Z",
      "eventType": "Invoice.created",
      "tenantId": "your-tenant-id"
    }
  ]
}
```

## Troubleshooting

### Webhook Not Receiving Events

1. Verify your webhook URL is publicly accessible and uses HTTPS
2. Check that the webhook key in your `.env` file matches the one in the Xero Developer Portal
3. Ensure your application is correctly processing webhook requests
4. Check the server logs for any errors related to webhook processing

### Invalid Signature Errors

If you're seeing "Invalid signature" errors:

1. Confirm you're using the correct webhook key
2. Ensure your webhook endpoint is correctly verifying the signature
3. Check if there are any middleware components that might be modifying the request body before it reaches your webhook handler

## Security Considerations

- Always verify the webhook signature to ensure requests are coming from Xero
- Store your webhook key securely and never expose it in client-side code
- Use HTTPS for your webhook endpoint
- Implement proper error handling to avoid exposing sensitive information in error responses

## Additional Resources

- [Xero Webhooks Documentation](https://developer.xero.com/documentation/guides/webhooks/overview/)
- [Xero API Reference](https://developer.xero.com/documentation/api/api-overview)
- [Xero Developer Community](https://community.xero.com/developer/)