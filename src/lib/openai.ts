import OpenAI from 'openai';

// Types for our financial data
export interface CashflowData {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  description?: string;
}

// Types for chat functionality
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Get OpenAI API key from environment variables
const getApiKey = () => {
  // In development, we can use either OPENAI_API_KEY or REACT_APP_OPENAI_API_KEY
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('No OpenAI API key found. Please set REACT_APP_OPENAI_API_KEY in your .env file');
    return null;
  }
  
  return apiKey;
};

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
    // For development, use the API key directly
    const apiKey = getApiKey();
    
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

// Function to get chat response based on financial context
export async function getChatResponse(message: string, financialData: CashflowData[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a financial AI assistant. Analyze the financial data and provide insights and answers."
        },
        {
          role: "user",
          content: `Financial data: ${JSON.stringify(financialData)}\n\nUser question: ${message}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error('Error getting chat response:', error);
    throw error;
  }
}

export async function getFinancialInsights(financialData: CashflowData[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a financial analyst AI. Analyze the financial data and provide key insights."
        },
        {
          role: "user",
          content: `Please analyze this financial data and provide key insights: ${JSON.stringify(financialData)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "No insights could be generated.";
  } catch (error) {
    console.error('Error getting financial insights:', error);
    throw error;
  }
}
