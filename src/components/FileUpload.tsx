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
}

// Removed unused extractTags function

const FileUpload: React.FC = () => {
  const { setFinancialData } = useFinancial();
  const { currentUser, checkUploadEligibility, updateUploadLimits } = useAuth();
  const [previewData, setPreviewData] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  
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
    const sampleData = [
      { date: '2023-01-01', amount: 1000, category: 'Sales', description: 'Monthly revenue' },
      { date: '2023-01-02', amount: -50, category: 'Office Supplies', description: 'Office materials' },
      { date: '2023-01-03', amount: 500, category: 'Consulting', description: 'Consulting fees' }
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
  
  return (
    <div className="space-y-6">
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
              Import your financial records for analysis and forecasting
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
            border-2 border-dashed rounded-xl p-8 transition-all duration-300
            ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'}
          `}
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <div className="flex flex-col items-center justify-center">
              <svg
                className={`h-12 w-12 mb-4 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`}
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
            
            <p className="text-lg font-medium text-gray-700 mb-1">
              {isDragActive ? "Drop your files here" : "Upload your financial data"}
            </p>
            <p className="text-sm text-gray-500">
              Drag and drop files, or click to select files
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {Object.entries(SUPPORTED_FORMATS).map(([format, extensions]) => (
                <div key={format} className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700">
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