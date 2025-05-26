import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import * as pdfjs from 'pdfjs-dist';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from './auth/AuthModal';
import PaywallModal from './payment/PaywallModal';
import { convertCurrency } from '../utils/currencyConverter';
import { aiFileParsingService } from '../services/AiFileParsingService';
import { readFileAsText } from '../utils/fileUtils';
import { conversionTracking } from '../services/ConversionTrackingService';
import { trackEvent } from '../utils/analytics';
import { parseDate, normalizeAmount, suggestCategory, detectDuplicates } from '../utils/financialUtils';

// Set the worker source for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Supported file formats and their extensions
const SUPPORTED_FORMATS = {
  CSV: ['.csv'],
  EXCEL: ['.xlsx', '.xls'],
  QUICKBOOKS: ['.qbo', '.qfx'],
  PDF: ['.pdf']
} as const;

const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'] as const;

interface FinancialRecord {
  date: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  description?: string;
  reference?: string;
  account?: string;
  currency?: string;
  status?: 'pending' | 'completed' | 'failed';
  tags?: string[];
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

interface PreprocessingOptions {
  categorize: boolean;
  normalizeAmounts: boolean;
  detectDuplicates: boolean;
  validateDates: boolean;
  convertCurrency: boolean;
  extractTags: boolean;
}

// Sample data with enhanced fields
const sampleData: FinancialRecord[] = [
  { 
    date: '2025-01-01', 
    amount: 1000.00, 
    category: 'Sales', 
    type: 'income', 
    description: 'Monthly revenue',
    currency: 'USD',
    status: 'completed',
    tags: ['recurring', 'revenue']
  },
  { 
    date: '2025-01-02', 
    amount: -50.00, 
    category: 'Office Supplies', 
    type: 'expense', 
    description: 'Office materials',
    currency: 'USD',
    status: 'completed',
    tags: ['office', 'supplies']
  },
  { 
    date: '2025-01-03', 
    amount: 500.00, 
    category: 'Consulting', 
    type: 'income', 
    description: 'Consulting fees',
    currency: 'USD',
    status: 'completed',
    tags: ['consulting', 'revenue']
  }
];

const validateFinancialRecord = (record: Partial<FinancialRecord>, index: number): ValidationResult => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Date validation
  if (!record.date) {
    errors.push(`Row ${index + 2}: Missing date`);
  } else if (new Date(record.date) > new Date()) {
    warnings.push(`Row ${index + 2}: Future date detected`);
  }

  // Amount validation
  if (record.amount === undefined || record.amount === null) {
    errors.push(`Row ${index + 2}: Missing amount`);
  } else if (record.amount === 0) {
    warnings.push(`Row ${index + 2}: Zero amount detected`);
  }

  // Category validation
  if (!record.category) {
    errors.push(`Row ${index + 2}: Missing category`);
  }

  // Currency validation
  if (record.currency && !CURRENCY_CODES.includes(record.currency as typeof CURRENCY_CODES[number])) {
    warnings.push(`Row ${index + 2}: Unsupported currency code "${record.currency}". Will use USD.`);
  }

  // Tags validation
  if (record.tags && !Array.isArray(record.tags)) {
    warnings.push(`Row ${index + 2}: Invalid tags format. Tags should be comma-separated.`);
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
};

const extractTags = (description: string): string[] => {
  // Extract hashtags
  const hashTags = (description.match(/#[\w-]+/g) || [])
    .map(tag => tag.substring(1));
  
  // Extract common business terms
  const text = description.toLowerCase();
  const commonTags = [
    'invoice', 'payment', 'salary', 'rent', 'utility',
    'subscription', 'refund', 'tax', 'insurance'
  ].filter(term => text.includes(term));
  
  // Use Array.from to fix Set iteration
  return Array.from(new Set([...hashTags, ...commonTags]));
};

const FileUpload: React.FC = () => {
  const { setFinancialData } = useFinancial();
  const { currentUser, checkUploadEligibility, updateUploadLimits } = useAuth();
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [uploadBlocked, setUploadBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<'login_required' | 'upgrade_required' | 'monthly_limit_reached'>();
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAnonymousPrompt, setShowAnonymousPrompt] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [preprocessingOptions, setPreprocessingOptions] = useState<PreprocessingOptions>({
    categorize: true,
    normalizeAmounts: true,
    detectDuplicates: true,
    validateDates: true,
    convertCurrency: true,
    extractTags: true
  });
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [uploadStats, setUploadStats] = useState<{
    totalFiles: number;
    processedFiles: number;
    successfulUploads: number;
    failedUploads: number;
  }>({
    totalFiles: 0,
    processedFiles: 0,
    successfulUploads: 0,
    failedUploads: 0
  });

  const downloadSampleCSV = useCallback(() => {
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

    // Show registration prompt for anonymous users
    if (!currentUser && !hasInteracted) {
      setHasInteracted(true);
      setShowAnonymousPrompt(true);
    }
  }, [currentUser, hasInteracted, setHasInteracted, setShowAnonymousPrompt]);



  
  const processExcelFile = useCallback(async (file: File): Promise<FinancialRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first worksheet
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          if (!firstSheet) {
            throw new Error('Excel file is empty');
          }

          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          if (!jsonData || jsonData.length < 2) {
            throw new Error('Excel file must contain at least a header row and one data row');
          }

          // Get headers from first row and normalize them
          const headers = (jsonData[0] as string[]).map(h => String(h).trim().toLowerCase());
          const requiredFields = ['date', 'amount', 'category'];
          const missingFields = requiredFields.filter(field => 
            !headers.some(h => h.includes(field)));

          if (missingFields.length > 0) {
            throw new Error(`Missing required columns: ${missingFields.join(', ')}`);
          }

          // Process data rows
          const parsedData = jsonData.slice(1).map((row: any, index) => {
            const record: { [key: string]: any } = {};
            headers.forEach((header, i) => {
              record[header] = row[i];
            });

            const date = parseDate(record.date);
            const amount = normalizeAmount(record.amount);

            if (!date) {
              throw new Error(`Invalid date format in row ${index + 2}`);
            }

            return {
              date: format(date, 'yyyy-MM-dd'),
              amount: amount,
              category: preprocessingOptions.categorize && record.description ? 
                suggestCategory(String(record.description || ''), amount) : 
                (record.category || 'Uncategorized'),
              description: String(record.description || ''),
              type: amount >= 0 ? 'income' as const : 'expense' as const,
              reference: record.reference || undefined,
              account: record.account || undefined,
              currency: record.currency || 'USD',
              status: record.status || 'completed',
              tags: record.tags ? String(record.tags).split(',').map(t => t.trim()) : undefined
            };
          });

          if (parsedData.length === 0) {
            throw new Error('No valid data rows found in Excel file');
          }

          if (preprocessingOptions.detectDuplicates) {
            const { data } = detectDuplicates(parsedData);
            resolve(data);
          } else {
            resolve(parsedData);
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }, [preprocessingOptions]);

  const processCsvFile = useCallback(async (file: File): Promise<FinancialRecord[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: async (results) => {
          try {
            // Validate results object first
            if (!results || !Array.isArray(results.data)) {
              throw new Error('Invalid file format');
            }

            let parsedData = results.data
              .map((row: any) => {
                if (!row) return null;
                
                const date = row.date ? parseDate(row.date) : null;
                const amount = row.amount ? normalizeAmount(row.amount) : 0;
                
                if (!date) {
                  throw new Error('Invalid date format');
                }

                return {
                  date: format(date, 'yyyy-MM-dd'),
                  amount: amount,
                  category: preprocessingOptions.categorize && row.description ? 
                    suggestCategory(String(row.description || ''), amount) : 
                    (row.category || 'Uncategorized'),
                  description: String(row.description || ''),
                  type: amount >= 0 ? 'income' as const : 'expense' as const
                } as FinancialRecord;
              })
              .filter((row): row is FinancialRecord => row !== null);

            if (parsedData.length === 0) {
              throw new Error('No valid data found in file');
            }

            if (preprocessingOptions.detectDuplicates) {
              const { data, duplicates } = detectDuplicates<FinancialRecord>(parsedData);
              if (duplicates.length > 0) {
                console.warn(`Found ${duplicates.length} duplicate entries`);
              }
              parsedData = data;
            }

            resolve(parsedData);
          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) => {
          reject(new Error(`Failed to parse file: ${error.message}`));
        },
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase(),
        transform: (value: string) => value ? value.trim() : value
      });
    });
  }, [preprocessingOptions]);

  const processPdfFile = async (file: File): Promise<FinancialRecord[]> => {
    return new Promise((resolve, reject) => {
      const errors: string[] = [];
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          // Use PDF.js to parse the PDF in the browser
          const loadingTask = pdfjs.getDocument(arrayBuffer);
          const pdf = await loadingTask.promise;
          let textContent = '';
          // Extract text from all pages
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            textContent += strings.join(' ') + '\n';
          }
          const lines = textContent.split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0);
          const parsedData: FinancialRecord[] = [];
          let currentRecord: Partial<FinancialRecord> = {};
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            // Try to extract date
            const datePatterns = [
              /(Date|Transaction Date|Posting Date):?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})/i,
              /([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/,
              /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+[0-9]{1,2},\s+[0-9]{4}/i
            ];
            let foundDate = '';
            for (const pattern of datePatterns) {
              const match = line.match(pattern);
              if (match) {
                foundDate = match[2] || match[1];
                // Validate foundDate before using
                const parsedDate = parseDate(foundDate);
                if (!parsedDate) {
                  errors.push(`Invalid date format found in PDF: '${foundDate}'. Supported formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY`);
                  foundDate = '';
                } else {
                  foundDate = format(parsedDate, 'yyyy-MM-dd');
                }
                break;
              }
            }
            if (!foundDate) {
              // No date found in line; skip adding record here
            } else {
              if (Object.keys(currentRecord).length > 0) {
                parsedData.push(currentRecord as FinancialRecord);
              }
              currentRecord = { date: format(new Date(foundDate), 'yyyy-MM-dd') };
              continue;
            }
            // Try to extract amount (support various formats)
            const amountMatch = line.match(/[-+]?\$?\s*\d+(?:,\d{3})*(?:\.\d{2})?/);
            if (amountMatch && amountMatch[0]) {
              if (!currentRecord.amount) {
                currentRecord.amount = normalizeAmount(amountMatch[0]);
                continue;
              }
            }
            // Try to extract category from common patterns
            if (!currentRecord.category) {
              const commonCategories = [
                'income', 'expense', 'salary', 'rent', 'utility',
                'supplies', 'travel', 'maintenance', 'insurance'
              ];
              const foundCategory = commonCategories.find(cat => 
                line.toLowerCase().includes(cat));
              if (foundCategory) {
                currentRecord.category = foundCategory;
                currentRecord.description = line;
              }
            }
          }
          // Add last record if exists
          if (Object.keys(currentRecord).length > 0) {
            parsedData.push(currentRecord as FinancialRecord);
          }
          if (errors.length > 0) {
            reject(new Error(errors.join('\n')));
            return;
          }
          resolve(parsedData);
        } catch (error: unknown) {
          reject(error instanceof Error ? error : new Error('Failed to parse PDF'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processFile = useCallback(async (file: File): Promise<any[]> => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    try {
      let data: any[];
      let fileContent = '';
      let fileTypeForAi: 'csv' | 'excel' | 'pdf' = 'csv';
      
      switch (fileType) {
        case 'xlsx':
        case 'xls':
          fileTypeForAi = 'excel';
          data = await processExcelFile(file);
          // For AI processing, convert to CSV format
          fileContent = convertToCSVFormat(data);
          break;
        case 'csv':
          fileTypeForAi = 'csv';
          // Try AI parsing first
          try {
            fileContent = await readFileAsText(file);
            const aiResult = await aiFileParsingService.parseFinancialData(
              fileContent,
              fileTypeForAi,
              currentUser?.uid
            );
            data = aiResult.parsedData;
            setSuccessMessage(aiResult.analysis || 'File processed successfully with AI assistance.');
            // Track AI parsing success
            if (currentUser) {
              conversionTracking.trackFileUpload(
                file.type,
                file.size,
                currentUser.uid
              );
            }
          } catch (aiError) {
            console.warn('AI parsing failed, falling back to traditional parsing:', aiError);
            data = await processCsvFile(file);
          }
          break;
        case 'qbo':
        case 'qfx':
          throw new Error('QuickBooks file support coming soon');
        case 'pdf':
          fileTypeForAi = 'pdf';
          try {
            // For PDF, we need special handling
            data = await processPdfFile(file);
            // Also try AI enhancement
            const pdfText = await extractTextFromPdf(file);
            const aiResult = await aiFileParsingService.parseFinancialData(
              pdfText,
              fileTypeForAi,
              currentUser?.uid
            );
            if (aiResult.parsedData.length > 0) {
              data = aiResult.parsedData;
              setSuccessMessage(aiResult.analysis || 'PDF processed with AI assistance.');
            }
          } catch (error) {
            console.error('PDF processing error:', error);
            throw new Error(`Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          break;
        default:
          throw new Error('Unsupported file format');
      }

      // Post-process the data
      const processedData = await Promise.all(data.map(async (record, index) => {
        const validation = validateFinancialRecord(record, index);
        if (!validation.isValid) {
          throw new Error(validation.errors[0]); // Throw first error
        }

        // Convert currency if needed
        if (preprocessingOptions.convertCurrency && record.currency && record.currency !== 'USD') {
          try {
            record.amount = await convertCurrency(
              record.amount,
              record.currency,
              'USD'
            );
            record.currency = 'USD';
          } catch (error) {
            console.warn(`Failed to convert currency for row ${index + 2}:`, error);
          }
        }

        // Extract tags if enabled
        if (preprocessingOptions.extractTags && record.description) {
          record.tags = extractTags(record.description);
        }

        return record;
      }));

      return processedData;
    } catch (error: any) {
      throw new Error(`Error processing ${file.name}: ${error.message}`);
    }
  }, [currentUser, preprocessingOptions, setSuccessMessage, processCsvFile, processExcelFile]);
  
  // Convert data to CSV format for AI processing
  const convertToCSVFormat = (data: any[]): string => {
    const headers = Object.keys(data[0] || {});
    const rows = data.map(item => {
      return headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value);
      }).join(',');
    });
    
    return [
      headers.join(','),
      ...rows
    ].join('\n');
  };
  
  // Extract text from PDF for AI processing
  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const loadingTask = pdfjs.getDocument(arrayBuffer);
          const pdf = await loadingTask.promise;
          let textContent = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            textContent += strings.join(' ') + '\n';
          }
          
          resolve(textContent);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!currentUser) {
      setShowAuthModal(true);
      setHasInteracted(true);
      return;
    }
    // Track file upload attempt
    trackEvent('file_upload_attempt', {
      file_count: acceptedFiles.length,
      file_types: acceptedFiles.map(file => file.type),
      user_type: currentUser ? 'registered' : 'anonymous'
    });

    // Show anonymous user prompt after first interaction
    if (!currentUser && !hasInteracted) {
      setHasInteracted(true);
      setShowAnonymousPrompt(true);
    }
    if (!currentUser) {
      setShowAuthModal(true);
      setBlockReason('login_required');
      setUploadBlocked(true);
      return;
    }

    const eligibility = await checkUploadEligibility();
    if (!eligibility.canUpload) {
      setUploadBlocked(true);
      setBlockReason(eligibility.reason as 'login_required' | 'upgrade_required' | 'monthly_limit_reached');
      if (eligibility.reason === 'upgrade_required' || eligibility.reason === 'monthly_limit_reached') {
        setShowPaywallModal(true);
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);
    setUploadQueue(acceptedFiles);
    setUploadStats({
      totalFiles: acceptedFiles.length,
      processedFiles: 0,
      successfulUploads: 0,
      failedUploads: 0
    });

    try {
      const allData: any[] = [];
      for (const file of acceptedFiles) {
        try {
          const processedData = await processFile(file);
          allData.push(...processedData);
          setProcessedFiles(prev => [...prev, file.name]);
          setUploadStats(prev => ({
            ...prev,
            processedFiles: prev.processedFiles + 1,
            successfulUploads: prev.successfulUploads + 1
          }));
        } catch (error: any) {
          console.error(`Error processing file ${file.name}:`, error);
          setUploadStats(prev => ({
            ...prev,
            processedFiles: prev.processedFiles + 1,
            failedUploads: prev.failedUploads + 1
          }));
        }
        // Cap the progress percentage at 100%
        const progressPercentage = Math.min(100, (uploadStats.processedFiles / uploadStats.totalFiles) * 100);
        setUploadProgress(progressPercentage);
      }

      if (allData.length > 0) {
        setPreviewData(allData.slice(0, 5));
      setFinancialData(allData);

      await updateUploadLimits({
        freeUploadUsed: true,
        lastFreeUpload: new Date().toISOString(),
        hasPremium: false
      });
      
      // Show upgrade prompt after successful free upload if not premium
      if (!currentUser?.isPremium) {
        setTimeout(() => {
          setUploadBlocked(true);
          setBlockReason('upgrade_required');
        }, 2000);
      }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
      setUploadQueue([]);
    }
  }, [currentUser, checkUploadEligibility, setFinancialData, updateUploadLimits, processFile, uploadStats.processedFiles, uploadStats.totalFiles, hasInteracted]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': SUPPORTED_FORMATS.CSV,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': SUPPORTED_FORMATS.EXCEL,
      'application/vnd.ms-excel': SUPPORTED_FORMATS.EXCEL,
      'application/x-quickbooks': SUPPORTED_FORMATS.QUICKBOOKS,
      'application/pdf': SUPPORTED_FORMATS.PDF
    },
    maxFiles: 10,
    maxSize: 10485760, // Increased to 10MB
    onDropRejected: (fileRejections) => {
      const error = fileRejections[0]?.errors[0];
      if (error.code === 'file-too-large') {
        setError('File is too large. Maximum size is 10MB.');
      } else if (error.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload a supported file format.');
      } else {
        setError('Error uploading file. Please try again.');
      }
    }
  });

  const PreprocessingControls: React.FC<{
    options: PreprocessingOptions;
    onChange: (options: PreprocessingOptions) => void;
  }> = ({ options, onChange }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        className={`px-2 py-1 text-xs rounded ${
          options.categorize ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
        }`}
        onClick={() => onChange({ ...options, categorize: !options.categorize })}
      >
        Auto-categorize
      </button>
      <button
        className={`px-2 py-1 text-xs rounded ${
          options.detectDuplicates ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
        }`}
        onClick={() => onChange({ ...options, detectDuplicates: !options.detectDuplicates })}
      >
        Detect Duplicates
      </button>
      <button
        className={`px-2 py-1 text-xs rounded ${
          options.normalizeAmounts ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
        }`}
        onClick={() => onChange({ ...options, normalizeAmounts: !options.normalizeAmounts })}
      >
        Normalize Amounts
      </button>
      <button
        className={`px-2 py-1 text-xs rounded ${
          options.convertCurrency ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
        }`}
        onClick={() => onChange({ ...options, convertCurrency: !options.convertCurrency })}
      >
        Convert Currency
      </button>
      <button
        className={`px-2 py-1 text-xs rounded ${
          options.extractTags ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
        }`}
        onClick={() => onChange({ ...options, extractTags: !options.extractTags })}
      >
        Extract Tags
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Anonymous User Prompt */}
      {showAnonymousPrompt && !currentUser && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-primary-800">👋 Want to save your progress and unlock more features?</h3>
              <div className="mt-2 text-sm text-primary-700">
                <p>Create a free account in 30 seconds to:</p>
                <ul className="mt-1 list-disc list-inside">
                  <li>Save and access your uploaded files</li>
                  <li>Get AI-powered financial insights</li>
                  <li>Track your business metrics</li>
                </ul>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Create Account
                </button>
                <button
                  onClick={() => setShowAnonymousPrompt(false)}
                  className="ml-3 text-sm text-primary-600 hover:text-primary-500"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => {
            setShowAuthModal(false);
            // If user was trying to upload, show paywall after login
            if (blockReason === 'login_required') {
              setTimeout(() => {
                setShowPaywallModal(true);
                setBlockReason('upgrade_required');
              }, 500);
            }
          }} 
        />
      )}
      
      {showPaywallModal && (
        <PaywallModal
          isOpen={showPaywallModal}
          onClose={() => {
            setShowPaywallModal(false);
            // Reset upload blocked state if user upgraded
            if (currentUser?.isPremium) {
              setUploadBlocked(false);
              setBlockReason(undefined);
            }
          }}
        />
      )}
      
      {uploadBlocked && (
        <div className="rounded-lg bg-amber-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.873-1.512 3.157-1.512 4.03 0l8.485 14.14c.873 1.512-.218 3.407-2.015 3.407H2.015c-1.797 0-2.888-1.895-2.015-3.407l8.485-14.14zM10 5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                {blockReason === 'login_required' 
                  ? 'Authentication Required' 
                  : 'Upload Limit Reached'
                }
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  {blockReason === 'login_required'
                    ? 'Please log in to upload files.'
                    : "You've reached your upload limit. Upgrade to premium for unlimited uploads."
                  }
                </p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    onClick={() => blockReason === 'login_required' ? setShowAuthModal(true) : setShowPaywallModal(true)}
                    className="rounded-md bg-amber-50 px-2 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:ring-offset-amber-50"
                  >
                    {blockReason === 'login_required' ? 'Log In' : 'Upgrade'}
                  </button>
                  <button
                    onClick={() => setUploadBlocked(false)}
                    className="ml-3 rounded-md bg-amber-50 px-2 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:ring-offset-amber-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Upload Financial Data</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload your financial data in supported formats with date, amount, and category columns
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setPreprocessingOptions(prev => ({...prev, categorize: !prev.categorize}))}
            className={`text-sm px-3 py-1 rounded ${
              preprocessingOptions.categorize ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Auto-categorize
          </button>
          <button
            onClick={downloadSampleCSV}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Download Sample
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-danger-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-danger-800">Upload Error</h3>
              <div className="mt-2 text-sm text-danger-700">
                <p>{error}</p>
                <p className="mt-1">
                  Need help? <button onClick={downloadSampleCSV} className="underline">Download a sample CSV</button> to see the correct format.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadBlocked && blockReason === 'upgrade_required' && !showPaywallModal && (
        <div className="rounded-lg bg-primary-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-primary-800">Want to upload more files?</h3>
              <div className="mt-2 text-sm text-primary-700">
                <p>You've used your free upload. Upgrade to premium for unlimited uploads and advanced features.</p>
                <div className="mt-3 flex space-x-4">
                  <button
                    onClick={() => setShowPaywallModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Upgrade Now
                  </button>
                  <button
                    onClick={() => setUploadBlocked(false)}
                    className="inline-flex items-center px-4 py-2 border border-primary-300 text-sm font-medium rounded-md text-primary-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-200
          ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'}
          ${isDragAccept ? 'border-success-400 bg-success-50' : ''}
          ${isDragReject ? 'border-danger-400 bg-danger-50' : ''}
          ${uploadBlocked ? 'opacity-75 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <svg
            className={`mx-auto h-12 w-12 transition-colors duration-200 ${
              isDragActive ? 'text-primary-400' : 'text-gray-400'
            }`}
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
          <div className="flex text-sm text-gray-600 mt-4">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500"
            >
              <span>Upload files</span>
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">
            Supported formats: CSV, Excel (.xlsx, .xls), QuickBooks (.qbo, .qfx), PDF (up to 10MB each)
          </p>
          {uploadQueue.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">Processing {uploadQueue.length} files...</p>
              <p className="text-xs text-gray-500">
                {uploadStats.processedFiles} / {uploadStats.totalFiles} files processed
              </p>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center w-2/3">
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, uploadProgress)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                Processing files ({Number.isNaN(uploadProgress) ? 0 : Math.min(100, Math.round(uploadProgress))}%)
              </p>
              {uploadStats.failedUploads > 0 && (
                <p className="text-xs text-danger-600 mt-2">
                  {uploadStats.failedUploads} file(s) failed to process
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {previewData.length > 0 && !error && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700">Processing Options</h3>
              <PreprocessingControls options={preprocessingOptions} onChange={setPreprocessingOptions} />
            </div>
            {processedFiles.length > 0 && (
              <div className="text-xs text-gray-500">
                Successfully processed: {processedFiles.join(', ')}
              </div>
            )}
            {successMessage && (
              <div className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-700">
                <p className="font-medium">AI Analysis:</p>
                <p>{successMessage}</p>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(previewData[0]).map(key => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {Object.values(row).map((value: any, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {value instanceof Date 
                          ? value.toLocaleDateString() 
                          : typeof value === 'number'
                            ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                            : String(value)
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;