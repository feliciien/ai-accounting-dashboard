import { parse, isValid } from 'date-fns';

// Date formats to try parsing
const DATE_FORMATS = [
  'yyyy-MM-dd',
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'MM-dd-yyyy',
  'dd-MM-yyyy',
  'yyyy/MM/dd',
  'dd.MM.yyyy',
  'MM.dd.yyyy'
];

/**
 * Attempts to parse a date string using multiple common formats
 * @param dateStr The date string to parse
 * @returns Date object if successful, null if parsing fails
 */
export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  // First try parsing as ISO string
  const isoDate = new Date(dateStr);
  if (isValid(isoDate)) {
    return isoDate;
  }

  // Try each format in sequence
  for (const formatStr of DATE_FORMATS) {
    try {
      const parsedDate = parse(dateStr, formatStr, new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    } catch {
      continue;
    }
  }

  return null;
};

/**
 * Normalizes amount strings to numbers, handling various formats
 * @param amount The amount string or number to normalize
 * @returns Normalized number
 */
export const normalizeAmount = (amount: string | number): number => {
  if (typeof amount === 'number') return amount;
  
  // Remove currency symbols and whitespace
  const cleanAmount = amount.replace(/[^0-9.-]/g, '');
  
  // Parse as float
  const parsedAmount = parseFloat(cleanAmount);
  
  // Return 0 if parsing fails
  return isNaN(parsedAmount) ? 0 : parsedAmount;
};

// Common expense categories and their keywords
const CATEGORY_KEYWORDS = {
  'Sales': ['revenue', 'sales', 'income', 'payment received'],
  'Salary': ['salary', 'wage', 'payroll'],
  'Consulting': ['consulting', 'service fee', 'professional service'],
  'Office Supplies': ['office', 'supplies', 'stationery'],
  'Rent': ['rent', 'lease', 'property'],
  'Utilities': ['utility', 'electricity', 'water', 'gas', 'internet'],
  'Insurance': ['insurance', 'coverage', 'policy'],
  'Marketing': ['marketing', 'advertising', 'promotion'],
  'Travel': ['travel', 'flight', 'hotel', 'transportation'],
  'Software': ['software', 'subscription', 'license'],
  'Hardware': ['hardware', 'equipment', 'device'],
  'Maintenance': ['maintenance', 'repair', 'service'],
  'Training': ['training', 'education', 'workshop'],
  'Legal': ['legal', 'attorney', 'lawyer'],
  'Banking': ['bank', 'fee', 'charge', 'interest'],
  'Miscellaneous': []
} as const;

/**
 * Suggests a category based on description and amount
 * @param description Transaction description
 * @param amount Transaction amount
 * @returns Suggested category
 */
export const suggestCategory = (description: string, amount: number): string => {
  const lowerDesc = description.toLowerCase();
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword.toLowerCase()))) {
      return category;
    }
  }
  
  // Default categories based on amount
  if (amount > 0) {
    return 'Sales';
  }
  return 'Miscellaneous';
};

/**
 * Detects and handles duplicate transactions
 * @param transactions Array of financial transactions
 * @returns Object containing unique transactions and identified duplicates
 */
export const detectDuplicates = <T extends { date: string; amount: number; description?: string }>(
  transactions: T[]
): { data: T[]; duplicates: T[] } => {
  const seen = new Set<string>();
  const duplicates: T[] = [];
  const uniqueTransactions: T[] = [];

  transactions.forEach(transaction => {
    // Create a unique key for each transaction
    const key = `${transaction.date}_${transaction.amount}_${transaction.description || ''}`;
    
    if (seen.has(key)) {
      duplicates.push(transaction);
    } else {
      seen.add(key);
      uniqueTransactions.push(transaction);
    }
  });

  return {
    data: uniqueTransactions,
    duplicates
  };
};