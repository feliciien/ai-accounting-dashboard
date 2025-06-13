import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import type { CashflowData } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import PaywallModal from './payment/PaywallModal';
import { getFinancialInsights } from '../lib/openai';

interface AiRecommendationsProps {
  className?: string;
}

const AiRecommendations: React.FC<AiRecommendationsProps> = ({ className = '' }) => {
  const { rawData } = useFinancial();
  const { uploadLimits } = useAuth();
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchInsights = async () => {
      if (rawData && rawData.length > 0) {
        setLoading(true);
        setError(null);
        setRecommendation(null);
        try {
          const insights = await getFinancialInsights(rawData);
          if (!cancelled) {
            setRecommendation(insights);
          }
        } catch (err: any) {
          if (!cancelled) {
            setError(
              err?.message?.includes("API key") ?
                "AI service is not configured. Please contact support." :
                "Failed to fetch AI insights. Please try again later."
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else {
        setRecommendation(null);
        setError(null);
        setLoading(false);
      }
    };
    fetchInsights();
    return () => { cancelled = true; };
  }, [rawData]);

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

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg shadow ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800">AI Insights Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
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
          <p className="text-sm text-primary-700 mt-1 whitespace-pre-line">{recommendation}</p>
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
