/**
 * AI File Parsing Service
 * 
 * This service uses Firebase AI Logic (Gemini API) to enhance file parsing capabilities:
 * - Extract and normalize data from CSV, PDF, Excel files
 * - Automatically categorize expenses and income
 * - Provide short analysis of financial data
 */

import { CashflowData } from '../context/FinancialContext';
import { trackEvent } from '../utils/analytics';
import { conversionTracking } from './ConversionTrackingService';

// Define the response structure from Gemini API
interface GeminiParseResponse {
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

class AiFileParsingService {
  private readonly API_ENDPOINT = '/api/ai/parse-financial';
  
  /**
   * Parse financial data using Gemini API
   * 
   * @param fileContent The content of the file to parse
   * @param fileType The type of file (csv, pdf, excel)
   * @param userId Optional user ID for tracking
   */
  async parseFinancialData(
    fileContent: string,
    fileType: 'csv' | 'pdf' | 'excel',
    userId?: string
  ): Promise<{
    parsedData: CashflowData[];
    analysis: string;
    warnings: string[];
  }> {
    try {
      // Track the start of parsing
      trackEvent('ai_parsing_started', {
        file_type: fileType,
        content_length: fileContent.length,
        user_id: userId
      });
      
      // Prepare the prompt for Gemini
      const prompt = this.buildParsingPrompt(fileContent, fileType);
      
      // Call the API endpoint that interfaces with Gemini
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          fileType,
          userId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result: GeminiParseResponse = await response.json();
      
      // Convert the response to our application's data format
      const parsedData: CashflowData[] = result.transactions.map(transaction => ({
        date: transaction.date,
        amount: transaction.amount,
        category: transaction.category,
        type: transaction.type,
        description: transaction.description
      }));
      
      // Track successful parsing
      trackEvent('ai_parsing_completed', {
        file_type: fileType,
        transactions_count: parsedData.length,
        has_warnings: result.summary.warnings && result.summary.warnings.length > 0,
        user_id: userId
      });
      
      // Track as a conversion event
      if (userId) {
        conversionTracking.trackFileUpload(fileType, fileContent.length, userId);
      }
      
      return {
        parsedData,
        analysis: result.analysis,
        warnings: result.summary.warnings || []
      };
    } catch (error) {
      // Track parsing error
      trackEvent('ai_parsing_error', {
        file_type: fileType,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        user_id: userId
      });
      
      throw error;
    }
  }
  
  /**
   * Build the prompt for Gemini API based on file type
   */
  private buildParsingPrompt(fileContent: string, fileType: string): string {
    return `Parse this financial ${fileType} file and return:
- Transactions with date, amount, and category
- Monthly income/expense summary
- Any negative cash flow warnings

Here's the file content:

${fileContent}`;
  }
  
  /**
   * Get a short analysis of the biggest expense category
   */
  getBiggestExpenseAnalysis(data: CashflowData[]): string {
    if (!data || data.length === 0) {
      return 'No financial data available for analysis.';
    }
    
    // Filter for expenses only
    const expenses = data.filter(item => item.type === 'expense');
    
    if (expenses.length === 0) {
      return 'No expense data available for analysis.';
    }
    
    // Group expenses by category
    const categoryTotals: Record<string, number> = {};
    
    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
    });
    
    // Find the category with the highest total
    let biggestCategory = '';
    let biggestAmount = 0;
    
    Object.entries(categoryTotals).forEach(([category, amount]) => {
      if (amount > biggestAmount) {
        biggestCategory = category;
        biggestAmount = amount;
      }
    });
    
    return `Your biggest expense this month is ${biggestCategory} ($${biggestAmount.toFixed(2)})`;
  }
}

export const aiFileParsingService = new AiFileParsingService();