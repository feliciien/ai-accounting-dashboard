import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import type { CashflowData } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import PaywallModal from './payment/PaywallModal';

interface AiRecommendationsProps {
  className?: string;
}

const AiRecommendations: React.FC<AiRecommendationsProps> = ({ className = '' }) => {
  const { rawData } = useFinancial();
  const { uploadLimits } = useAuth();
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only generate recommendations if there's financial data
    if (rawData && rawData.length > 0) {
      setLoading(true);
      
      // Generate a basic recommendation based on the data
      setTimeout(() => {
        generateBasicRecommendation();
        setLoading(false);
      }, 1500); // Simulate AI processing time
    } else {
      setRecommendation(null);
      setLoading(false);
    }
  }, [rawData]);

  const generateBasicRecommendation = () => {
    if (!rawData || rawData.length === 0) return;

    // Calculate some basic metrics
    const totalExpenses = rawData
      .filter((item: CashflowData) => item.type === 'expense' || (item.amount && item.amount < 0))
.reduce((sum: number, item: CashflowData) => sum + Math.abs(Number(item.amount) || 0), 0);

    const totalIncome = rawData
      .filter((item: CashflowData) => item.type === 'income' || (item.amount && item.amount > 0))
.reduce((sum: number, item: CashflowData) => sum + (Number(item.amount) || 0), 0);

    // Get expense categories and their totals
    const expenseCategories: Record<string, number> = {};
    rawData
      .filter((item: CashflowData) => item.type === 'expense' || (item.amount && item.amount < 0))
.forEach((item: CashflowData) => {
        const category = item.category || 'Uncategorized';
        expenseCategories[category] = (expenseCategories[category] || 0) + Math.abs(Number(item.amount) || 0);
      });

    // Find the highest expense category
    let highestCategory = 'Uncategorized';
    let highestAmount = 0;
    
    Object.entries(expenseCategories).forEach(([category, amount]) => {
      if (amount > highestAmount) {
        highestCategory = category;
        highestAmount = amount;
      }
    });

    // Calculate spending percentage
    const spendingPercentage = totalIncome > 0 ? Math.round((highestAmount / totalIncome) * 100) : 0;

    // Generate recommendation
    setRecommendation(
      `You're spending ${spendingPercentage}% of your income on ${highestCategory.toLowerCase()}. Want to see what to cut?`
    );
  };

  const handleUpgradeClick = () => {
    setShowPaywallModal(true);
  };

  if (loading) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary-100 animate-pulse"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return null;
  }

  return (
    <div className={`p-4 bg-primary-50 border border-primary-100 rounded-lg shadow ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-primary-800">AI Recommendation</h3>
          <p className="text-sm text-primary-700 mt-1">{recommendation}</p>
          
          {!uploadLimits.hasPremium && (
            <button
              onClick={handleUpgradeClick}
              className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Upgrade for Full Analysis
            </button>
          )}
        </div>
      </div>

      {/* Paywall Modal */}
      {showPaywallModal && (
        <PaywallModal isOpen={showPaywallModal} onClose={() => setShowPaywallModal(false)} />
      )}
    </div>
  );
};

export default AiRecommendations;