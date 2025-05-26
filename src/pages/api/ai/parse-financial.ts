/**
 * AI Financial File Parsing API Endpoint
 * 
 * This endpoint interfaces with the Gemini API to parse financial files
 * and extract structured data, categorize transactions, and provide analysis.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getFirebaseAdminAuth } from '../../../utils/firebaseAdmin';
import { trackEvent } from '../../../utils/analytics';

// Initialize Firebase Admin
getFirebaseAdminAuth();

interface ParseRequest {
  prompt: string;
  fileType: 'csv' | 'pdf' | 'excel';
  userId?: string;
}

interface ParseResponse {
  transactions: {
    date: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
    description?: string;
  }[];
  summary: {
    monthlyIncome: number;
    monthlyExpense: number;
    topExpenseCategories: string[];
    warnings?: string[];
  };
  analysis: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, fileType, userId } = req.body as ParseRequest;
    
    // Validate request
    if (!prompt || !fileType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Authenticate user if userId is provided
    if (userId) {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const token = authHeader.split(' ')[1];
        await getFirebaseAdminAuth().verifyIdToken(token);
      } catch (authError) {
        console.error('Authentication error:', authError);
        return res.status(401).json({ error: 'Authentication failed' });
      }
    }
    
    // Track API call
    trackEvent('gemini_api_call', {
      file_type: fileType,
      user_id: userId,
      prompt_length: prompt.length
    });
    
    // Call Gemini API
    const geminiResponse = await callGeminiApi(prompt, fileType);
    
    // Return the parsed data
    return res.status(200).json(geminiResponse);
  } catch (error) {
    console.error('Error parsing financial data:', error);
    return res.status(500).json({ error: 'Failed to parse financial data' });
  }
}

/**
 * Call the Gemini API to parse financial data
 */
async function callGeminiApi(prompt: string, fileType: string): Promise<ParseResponse> {
  // Get API key from environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  
  try {
    // In a real implementation, this would call the actual Gemini API
    // For now, we'll simulate a response based on the file type
    
    // This is a placeholder implementation
    // In production, you would make an actual API call to Gemini
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo purposes, generate a simulated response
    // In production, replace this with actual Gemini API call
    const simulatedResponse = generateSimulatedResponse(fileType);
    
    return simulatedResponse;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to process with Gemini API');
  }
}

/**
 * Generate a simulated response for demo purposes
 * In production, this would be replaced with actual Gemini API call
 */
function generateSimulatedResponse(fileType: string): ParseResponse {
  const currentDate = new Date();
  const lastMonth = new Date(currentDate);
  lastMonth.setMonth(currentDate.getMonth() - 1);
  
  // Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Generate random transactions
  const transactions = [];
  const categories = ['Software Subscriptions', 'Office Supplies', 'Marketing', 'Utilities', 'Rent', 'Salaries'];
  const incomeCategories = ['Sales', 'Consulting', 'Investments'];
  
  // Generate 15-25 random transactions
  const transactionCount = Math.floor(Math.random() * 10) + 15;
  
  for (let i = 0; i < transactionCount; i++) {
    const isIncome = Math.random() > 0.7; // 30% chance of income
    const date = new Date(lastMonth);
    date.setDate(date.getDate() + Math.floor(Math.random() * 30));
    
    transactions.push({
      date: formatDate(date),
      amount: Math.round(Math.random() * 1000 * 100) / 100, // Random amount up to $1000 with 2 decimal places
      category: isIncome ? 
        incomeCategories[Math.floor(Math.random() * incomeCategories.length)] : 
        categories[Math.floor(Math.random() * categories.length)],
      type: isIncome ? 'income' as const : 'expense' as const,
      description: `${fileType.toUpperCase()} imported transaction ${i + 1}`
    });
  }
  
  // Calculate summary
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const monthlyIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Get top expense categories
  const expensesByCategory: Record<string, number> = {};
  expenseTransactions.forEach(t => {
    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
  });
  
  const topExpenseCategories = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);
  
  // Generate warnings if expenses exceed income
  const warnings = [];
  if (monthlyExpense > monthlyIncome) {
    warnings.push('Your expenses exceed your income this month');
  }
  
  // Find the biggest expense category
  let biggestCategory = '';
  let biggestAmount = 0;
  
  Object.entries(expensesByCategory).forEach(([category, amount]) => {
    if (amount > biggestAmount) {
      biggestCategory = category;
      biggestAmount = amount;
    }
  });
  
  // Generate analysis
  const analysis = `Your biggest expense this month is ${biggestCategory} ($${biggestAmount.toFixed(2)}). ${warnings.length > 0 ? warnings[0] + '.' : ''}`;
  
  return {
    transactions,
    summary: {
      monthlyIncome,
      monthlyExpense,
      topExpenseCategories,
      warnings
    },
    analysis
  };
}