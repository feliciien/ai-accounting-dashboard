import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinancial } from '../../context/FinancialContext';
import { Link } from 'react-router-dom';
import { conversionTracking } from '../../services/ConversionTrackingService';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionText?: string;
  actionLink?: string;
}

interface OnboardingChecklistProps {
  className?: string;
}

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const { rawData } = useFinancial();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'connect_account',
      title: 'Connect payment account',
      description: 'Link your bank or payment processor to automatically import transactions.',
      completed: false,
      actionText: 'Connect Account',
      actionLink: '/integrations/bank'
    },
    {
      id: 'upload_file',
      title: 'Upload first financial file',
      description: 'Upload a CSV, PDF, or Excel file with your financial data.',
      completed: false,
      actionText: 'Upload File',
      actionLink: '#file-upload'
    },
    {
      id: 'view_insights',
      title: 'View insights',
      description: 'Check out AI-powered insights about your financial data.',
      completed: false,
      actionText: 'View Insights',
      actionLink: '#insights'
    }
  ]);
  
  const [trialInfo, setTrialInfo] = useState(conversionTracking.getTrialInfo());
  
  // Update checklist items based on user state
  useEffect(() => {
    setChecklist(prev => prev.map(item => {
      if (item.id === 'upload_file') {
        return { ...item, completed: rawData.length > 0 };
      }
      if (item.id === 'view_insights') {
        return { ...item, completed: rawData.length > 0 && localStorage.getItem('insights_viewed') === 'true' };
      }
      return item;
    }));
  }, [rawData]);
  
  // Check trial status and update info
  useEffect(() => {
    const interval = setInterval(() => {
      const info = conversionTracking.getTrialInfo();
      setTrialInfo(info);
      
      // Track trial expiring if needed
      if (info.isActive && info.daysRemaining <= 3 && currentUser) {
        conversionTracking.trackTrialExpiring(currentUser.uid);
      }
      
      // Track trial expired if needed
      if (!info.isActive && info.endDate && currentUser) {
        const endDate = new Date(info.endDate);
        const currentDate = new Date();
        const justExpired = currentDate.getTime() - endDate.getTime() < 24 * 60 * 60 * 1000; // Within 24 hours
        
        if (justExpired) {
          conversionTracking.trackTrialExpired(currentUser.uid);
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [currentUser]);
  
  // Mark insights as viewed
  const handleViewInsights = () => {
    localStorage.setItem('insights_viewed', 'true');
    setChecklist(prev => prev.map(item => 
      item.id === 'view_insights' ? { ...item, completed: true } : item
    ));
    
    if (currentUser) {
      conversionTracking.trackConversion('dashboard_visit', {
        section: 'insights'
      }, currentUser.uid);
    }
  };
  
  // Calculate completion percentage
  const completedItems = checklist.filter(item => item.completed).length;
  const completionPercentage = Math.round((completedItems / checklist.length) * 100);
  
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
        <div className="text-sm font-medium text-gray-500">
          {completionPercentage}% Complete
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6">
        <div 
          className="bg-primary-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>
      
      {/* Checklist items */}
      <div className="space-y-4">
        {checklist.map((item) => (
          <div key={item.id} className="flex items-start">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${item.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              {item.completed ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-xs font-medium">{checklist.findIndex(i => i.id === item.id) + 1}</span>
              )}
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                  {item.title}
                </h3>
                {!item.completed && item.actionText && item.actionLink && (
                  <Link 
                    to={item.actionLink} 
                    className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    onClick={item.id === 'view_insights' ? handleViewInsights : undefined}
                  >
                    {item.actionText}
                  </Link>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Trial banner */}
      {trialInfo.isActive && (
        <div className="mt-6 bg-primary-50 border border-primary-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-primary-800">Trial Period</h3>
              <p className="text-xs text-primary-600 mt-1">
                {trialInfo.daysRemaining > 0 
                  ? `${trialInfo.daysRemaining} days remaining in your free trial` 
                  : 'Your trial ends today'}
              </p>
            </div>
            <Link 
              to="/pricing" 
              className="text-xs font-medium px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingChecklist;