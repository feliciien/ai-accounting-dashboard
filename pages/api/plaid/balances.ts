import { NextApiRequest, NextApiResponse } from 'next';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );
  
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Ensure Plaid environment variables are properly typed as strings
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || '';
const PLAID_SECRET = process.env.PLAID_SECRET || '';
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

// Check if required Plaid credentials are available
if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
  console.error('Missing Plaid API credentials. Please check your environment variables.');
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);
const db = getFirestore();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get the user's Plaid access token from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.plaid?.access_token || !userData.plaid.connected) {
      return res.status(400).json({ error: 'Bank account not connected' });
    }

    const accessToken = userData.plaid.access_token;

    // Get account balances from Plaid
    const balancesResponse = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    });

    // Format the accounts for our frontend
    const accounts = balancesResponse.data.accounts.map((account: any) => ({
      account_id: account.account_id,
      account_name: account.name || account.official_name || `Account ${account.mask}`,
      account_type: account.type,
      account_subtype: account.subtype,
      available: account.balances.available || 0,
      current: account.balances.current || 0,
      limit: account.balances.limit,
      currency: account.balances.iso_currency_code || 'USD',
      mask: account.mask,
    }));

    return res.status(200).json({ accounts });
  } catch (error) {
    console.error('Error fetching balances:', error);
    return res.status(500).json({ error: 'Failed to fetch account balances' });
  }
}