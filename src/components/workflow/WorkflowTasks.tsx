import React, { useState, useEffect } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { reconcileAccounts, parseFinancialDocument, estimateTaxes } from '../../lib/agents';
import { parseCSV, parseExcel, parsePDF, CashflowData } from '../../utils/fileParser';

interface TaskMessage {
  text: string;
  sender: 'bot' | 'user';
  isLoading?: boolean;
}

// Base task component with shared functionality
const BaseTask = ({
  initialMessage,
}: {
  initialMessage: string;
}) => {
  const [messages, setMessages] = useState<TaskMessage[]>([
    { text: initialMessage, sender: 'bot' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return {
    messages,
    setMessages,
    isProcessing,
    setIsProcessing,
    messagesEndRef,
    scrollToBottom
  };
};

// ReconcileBot Component
export const ReconcileTask: React.FC = () => {
  const { rawData } = useFinancial();
  const taskProps = BaseTask({
    initialMessage: "Let's reconcile your accounts. I'll fetch data from your connected sources.",
  });
  const { messages, setMessages, isProcessing, setIsProcessing, messagesEndRef } = taskProps;

  const handleReconciliation = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setMessages(prev => [...prev, 
      { text: "Begin reconciliation", sender: 'user' },
      { text: "Analyzing transactions...", sender: 'bot', isLoading: true }
    ]);

    try {
      const result = await reconcileAccounts(
        rawData,
        rawData, // For demo, using same data for both sources
        { start: '2023-01-01', end: '2023-12-31' }
      );
      
      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      
      if (result.status === 'error' || !result.data) {
        throw new Error(result.error || 'Reconciliation failed');
      }

      const reconciliationData = result.data;
      
      // Add result messages
      setMessages(prev => [
        ...prev,
        { text: "✅ Reconciliation complete!", sender: 'bot' },
        { text: `Found ${reconciliationData.summary.totalMatched} matching transactions`, sender: 'bot' },
        { text: `${reconciliationData.summary.totalDiscrepancies} discrepancies identified`, sender: 'bot' }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev.filter(msg => !msg.isLoading),
        { text: "❌ Error during reconciliation. Please try again.", sender: 'bot' }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                msg.sender === 'user'
                  ? 'bg-primary-100 text-primary-900'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">
                {msg.isLoading ? (
                  <span className="flex items-center">
                    {msg.text}
                    <span className="ml-2 flex space-x-1">
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </span>
                ) : (
                  msg.text
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex space-x-2">
        <button
          onClick={handleReconciliation}
          className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Start Reconciliation'
          )}
        </button>
      </div>
    </div>
  );
};

// TaxBot Component
export const TaxEstimateTask: React.FC = () => {
  const { rawData } = useFinancial();
  const taskProps = BaseTask({
    initialMessage: "Let's calculate your tax estimate. I'll analyze your income and expenses to provide a projection."
  });
  const { messages, setMessages, isProcessing, setIsProcessing, messagesEndRef } = taskProps;
  const [result, setResult] = useState<any>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    const now = new Date();
    return `Q${Math.floor(now.getMonth() / 3) + 1}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const handleStartEstimation = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setMessages(prev => [...prev, 
      { text: `Calculate tax estimate for ${selectedQuarter} ${selectedYear}`, sender: 'user' },
      { text: "Analyzing your financial data...", sender: 'bot', isLoading: true }
    ]);

    try {
      const response = await estimateTaxes(rawData, selectedQuarter, selectedYear);
      
      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      setResult(response.data);
      
      // Add tax bracket message with animation delay
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          text: `Based on your financial data, you're in the ${response.data?.taxBracket ?? 'unknown'} tax bracket.`, 
          sender: 'bot' 
        }]);

        // Add tax estimate details with animation delay
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            text: `Your estimated tax for ${selectedQuarter} ${selectedYear} is $${(response.data?.estimatedTax ?? 0).toFixed(2)}.`, 
            sender: 'bot' 
          }]);

          // Add breakdown
          const breakdown = response.data.breakdown;
          setTimeout(() => {
            setMessages(prev => [...prev, { 
              text: `Here's how I calculated this:
• Total Income: $${(breakdown?.income ?? 0).toFixed(2)}
• Deductions: $${(breakdown?.deductions ?? 0).toFixed(2)}
• Taxable Income: $${(breakdown?.taxableIncome ?? 0).toFixed(2)}
• Effective Tax Rate: ${((breakdown?.effectiveRate ?? 0) * 100).toFixed(1)}%`, 
              sender: 'bot' 
            }]);
          }, 500);
        }, 500);
      }, 500);

    } catch (error) {
      setMessages(prev => [
        ...prev.filter(msg => !msg.isLoading),
        { text: "❌ Error calculating tax estimate. Please try again.", sender: 'bot' }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Period Selection */}
      <div className="flex space-x-4 mb-4">
        <div className="flex-1">
          <label htmlFor="quarter" className="block text-sm font-medium text-gray-700 mb-1">
            Quarter
          </label>
          <select
            id="quarter"
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            disabled={isProcessing}
          >
            <option value="Q1">Q1 (Jan-Mar)</option>
            <option value="Q2">Q2 (Apr-Jun)</option>
            <option value="Q3">Q3 (Jul-Sep)</option>
            <option value="Q4">Q4 (Oct-Dec)</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <select
            id="year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            disabled={isProcessing}
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                msg.sender === 'user'
                  ? 'bg-primary-100 text-primary-900'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">
                {msg.isLoading ? (
                  <span className="flex items-center">
                    {msg.text}
                    <span className="ml-2 flex space-x-1">
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </span>
                ) : (
                  msg.text
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Button */}
      <div className="flex space-x-2">
        <button
          onClick={handleStartEstimation}
          className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Calculate Tax Estimate'
          )}
        </button>
      </div>

      {/* Results Summary */}
      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-md border border-gray-200">
              <p className="text-xs text-gray-500">Tax Bracket</p>
              <p className="text-lg font-medium text-gray-900">{result?.taxBracket ?? 'N/A'}</p>
            </div>
            <div className="p-3 bg-white rounded-md border border-gray-200">
              <p className="text-xs text-gray-500">Estimated Tax</p>
              <p className="text-lg font-medium text-primary-600">
                ${(result?.estimatedTax ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ParserBot Component
export const ParserTask: React.FC = () => {
  const taskProps = BaseTask({
    initialMessage: "I'll help you parse and analyze your financial documents.",
  });
  const { messages, setMessages, isProcessing, setIsProcessing, messagesEndRef } = taskProps;

  const handleFileUpload = async (file: File) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setMessages(prev => [...prev, 
      { text: `Parsing ${file.name}`, sender: 'user' },
      { text: "Analyzing document...", sender: 'bot', isLoading: true }
    ]);

    try {
      const fileType = file.name.split('.').pop()?.toLowerCase() || '';
      let parsedData: CashflowData[] = [];
      
      // Use appropriate parser based on file type
      switch (fileType) {
        case 'csv':
          const csvResult = await parseCSV(file);
          parsedData = csvResult.data;
          break;
        case 'xlsx':
          const excelResult = await parseExcel(file);
          parsedData = excelResult.data;
          break;
        case 'pdf':
          const pdfResult = await parsePDF(file);
          parsedData = pdfResult.data;
          break;
        default:
          throw new Error('Unsupported file type');
      }
      
      const result = await parseFinancialDocument(parsedData, fileType);
      
      setMessages(prev => prev.filter(msg => !msg.isLoading));
      setMessages(prev => [
        ...prev,
        { text: "✅ Document parsed successfully!", sender: 'bot' },
        { text: `Found ${result.data?.length || 0} transactions`, sender: 'bot' }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev.filter(msg => !msg.isLoading),
        { text: "❌ Error parsing document. Please try again.", sender: 'bot' }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                msg.sender === 'user'
                  ? 'bg-primary-100 text-primary-900'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">
                {msg.isLoading ? (
                  <span className="flex items-center">
                    {msg.text}
                    <span className="ml-2 flex space-x-1">
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </span>
                ) : (
                  msg.text
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex space-x-2">
        <input
          type="file"
          accept=".csv,.xlsx,.pdf"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="file-upload"
          className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-center cursor-pointer"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Upload Document'
          )}
        </label>
      </div>
    </div>
  );
};