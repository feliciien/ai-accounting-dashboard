import { NextApiRequest, NextApiResponse } from 'next';
import { CashflowData } from '../../../lib/openai';
import { ReconciliationResult, ParsedExpenseResult, TaxEstimateResult } from '../../../lib/agents';

// Mock data for demo purposes
const mockBankData: CashflowData[] = [
  { date: '2023-05-01', amount: 5000, category: 'Salary', type: 'income' },
  { date: '2023-05-05', amount: -120, category: 'Utilities', type: 'expense' },
  { date: '2023-05-10', amount: -85, category: 'Groceries', type: 'expense' },
  { date: '2023-05-15', amount: 1200, category: 'Freelance', type: 'income' },
  { date: '2023-05-20', amount: -250, category: 'Rent', type: 'expense' },
];

const mockAccountingData: CashflowData[] = [
  { date: '2023-05-01', amount: 5000, category: 'Salary', type: 'income' },
  { date: '2023-05-05', amount: -120, category: 'Utilities', type: 'expense' },
  { date: '2023-05-12', amount: -85, category: 'Office Supplies', type: 'expense' }, // Discrepancy in category
  { date: '2023-05-15', amount: 1000, category: 'Freelance', type: 'income' }, // Discrepancy in amount
  // Missing rent transaction
];

// Handler for reconciliation agent
export async function reconcileHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { dateRange } = req.body;
    
    // In a real app, you would fetch data from actual sources
    // For demo, we'll use mock data with intentional discrepancies
    const bankData = dateRange ? mockBankData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    }) : mockBankData;
    
    const accountingData = dateRange ? mockAccountingData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    }) : mockAccountingData;
    
    // Process filtered data for reconciliation
    const matches = bankData.filter(bank => 
      accountingData.some(acc => 
        acc.date === bank.date && 
        acc.amount === bank.amount && 
        acc.category === bank.category
      )
    ).map(match => ({
      source: 'Bank',
      target: 'Accounting',
      amount: match.amount,
      date: match.date,
      matched: true
    }));

    const discrepancies = bankData.filter(bank => 
      !accountingData.some(acc => 
        acc.date === bank.date && 
        acc.amount === bank.amount && 
        acc.category === bank.category
      )
    ).map(mismatch => ({
      source: 'Bank',
      amount: mismatch.amount,
      date: mismatch.date,
      reason: `Discrepancy found in ${mismatch.category} transaction`,
      suggestion: `Verify and update accounting records for ${mismatch.category} transaction on ${mismatch.date}`
    }));

    const result: ReconciliationResult = {
      matches,
      discrepancies,
      summary: {
        totalMatched: matches.length,
        totalUnmatched: discrepancies.length,
        totalDiscrepancies: discrepancies.length
      }
    };
    
    res.status(200).json({
      message: "Reconciliation completed successfully.",
      data: result,
      status: 'success'
    });
  } catch (error: any) {
    console.error('Error in reconciliation:', error);
    res.status(500).json({
      message: "Failed to reconcile accounts.",
      error: error.message || 'Unknown error occurred',
      status: 'error'
    });
  }
}

// Handler for document parsing agent
export async function parseDocumentHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { parsedData, fileType } = req.body;
    
    // Log file type for debugging and future file type specific processing
    console.log(`Processing document of type: ${fileType}`);
    
    // Simulate AI processing
    const result: ParsedExpenseResult = {
      data: parsedData.map((item: any) => ({
        date: item.date || new Date().toISOString().split('T')[0],
        amount: parseFloat(item.amount) || 0,
        category: item.category || 'Uncategorized',
        type: parseFloat(item.amount) > 0 ? 'income' : 'expense'
      })),
      summary: {
        totalExpenses: parsedData
          .filter((item: any) => parseFloat(item.amount) < 0)
          .reduce((sum: number, item: any) => sum + Math.abs(parseFloat(item.amount)), 0),
        totalIncome: parsedData
          .filter((item: any) => parseFloat(item.amount) > 0)
          .reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0),
        topCategories: [
          { category: 'Rent', amount: 1200 },
          { category: 'Utilities', amount: 450 },
          { category: 'Groceries', amount: 350 },
          { category: 'Entertainment', amount: 200 },
          { category: 'Transportation', amount: 150 }
        ],
        anomalies: [
          { 
            category: 'Office Supplies', 
            amount: 500, 
            reason: 'Unusually high amount compared to historical average of $75'
          },
          { 
            category: 'Travel', 
            amount: 1500, 
            reason: 'New category not seen in previous months'
          }
        ]
      }
    };
    
    res.status(200).json({
      message: "Document parsed successfully.",
      data: result,
      status: 'success'
    });
  } catch (error: any) {
    console.error('Error parsing document:', error);
    res.status(500).json({
      message: "Failed to parse financial document.",
      error: error.message || 'Unknown error occurred',
      status: 'error'
    });
  }
}

// Handler for tax estimation agent
export async function taxEstimateHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { financialData, quarter, year, country } = req.body;
    
    // Apply regional tax rules based on country
    const taxRules = country === 'US' ? {
      brackets: [
        { threshold: 10000, rate: 0.10 },
        { threshold: 40000, rate: 0.12 },
        { threshold: 85000, rate: 0.22 },
        { threshold: 160000, rate: 0.24 },
        { threshold: 200000, rate: 0.32 },
        { threshold: 500000, rate: 0.35 },
        { threshold: Infinity, rate: 0.37 }
      ],
      quarterMultiplier: quarter === 'Q4' ? 1 : 0.25, // Adjust for quarterly estimates
      yearAdjustment: parseInt(year) === new Date().getFullYear() ? 1 : 0.9 // Historical adjustment
    } : {
      // Default international tax rules
      brackets: [{ threshold: Infinity, rate: 0.20 }],
      quarterMultiplier: 0.25,
      yearAdjustment: 1
    };
    
    // Calculate income and expenses from provided data
    const income = financialData
      .filter((item: CashflowData) => item.type === 'income')
      .reduce((sum: number, item: CashflowData) => sum + item.amount, 0);
    
    const expenses = financialData
      .filter((item: CashflowData) => item.type === 'expense')
      .reduce((sum: number, item: CashflowData) => sum + Math.abs(item.amount), 0);
    
    const taxableIncome = income - expenses;
    
    // Apply tax rules based on income level
    const applicableBracket = taxRules.brackets.find(bracket => taxableIncome <= bracket.threshold) || taxRules.brackets[taxRules.brackets.length - 1];
    const taxRate = applicableBracket.rate;
    const taxBracket = `${(taxRate * 100).toFixed(0)}%`;
    
    // Apply quarterly and yearly adjustments
    const adjustedTaxRate = taxRate * taxRules.quarterMultiplier * taxRules.yearAdjustment;
    
    const estimatedTax = taxableIncome * adjustedTaxRate; // Use adjusted rate for more accurate quarterly/yearly estimates
    const suggestedBuffer = estimatedTax * 1.1; // 10% buffer
    
    const result: TaxEstimateResult = {
      taxBracket,
      estimatedTax,
      suggestedBuffer,
      breakdown: {
        income,
        deductions: expenses,
        taxableIncome,
        effectiveRate: income > 0 ? estimatedTax / income : 0
      },
      notes: [
        'Consider maximizing retirement contributions to reduce taxable income',
        'Track business expenses carefully to ensure all deductions are captured',
        'Set aside quarterly estimated tax payments to avoid underpayment penalties',
        'Review potential tax credits that may apply to your situation'
      ]
    };
    
    res.status(200).json({
      message: "Tax estimation completed successfully.",
      data: result,
      status: 'success'
    });
  } catch (error: any) {
    console.error('Error estimating taxes:', error);
    res.status(500).json({
      message: "Failed to estimate taxes.",
      error: error.message || 'Unknown error occurred',
      status: 'error'
    });
  }
}

// Main API route handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  switch (action) {
    case 'reconcile':
      return reconcileHandler(req, res);
    case 'parse-expense':
      return parseDocumentHandler(req, res);
    case 'tax-estimate':
      return taxEstimateHandler(req, res);
    default:
      return res.status(400).json({ message: 'Invalid action' });
  }
}