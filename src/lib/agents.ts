import OpenAI from 'openai';
import { CashflowData } from './openai';

// Initialize OpenAI client with proper security configuration
const openai = (() => {
  // In production, we should never expose API keys in the browser
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Return a client that will use server-side endpoints instead of direct API calls
    return {
      chat: {
        completions: {
          create: async (params: any) => {
            try {
              const response = await fetch('/api/ai/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to get AI agent response from server');
              }
              
              return response.json();
            } catch (error) {
              console.error('Error in agent client:', error);
              throw error;
            }
          }
        }
      }
    } as unknown as OpenAI;
  } else {
    // For development, use the API key directly
    const apiKey = process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      // Return a dummy client that logs errors instead of making API calls
      return {
        chat: {
          completions: {
            create: async () => {
              throw new Error('OpenAI API key not configured. Please check your environment variables.');
            }
          }
        }
      } as unknown as OpenAI;
    }
    
    return new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Only in development
    });
  }
})();

// Types for agent responses
export interface AgentResponse {
  message: string;
  data?: any;
  error?: string;
  status: 'loading' | 'success' | 'error';
}

export interface ReconciliationResult {
  matches: Array<{
    source: string;
    target: string;
    amount: number;
    date: string;
    matched: boolean;
    reason?: string;
  }>;
  discrepancies: Array<{
    source: string;
    amount: number;
    date: string;
    reason: string;
    suggestion?: string;
  }>;
  summary: {
    totalMatched: number;
    totalUnmatched: number;
    totalDiscrepancies: number;
  };
}

export interface ParsedExpenseResult {
  data: CashflowData[];
  summary: {
    totalExpenses: number;
    totalIncome: number;
    topCategories: Array<{ category: string; amount: number }>;
    anomalies: Array<{ category: string; amount: number; reason: string }>;
  };
}

export interface TaxEstimateResult {
  taxBracket: string;
  estimatedTax: number;
  suggestedBuffer: number;
  breakdown: {
    income: number;
    deductions: number;
    taxableIncome: number;
    effectiveRate: number;
  };
  notes: string[];
}

// ReconcileBot - handles account reconciliation
export async function reconcileAccounts(
  bankData: CashflowData[],
  accountingData: CashflowData[],
  dateRange: { start: string; end: string }
): Promise<AgentResponse> {
  try {
    // Prepare data for the AI
    const prompt = `You are ReconcileBot, a financial reconciliation assistant.
    
I need to reconcile my bank transactions with my accounting records for the period ${dateRange.start} to ${dateRange.end}.
    
Bank Data: ${JSON.stringify(bankData.slice(0, 20))}
    
Accounting Data: ${JSON.stringify(accountingData.slice(0, 20))}
    
Please analyze these transactions and:
    1. Match transactions between the two sources
    2. Identify any discrepancies or missing transactions
    3. Suggest adjustments or corrections
    4. Provide a summary of the reconciliation
    
Format your response as JSON with the following structure:
    {
      "matches": [array of matched transactions],
      "discrepancies": [array of discrepancies with reasons],
      "summary": {statistics about the reconciliation}
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are ReconcileBot, an AI assistant specialized in financial reconciliation. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message.content || '{}';
    const result = JSON.parse(content) as ReconciliationResult;

    return {
      message: "Reconciliation completed successfully.",
      data: result,
      status: 'success'
    };
  } catch (error: any) {
    console.error('Error in reconciliation:', error);
    return {
      message: "Failed to reconcile accounts.",
      error: error.message || 'Unknown error occurred',
      status: 'error'
    };
  }
}

// ParserBot - handles parsing and analyzing expense files
export async function parseFinancialDocument(
  parsedData: any[],
  fileType: string
): Promise<AgentResponse> {
  try {
    const prompt = `You are ParserBot, a financial document analysis assistant.
    
I've uploaded a ${fileType} file with financial data. Here's the parsed content:
    
${JSON.stringify(parsedData.slice(0, 30))}
    
Please analyze this data and:
    1. Extract all transactions including date, amount, category, and type (income/expense)
    2. Categorize transactions if categories are missing
    3. Identify any anomalies or unusual transactions
    4. Provide a summary of the data
    
Format your response as JSON with the following structure:
    {
      "data": [array of standardized transactions],
      "summary": {statistics and insights about the data}
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are ParserBot, an AI assistant specialized in financial document analysis. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message.content || '{}';
    const result = JSON.parse(content) as ParsedExpenseResult;

    return {
      message: "Document parsed successfully.",
      data: result,
      status: 'success'
    };
  } catch (error: any) {
    console.error('Error parsing document:', error);
    return {
      message: "Failed to parse financial document.",
      error: error.message || 'Unknown error occurred',
      status: 'error'
    };
  }
}

// TaxBot - handles tax estimation
export async function estimateTaxes(
  financialData: CashflowData[],
  quarter: string,
  year: string,
  country: string = 'US'
): Promise<AgentResponse> {
  try {
    // Calculate income and expenses
    const income = financialData
      ?.filter(item => item.type === 'income')
      ?.reduce((sum, item) => sum + (item?.amount || 0), 0) || 0;

    const expenses = financialData
      ?.filter(item => item.type === 'expense')
      ?.reduce((sum, item) => sum + Math.abs(item?.amount || 0), 0) || 0;

    const prompt = `You are TaxBot, a tax estimation assistant.
    
I need to estimate my taxes for ${quarter} ${year} in ${country}.
    
Financial Summary:
    - Total Income: $${income.toFixed(2)}
    - Total Expenses: $${expenses.toFixed(2)}
    - Net Profit: $${(income - expenses).toFixed(2)}
    
Detailed Transactions: ${JSON.stringify(financialData.slice(0, 20))}
    
Please provide:
    1. My estimated tax bracket
    2. Estimated tax amount due
    3. Suggested buffer amount to set aside
    4. Breakdown of the calculation
    5. Any tax planning notes or recommendations
    
Format your response as JSON with the following structure:
    {
      "taxBracket": "string",
      "estimatedTax": number,
      "suggestedBuffer": number,
      "breakdown": {calculation details},
      "notes": [array of recommendations]
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are TaxBot, an AI assistant specialized in tax estimation. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message.content || '{}';
    const result = JSON.parse(content) as TaxEstimateResult;

    return {
      message: "Tax estimation completed successfully.",
      data: result,
      status: 'success'
    };
  } catch (error: any) {
    console.error('Error estimating taxes:', error);
    return {
      message: "Failed to estimate taxes.",
      error: error.message || 'Unknown error occurred',
      status: 'error'
    };
  }
}