# AI Accounting Dashboard

## Overview

AI Accounting Dashboard is a powerful financial management tool that leverages artificial intelligence to provide real-time insights, forecasting, and optimization for your business finances. The platform helps businesses automate financial data processing, gain actionable insights, and make data-driven decisions.

## Framework Decision

**Important**: This project uses **React with React Router** as the primary framework, with an Express backend server. The Next.js configuration is kept for future migration possibilities, but is not actively used.

### Key Features

- **AI-Powered Financial Analysis**: Get intelligent insights and recommendations based on your financial data
- **Multi-format Data Import**: Upload financial data from CSV, Excel, or PDF files
- **Integration Ecosystem**: Connect with Xero, PayPal, Stripe, and banking platforms
- **Cash Flow Forecasting**: Predict future cash positions with AI-driven forecasting
- **Anomaly Detection**: Automatically identify unusual transactions and potential issues
- **Interactive Chat Assistant**: Ask questions about your finances in natural language
- **Mobile-Responsive Design**: Access your financial dashboard from any device

## Integrations

This application supports integration with various financial platforms:

- [Xero Integration Setup Guide](XERO_INTEGRATION_SETUP.md) - How to connect your Xero account
- [Xero Webhook Setup Guide](XERO_WEBHOOK_SETUP.md) - How to set up real-time data synchronization with webhooks
- [PayPal Integration Setup Guide](PAYPAL_INTEGRATION_SETUP.md) - Connect your PayPal account
- [Stripe Integration Setup Guide](STRIPE_INTEGRATION_SETUP.md) - Connect your Stripe account

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account with Firestore enabled
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies: `npm install --legacy-peer-deps`
3. Create a `.env` file based on `.env.example` with all required Firebase and OpenAI credentials
4. Start the Express server: `npm run server` (in one terminal)
5. Start the React development server: `npm start` (in another terminal)

### Using the Application

1. Create an account or log in
2. Connect your financial accounts or upload financial data
3. Explore the dashboard to view insights and recommendations
4. Use the AI assistant to ask questions about your finances

### Firebase Configuration

Ensure your Firebase project is properly configured:

1. Enable Firestore in your Firebase project
2. Set up Authentication with your preferred providers
3. Update the security rules in the Firebase Console to match the rules in `firestore.rules`
4. Configure the Firebase Admin SDK with a service account key

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the React app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run server:simple`

Starts a simplified Express backend server on port 3001.\
This server provides mock API endpoints needed by the React frontend without OpenAI dependencies.

**Important**: You must run both the React app (`npm start`) and the Express server (`npm run server:simple`) simultaneously for the application to function correctly.

### `npm run dev:server:simple`

Starts the simplified Express backend server with nodemon for automatic reloading when server files change.

### `npm run server`

Starts the full Express backend server on port 3001 (requires all dependencies to be properly configured).

### `npm run dev:server`

Starts the full Express backend server with nodemon for automatic reloading when server files change.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
