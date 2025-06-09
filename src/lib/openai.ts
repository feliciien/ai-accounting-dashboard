import OpenAI from 'openai';

// Types for our financial data
export interface CashflowData {
  date: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
}

// Types for chat functionality
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

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
              const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
              });
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to get AI response from server');
              }
              
              return response.json();
            } catch (error) {
              console.error('Error in OpenAI client:', error);
              throw error;
            }
          }
        }
      }
    } as unknown as OpenAI;
  } else {
    // For development or server-side code, use the API key directly
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured. Please set REACT_APP_OPENAI_API_KEY in your environment variables.');
    }
    
    return new OpenAI({
      apiKey: process.env.REACT_APP_OPENAI_API_KEY,
      dangerouslyAllowBrowser: process.env.NODE_ENV !== 'production',
    });
  }
})();

// Function to get chat response based on financial context
export async function getChatResponse(message: string, financialData: CashflowData[]): Promise<string> {
  try {
    // Calculate financial context
    const totals = financialData.reduce(
      (acc, curr) => {
        if (curr.type === 'income') acc.income += curr.amount;
        else acc.expenses += curr.amount;
        return acc;
      },
      { income: 0, expenses: 0 }
    );

    const categoryTotals = financialData.reduce((acc, curr) => {
      const key = `${curr.type}-${curr.category}`;
      acc[key] = (acc[key] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a financial assistant analyzing the following financial data:
- Total income: $${totals.income.toFixed(2)}
- Total expenses: $${totals.expenses.toFixed(2)}
- Net cash flow: $${(totals.income - totals.expenses).toFixed(2)}
- Categories: ${Object.entries(categoryTotals)
            .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`)
            .join(', ')}

Provide specific, data-driven answers to questions about this financial data.`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message.content || "I'm unable to provide an answer at this time.";
  } catch (error: any) {
    console.error('Error getting chat response:', error);
    if (error?.message?.includes('API key')) {
      throw new Error('API configuration error. Please check your API key settings.');
    }
    throw error;
  }
}

export async function getFinancialInsights(financialData: CashflowData[]): Promise<string> {
  try {
    // Calculate total income and expenses
    const totals = financialData.reduce(
      (acc, curr) => {
        if (curr.type === 'income') acc.income += curr.amount;
        else acc.expenses += curr.amount;
        return acc;
      },
      { income: 0, expenses: 0 }
    );

    // Group by category
    const categoryTotals = financialData.reduce((acc, curr) => {
      const key = `${curr.type}-${curr.category}`;
      acc[key] = (acc[key] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    const prompt = `Analyze this financial data and provide 3-5 specific insights and recommendations. Consider:
- Total income: $${totals.income.toFixed(2)}
- Total expenses: $${totals.expenses.toFixed(2)}
- Net cash flow: $${(totals.income - totals.expenses).toFixed(2)}
- Top categories by volume: ${Object.entries(categoryTotals)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`)
  .join(', ')}

Provide insights as bullet points, focusing on:
- Spending patterns and anomalies
- Budget optimization opportunities
- Cash flow management recommendations
- Tax planning considerations`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a financial analyst providing actionable insights based on accounting data. Focus on practical, specific recommendations."
        },
        {
          role: "user",
          content: `${prompt}\n\nDetailed Data:\n${JSON.stringify(financialData, null, 2)}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message.content || 'No insights available';
  } catch (error: any) {
    console.error('Error getting financial insights:', error);
    // Handle specific error cases
    if (error?.message?.includes('API key')) {
      return 'API configuration error. Please check your API key settings.';
    } else if (error?.httpStatus === 403) {
      return 'Permission error. Please verify your API access permissions.';
    }
    return 'Error analyzing financial data';
  }
}