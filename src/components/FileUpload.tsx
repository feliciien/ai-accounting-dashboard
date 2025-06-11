import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { format, parse } from 'date-fns';
import * as pdfjs from 'pdfjs-dist';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from './auth/AuthModal';
import PaywallModal from './payment/PaywallModal';
import { trackEvent } from '../utils/analytics';
import { parseDate, normalizeAmount, suggestCategory } from '../utils/financialUtils';

// Set the worker source for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Supported file formats and their extensions
const SUPPORTED_FORMATS = {
  CSV: ['.csv'],
  EXCEL: ['.xlsx', '.xls'],
  PDF: ['.pdf']
} as const;

interface FinancialRecord {
  date: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  description?: string;
  reference?: string;
  account?: string;
  currency?: string;
  tags?: string[];
  metadata?: {
    statementType?: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'other';
    section?: string;
    rawText?: string;
  };
}

// Removed unused extractTags function

const FileUpload: React.FC = () => {
  const { rawData, setFinancialData } = useFinancial();
  const { currentUser, checkUploadEligibility, updateUploadLimits } = useAuth();
  const [previewData, setPreviewData] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  // Using a ref instead of state since we don't need to trigger re-renders
  const uploadCompletedRef = useRef(false);
  
  const processFile = useCallback(async (file: File): Promise<FinancialRecord[]> => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (fileType === 'csv') {
        // Process CSV file
        return new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              try {
                const parsedData = results.data.map((row: any) => {
                  const date = parseDate(row.date);
                  const amount = normalizeAmount(row.amount);
                  
                  return {
                    date: date ? format(date, 'yyyy-MM-dd') : '',
                    amount: amount,
                    category: row.category || suggestCategory(row.description || '', amount),
                    description: row.description || '',
                    type: amount >= 0 ? 'income' : 'expense'
                  } as FinancialRecord;
                }).filter(record => record.date && !isNaN(record.amount));
                
                resolve(parsedData);
              } catch (error) {
                reject(new Error(`Failed to process CSV: ${error}`));
              }
            },
            error: (error) => reject(new Error(`Failed to parse CSV: ${error}`))
          });
        });
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        // Process Excel file
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
              const jsonData = XLSX.utils.sheet_to_json(firstSheet);
              
              const parsedData = jsonData.map((row: any) => {
                const date = parseDate(row.date);
                const amount = normalizeAmount(row.amount);
                
                return {
                  date: date ? format(date, 'yyyy-MM-dd') : '',
                  amount: amount,
                  category: row.category || suggestCategory(row.description || '', amount),
                  description: row.description || '',
                  type: amount >= 0 ? 'income' : 'expense'
                } as FinancialRecord;
              }).filter(record => record.date && !isNaN(record.amount));
              
              resolve(parsedData);
            } catch (error) {
              reject(new Error(`Failed to process Excel file: ${error}`));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read Excel file'));
          reader.readAsArrayBuffer(file);
        });
      } else if (fileType === 'pdf') {
        // Process PDF file
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const loadingTask = pdfjs.getDocument(data);
              const pdf = await loadingTask.promise;
              
              let extractedText = '';
              const maxPages = pdf.numPages;
              
              // Extract text from each page
              for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                extractedText += pageText + '\n';
              }
              
              // Try to extract financial data from the text
              // This is a simplified approach - in a real app, you'd use more sophisticated parsing
              const lines = extractedText.split('\n').filter(line => line.trim().length > 0);
              const parsedData: FinancialRecord[] = [];
              
              // Enhanced parsing for financial statements (Balance Sheets, Income Statements)
              // Look for financial statement headers
              const isFinancialStatement = lines.some(line => 
                /balance sheet|income statement|financial statement|profit.+loss|cash flow/i.test(line));
              
              if (isFinancialStatement) {
                // Process as a financial statement
                let statementDate = new Date();
                
                // 1. IMPROVEMENT: Extract statement date from document
                const dateLineRegex = /(?:as of|period ending|fiscal year|year ended|dated)\s*:?\s*(\w+\s+\d{1,2}\s*,?\s*\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/i;
                const dateRangeRegex = /(\w+\s+\d{1,2}\s*,?\s*\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\s*(?:to|-|through)\s*(\w+\s+\d{1,2}\s*,?\s*\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/i;
                
                // Look for date information in the first 20 lines (headers usually at the top)
                for (let i = 0; i < Math.min(20, lines.length); i++) {
                  const line = lines[i];
                  
                  // Check for date range (e.g., "January 1, 2024 - December 31, 2024")
                  const dateRangeMatch = line.match(dateRangeRegex);
                  if (dateRangeMatch) {
                    try {
                      // Use the end date of the range
                      const endDateStr = dateRangeMatch[2];
                      const parsedDate = parse(endDateStr, 'MMMM d, yyyy', new Date());
                      if (!isNaN(parsedDate.getTime())) {
                        statementDate = parsedDate;
                        break;
                      }
                    } catch (e) {
                      // If parsing fails, continue with default date
                      console.log('Failed to parse date range:', e);
                    }
                  }
                  
                  // Check for single date (e.g., "As of December 31, 2024")
                  const dateLineMatch = line.match(dateLineRegex);
                  if (dateLineMatch) {
                    try {
                      const dateStr = dateLineMatch[1];
                      const parsedDate = parse(dateStr, 'MMMM d, yyyy', new Date());
                      if (!isNaN(parsedDate.getTime())) {
                        statementDate = parsedDate;
                        break;
                      }
                    } catch (e) {
                      // If parsing fails, continue with default date
                      console.log('Failed to parse date:', e);
                    }
                  }
                }
                
                const formattedDate = format(statementDate, 'yyyy-MM-dd');
                
                // 2. IMPROVEMENT: Support for multi-column layouts
                // Look for patterns like "Item Name Amount" or "Item Name: Amount"
                // More flexible pattern to handle various formats
                const statementPattern = /([A-Za-z\s&'\-.,()]+)\s*:?\s*([$€£¥]?\s*[\d,.]+(?:\s*[kKmMbBtT])?|\([$€£¥]?\s*[\d,.]+(?:\s*[kKmMbBtT])?\))\b/;
                const currencySymbolPattern = /[$€£¥]/;
                const magnitudePattern = /([\d,.]+)\s*([kKmMbBtT])\b/;
                
                // Determine statement type for categorization
                const isBalanceSheet = lines.some(line => /balance sheet|assets|liabilities|equity/i.test(line));
                const isIncomeStatement = lines.some(line => /income statement|revenue|profit|loss|expenses/i.test(line));
                const isCashFlow = lines.some(line => /cash flow|operating activities|investing activities|financing activities/i.test(line));
                
                // Track current section to improve categorization
                let currentSection = '';
                
                for (const line of lines) {
                  // Update current section when section headers are found
                  if (/^\s*(assets|current assets|non-current assets|fixed assets|liabilities|equity|revenue|expenses|income|operating activities|investing activities|financing activities)\s*$/i.test(line)) {
                    currentSection = line.trim().toLowerCase();
                    continue;
                  }
                  
                  // Skip header lines and total lines
                  if (/^\s*(total|subtotal|balance sheet|income statement|statement|report|notes|fiscal year)/i.test(line)) {
                    continue;
                  }
                  
                  // Match item-amount pairs
                  const matches = line.match(statementPattern);
                  if (matches) {
                    const [, itemName, amountWithCurrency] = matches;
                    
                    // Clean up the amount string
                    let amountStr = amountWithCurrency.replace(currencySymbolPattern, '').trim();
                    
                    // Handle parentheses for negative numbers (common in accounting)
                    const isNegative = amountStr.includes('(') && amountStr.includes(')');
                    if (isNegative) {
                      amountStr = amountStr.replace(/[()]/g, '').trim();
                    }
                    
                    // Handle magnitude indicators (K, M, B, T)
                    const magnitudeMatch = amountStr.match(magnitudePattern);
                    let multiplier = 1;
                    if (magnitudeMatch) {
                      const [, num, magnitude] = magnitudeMatch;
                      amountStr = num;
                      
                      switch(magnitude.toUpperCase()) {
                        case 'K': multiplier = 1000; break;
                        case 'M': multiplier = 1000000; break;
                        case 'B': multiplier = 1000000000; break;
                        case 'T': multiplier = 1000000000000; break;
                      }
                    }
                    
                    let amount = normalizeAmount(amountStr) * multiplier * (isNegative ? -1 : 1);
                    
                    if (!isNaN(amount)) {
                      // Determine category and type based on context
                      let category = itemName.trim();
                      let type: 'income' | 'expense' = 'income';
                      
                      // Use current section to improve categorization
                      const sectionContext = currentSection || 
                        (isBalanceSheet ? 'balance sheet' : 
                         isIncomeStatement ? 'income statement' : 
                         isCashFlow ? 'cash flow' : 'financial statement');
                      
                      // Categorize based on statement type and item name
                      if (isBalanceSheet) {
                        if (/assets|receivable|inventory|cash|equipment|property|prepaid/i.test(category) || 
                            /assets|receivable|inventory|cash|equipment|property|prepaid/i.test(sectionContext)) {
                          type = 'income'; // Assets are positive
                        } else if (/liabilities|payable|debt|loan|tax|overdraft|accrued/i.test(category) || 
                                  /liabilities|payable|debt|loan|tax|overdraft|accrued/i.test(sectionContext)) {
                          type = 'expense'; // Liabilities are negative
                          if (amount > 0) {
                            amount = -amount;
                          }
                        }
                      } else if (isIncomeStatement) {
                        if (/revenue|sales|income|gain/i.test(category) || 
                            /revenue|sales|income|gain/i.test(sectionContext)) {
                          type = 'income';
                        } else if (/expense|cost|salaries|depreciation|tax|cogs|loss/i.test(category) || 
                                  /expense|cost|salaries|depreciation|tax|cogs|loss/i.test(sectionContext)) {
                          type = 'expense';
                          // Ensure expenses are negative
                          if (amount > 0) {
                            amount = -amount;
                          }
                        }
                      } else if (isCashFlow) {
                        // Cash inflows are positive, outflows are negative
                        if (/inflow|received|proceeds|increase/i.test(category)) {
                          type = 'income';
                        } else if (/outflow|paid|payment|decrease|purchase/i.test(category)) {
                          type = 'expense';
                          if (amount > 0) {
                            amount = -amount;
                          }
                        }
                      }
                      
                      // 3. IMPROVEMENT: Add metadata for integration with more sophisticated services
                      const metadata = {
                        statementType: isBalanceSheet ? 'balance_sheet' as const : 
                                      isIncomeStatement ? 'income_statement' as const : 
                                      isCashFlow ? 'cash_flow' as const : 'other' as const,
                        section: currentSection,
                        rawText: line
                      };
                      
                      parsedData.push({
                        date: formattedDate,
                        amount: amount,
                        category: category,
                        description: `From ${isBalanceSheet ? 'Balance Sheet' : 
                                        isIncomeStatement ? 'Income Statement' : 
                                        isCashFlow ? 'Cash Flow Statement' : 'Financial Statement'}`,
                        type: type,
                        metadata // This will be ignored by existing code but available for future enhancements
                      });
                    }
                  }
                }
              } else {
                // Original transaction-based parsing logic
                const datePattern = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/;
                const amountPattern = /\$?\s*\d+(?:[.,]\d{2})?\b/;
                
                for (const line of lines) {
                  const dateMatch = line.match(datePattern);
                  const amountMatch = line.match(amountPattern);
                  
                  if (dateMatch && amountMatch) {
                    const dateStr = dateMatch[0];
                    const amountStr = amountMatch[0].replace('$', '').trim();
                    const amount = normalizeAmount(amountStr);
                    const date = parseDate(dateStr);
                    
                    if (date && !isNaN(amount)) {
                      // Try to extract a description from the line
                      const description = line
                        .replace(dateMatch[0], '')
                        .replace(amountMatch[0], '')
                        .trim();
                      
                      parsedData.push({
                        date: date ? format(date, 'yyyy-MM-dd') : '',
                        amount: amount,
                        category: suggestCategory(description, amount),
                        description: description,
                        type: amount >= 0 ? 'income' : 'expense'
                      });
                    }
                  }
                }
              }
              
              if (parsedData.length > 0) {
                resolve(parsedData);
              } else {
                reject(new Error('Could not extract financial data from PDF. The PDF may not contain recognizable financial records.'));
              }
            } catch (error) {
              reject(new Error(`Failed to process PDF file: ${error}`));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read PDF file'));
          reader.readAsArrayBuffer(file);
        });
      } else {
        throw new Error(`Unsupported file format: ${fileType}`);
      }
    } catch (error: any) {
      throw new Error(`Error processing file: ${error.message}`);
    }
  }, []);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    
    // Track file upload attempt
    trackEvent('file_upload_attempt', {
      file_count: acceptedFiles.length,
      file_types: acceptedFiles.map(file => file.type),
      user_type: currentUser ? 'registered' : 'anonymous'
    });
    
    const eligibility = await checkUploadEligibility();
    if (!eligibility.canUpload) {
      setShowPaywallModal(true);
      uploadCompletedRef.current = false;
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const allData: FinancialRecord[] = [];
      
      for (const file of acceptedFiles) {
        try {
          const processedData = await processFile(file);
          allData.push(...processedData);
        } catch (error: any) {
          console.error(`Error processing file ${file.name}:`, error);
          setError(error.message);
        }
      }
      
      if (allData.length > 0) {
        setPreviewData(allData);
        setFinancialData(allData);
        uploadCompletedRef.current = true;
        
        await updateUploadLimits({
          freeUploadUsed: true,
          lastFreeUpload: new Date().toISOString(),
          hasPremium: false
        });
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, checkUploadEligibility, processFile, setFinancialData, updateUploadLimits]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': SUPPORTED_FORMATS.CSV,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': SUPPORTED_FORMATS.EXCEL,
      'application/vnd.ms-excel': SUPPORTED_FORMATS.EXCEL,
      'application/pdf': SUPPORTED_FORMATS.PDF
    },
    maxFiles: 5,
    maxSize: 5242880, // 5MB
  });
  
  const downloadSampleCSV = useCallback(() => {
    const sampleData: FinancialRecord[] = [
      // Current month transactions
      { date: new Date().toISOString().split('T')[0], amount: 15000, category: 'Revenue', description: 'Monthly subscriptions', type: 'income' },
      { date: new Date().toISOString().split('T')[0], amount: -5000, category: 'Expenses', description: 'Office rent', type: 'expense' },
      { date: new Date().toISOString().split('T')[0], amount: -2000, category: 'Expenses', description: 'Team lunch', type: 'expense' },
      { date: new Date().toISOString().split('T')[0], amount: 8000, category: 'Revenue', description: 'Consulting fees', type: 'income' },
      { date: new Date().toISOString().split('T')[0], amount: -1500, category: 'Expenses', description: 'Software subscriptions', type: 'expense' }
    ];
    
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_financial_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Track sample download event
    trackEvent('sample_csv_download', {
      user_type: currentUser ? 'registered' : 'anonymous',
      timestamp: new Date().toISOString()
    });
  }, [currentUser]);
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const types = Array.from(new Set(previewData.map(record => record.type)));
  const categories = Array.from(new Set(previewData.map(record => record.category)));
  
  const handleTagClick = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newSelectedTags);
    
    // Filter records based on selected tags
    const filteredData = rawData.filter((record: FinancialRecord) => {
      if (newSelectedTags.length === 0) return true;
      return newSelectedTags.includes(record.type) || newSelectedTags.includes(record.category);
    });
    setPreviewData(filteredData.slice(0, 5));
  };

  return (
    <div className="space-y-4">
      {/* Tag filters */}
      <div className="flex flex-wrap gap-2">
        {Array.from(new Set([...types, ...categories])).map(tag => (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors
              ${selectedTags.includes(tag)
                ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }
            `}
          >
            {tag}
          </button>
        ))}
      </div>
      
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
      
      {showPaywallModal && (
        <PaywallModal
          isOpen={showPaywallModal}
          onClose={() => setShowPaywallModal(false)}
        />
      )}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-semibold text-gray-900">Upload Financial Data</h2>
            <p className="text-sm text-gray-600 mt-1">
              "⚡️ See your 90-day cash flow forecast in seconds. No spreadsheet needed."
            </p>
          </div>
          <button
            onClick={downloadSampleCSV}
            className="text-sm px-3 py-1.5 bg-white border border-primary-200 text-primary-700 hover:bg-primary-50 rounded shadow-sm transition-all duration-200 flex items-center"
          >
            Download Sample CSV
          </button>
        </div>
        
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-4 sm:p-6 md:p-8 transition-all duration-300
            ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'}
          `}
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <div className="flex flex-col items-center justify-center">
              <svg
                className={`h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mb-3 md:mb-4 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            
            <p className="text-base sm:text-lg font-medium text-gray-700 mb-1">
              {isDragActive ? "Drop your files here" : "Upload your financial data"}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Drag and drop files, or click to select files
            </p>
            
            <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mt-3 sm:mt-4">
              {Object.entries(SUPPORTED_FORMATS).map(([format, extensions]) => (
                <div key={format} className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700">
                  <span className="font-medium">{format}</span>
                  <span className="ml-1">({extensions.join(', ')})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {isLoading && (
          <div className="mt-4 flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-primary-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-medium text-gray-700">Processing your files...</p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 bg-danger-50 border border-danger-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-danger-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-danger-800">Upload Error</h3>
                <p className="text-sm text-danger-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {previewData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Data Preview</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.slice(0, 5).map((record, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: record.amount >= 0 ? '#047857' : '#DC2626' }}>
                      {record.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-700">
                Showing {Math.min(5, previewData.length)} of {previewData.length} records
              </p>
              <button 
                className="text-sm text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg font-medium flex items-center transition-colors duration-200"
                onClick={() => {
                  // This would typically load more data or export the data
                  alert('Data has been processed and is available in the dashboard');
                }}
              >
                View in Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;