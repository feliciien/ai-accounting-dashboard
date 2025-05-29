import React, { useRef } from 'react';
import FileUpload from './FileUpload';
import AiRecommendations from './AiRecommendations';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { getFinancialInsights } from '../../src/lib/openai';
import { generateForecast } from '../lib/forecast';
import { detectAnomalies, AnomalyAlert } from '../lib/anomalyDetection';
import AlertBanner from './AlertBanner';
import ChatBox from './ChatBox';
import OptimizationRecommendations from './OptimizationRecommendations';
import AuthModal from './auth/AuthModal';
import Sidebar from './Sidebar';
import { ReconcileTask, ParserTask, TaxEstimateTask } from './workflow/WorkflowTasks';
import Testimonials from './Testimonials';
import OnboardingChecklist from './onboarding/OnboardingChecklist';
import { conversionTracking, TrialInfo } from '../services/ConversionTrackingService';
import { trackEvent } from '../utils/analytics';
import CashFlowForecast from './CashFlowForecast';
import SubscriptionBanner from './SubscriptionBanner';
import SubscriptionCTA from './SubscriptionCTA';


const Dashboard: React.FC = () => {
  const { chartData, rawData } = useFinancial();
  const { currentUser, logout, uploadLimits } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'overview' | 'tasks' | 'insights'>('overview');
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showChatBox, setShowChatBox] = React.useState(false);
  const [trialInfo, setTrialInfo] = React.useState<TrialInfo>(conversionTracking.getTrialInfo());
  const [sessionStartTime] = React.useState<number>(Date.now());
  const [hasInteracted, setHasInteracted] = React.useState(false);
  const visitTracked = useRef<boolean>(false);

  // Handle user interaction
  React.useEffect(() => {
    const handleInteraction = () => setHasInteracted(true);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Toggle chat box visibility
  const toggleChatBox = () => {
    setShowChatBox(!showChatBox);
    if (!showChatBox) {
      trackEvent('chat_box_opened', {
        page: 'dashboard',
        user_type: currentUser ? 'registered' : 'anonymous',
        trigger: hasInteracted ? 'user_action' : 'auto_popup'
      });
    }
  };

  // Handle chat box close
  const handleChatClose = () => {
    setShowChatBox(false);
    trackEvent('chat_box_closed', {
      page: 'dashboard',
      user_type: currentUser ? 'registered' : 'anonymous'
    });
  };
  // ForecastData interface removed - using the one from forecast.ts

  const [alerts, setAlerts] = React.useState<AnomalyAlert[]>([]);

  React.useEffect(() => {
    if (chartData.length > 0) {
      const forecast = generateForecast(chartData);
      
      // Detect anomalies when data changes
      const anomalies = detectAnomalies(rawData, forecast);
      setAlerts(anomalies);
      
      // Track file upload conversion if this is new data
      if (currentUser && rawData.length > 0 && !visitTracked.current) {
        conversionTracking.trackFileUpload(
          'financial_data', 
          JSON.stringify(rawData).length, 
          currentUser.uid
        );
      }
    }
  }, [chartData, rawData, currentUser]);
  
  // Track dashboard visit duration
  React.useEffect(() => {
    // Check trial status periodically
    const trialCheckInterval = setInterval(() => {
      setTrialInfo(conversionTracking.getTrialInfo());
    }, 60000); // Check every minute
    
    // Track visit on component unmount
    return () => {
      clearInterval(trialCheckInterval);
      
      // Calculate visit duration in seconds
      const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      
      // Only track if visit is longer than 5 seconds
      if (durationSeconds > 5) {
        conversionTracking.trackDashboardVisit(
          durationSeconds,
          currentUser?.uid
        );
        visitTracked.current = true;
      }
    };
  }, [sessionStartTime, currentUser]);

interface WorkflowTask {
  id: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  component?: React.ReactNode;
}

const [aiSuggestions, setAiSuggestions] = React.useState<string[]>([]);
const [tasks, setTasks] = React.useState<WorkflowTask[]>([
  { id: 1, title: 'Monthly account reconciliation', status: 'pending', component: <ReconcileTask /> },
  { id: 2, title: 'Upload Q1 expense CSV', status: 'pending', component: <ParserTask /> },
  { id: 3, title: 'Review tax estimate', status: 'pending', component: <TaxEstimateTask /> }
]);

React.useEffect(() => {
  const updateAiSuggestions = async () => {
    if (chartData.length > 0) {
      const insights = await getFinancialInsights(rawData);
      setAiSuggestions(insights.split('\n').filter((line: string) => line.trim().startsWith('-')));
    }
  };
  updateAiSuggestions();
}, [chartData, rawData]);

const handleTaskStart = (taskId: number) => {
  // Find the task to get its title
  const task = tasks.find(t => t.id === taskId);
  
  // Update task status
  setTasks(prevTasks =>
    prevTasks.map(task =>
      task.id === taskId
        ? { ...task, status: 'in_progress' as const }
        : task
    )
  );
  
  // Track task started conversion
  if (task && currentUser) {
    conversionTracking.trackTaskStarted(task.title, currentUser.uid);
  }
};

const getTaskStatusColor = (status: WorkflowTask['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-gray-50';
    case 'in_progress':
      return 'bg-blue-50';
    case 'completed':
      return 'bg-green-50';
    default:
      return 'bg-gray-50';
  }
};



  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 relative">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 w-full overflow-x-hidden">
        {/* Enhanced Subscription Banner - only shown to non-premium users */}
        {!uploadLimits.hasPremium && (
          <SubscriptionBanner className="mb-6 sticky top-0 z-20" />  
        )}
        {/* Floating Action Button for Chat */}
        <button
          onClick={toggleChatBox}
          className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors z-50 flex items-center justify-center"
          aria-label="Toggle Financial Assistant"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>

        {/* Chat Box */}
        <ChatBox isOpen={showChatBox} onClose={handleChatClose} />
        <div className="flex justify-between items-center mb-6 px-4 py-2">
          <Link 
            to="/pricing" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            View Plans
          </Link>
        </div>
      {/* Header with navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center justify-between w-full md:w-auto">
              <h1 className="text-xl md:text-2xl font-bold text-primary-600">Financial Dashboard</h1>
            </div>
            <div className="flex items-center flex-wrap gap-2 md:gap-0">
              <nav className="flex space-x-2 md:space-x-4 mr-2 md:mr-6">
              <button 
                onClick={() => setActiveTab('overview')} 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('tasks')} 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'tasks' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Tasks
              </button>
              <button 
                onClick={() => setActiveTab('insights')} 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'insights' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Insights
              </button>
              </nav>
              
              {/* Authentication UI */}
              {currentUser ? (
                <div className="flex items-center space-x-2 md:space-x-4">
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                      {currentUser.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-700">{currentUser.email?.split('@')[0]}</p>
                      <p className="text-xs text-gray-500">
                        {uploadLimits.hasPremium ? 'Premium' : 'Free'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-300 rounded-md hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)}
            initialMode="login"
          />
        )}
        
        {/* Anomaly Alerts - Always visible */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <AlertBanner alerts={alerts} />
          </div>
        )}
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Getting Started Checklist */}
            <OnboardingChecklist className="mb-6" />
            
            {/* Enhanced Trial Banner with Countdown */}
            {trialInfo.isActive && trialInfo.daysRemaining <= 7 && (
              <div className={`${trialInfo.daysRemaining <= 2 ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'} border rounded-xl p-5 mb-6 shadow-md transition-all duration-300 transform hover:scale-[1.01]`}>
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="flex items-center mb-3 md:mb-0">
                    <div className="flex-shrink-0">
                      <svg className={`h-8 w-8 ${trialInfo.daysRemaining <= 2 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className={`text-lg font-bold ${trialInfo.daysRemaining <= 2 ? 'text-red-800' : 'text-yellow-800'}`}>
                        {trialInfo.daysRemaining <= 2 ? 'Final Notice:' : 'Limited Time:'} Your trial ends in <span className="font-extrabold">{trialInfo.daysRemaining}</span> {trialInfo.daysRemaining === 1 ? 'day' : 'days'}
                      </h3>
                      <div className="mt-1 text-sm font-medium text-gray-700">
                        <p>Don't lose access to unlimited uploads, AI-powered insights, and premium features.</p>
                      </div>
                    </div>
                  </div>
                  <div className="md:ml-auto mt-3 md:mt-0 flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="text-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">
                      Save 20% Today
                    </div>
                    <Link
                      to="/pricing"
                      className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${trialInfo.daysRemaining <= 2 ? 'text-white bg-red-600 hover:bg-red-700' : 'text-yellow-900 bg-yellow-300 hover:bg-yellow-400'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150`}
                      onClick={() => {
                        if (currentUser) {
                          trackEvent('trial_banner_click', {
                            days_remaining: trialInfo.daysRemaining,
                            user_id: currentUser.uid
                          });
                        }
                      }}
                    >
                      Upgrade Now
                      <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}
            
            {/* Smart Alert for File Upload */}
            {rawData.length === 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">You haven't uploaded a file yet — upload now for your forecast.</p>
                    <p className="mt-3 text-sm md:mt-0 md:ml-6">
                      <a href="#file-upload" className="whitespace-nowrap font-medium text-blue-700 hover:text-blue-600">Upload now <span aria-hidden="true">&rarr;</span></a>
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Strategic CTA for non-premium users */}
            {!uploadLimits.hasPremium && (
              <div className="mb-6">
                <SubscriptionCTA variant="full" className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 shadow-md" />
              </div>
            )}
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-4 md:p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Total Income</h3>
                  <span className="p-2 bg-success-100 rounded-full">
                    <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  ${rawData.filter(d => d.type === 'income').reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Year to date</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Total Expenses</h3>
                  <span className="p-2 bg-danger-100 rounded-full">
                    <svg className="w-5 h-5 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  ${Math.abs(rawData.filter(d => d.type === 'expense').reduce((sum, item) => sum + item.amount, 0)).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Year to date</p>
              </div>
              
              <div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Net Profit</h3>
                  <span className="p-2 bg-primary-100 rounded-full">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  ${rawData.reduce((sum, item) => item.type === 'income' ? sum + item.amount : sum - Math.abs(item.amount), 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Year to date</p>
              </div>
            </div>

            {/* AI Recommendations - Premium Feature Teaser */}
            <AiRecommendations className="mb-6" />

            {/* Enhanced Cash Flow Chart */}
            <CashFlowForecast />

            {/* File Upload Section */}
            <div id="file-upload" className="bg-white rounded-xl shadow-card p-4 md:p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Upload Financial Data</h2>
              <FileUpload />
            </div>
          </div>
        )}
        
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-card p-4 md:p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-6 text-gray-900">Workflow Tasks</h2>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border transition-all ${getTaskStatusColor(task.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {task.status === 'completed' ? (
                          <span className="flex-shrink-0 w-6 h-6 bg-success-100 text-success-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : task.status === 'in_progress' ? (
                          <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        ) : (
                          <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </span>
                        )}
                        <span className="text-gray-800 font-medium">{task.title}</span>
                      </div>
                      {task.status === 'pending' && (
                        <button
                          onClick={() => handleTaskStart(task.id)}
                          className="px-3 py-1 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                          Start
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <span className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md">In Progress</span>
                      )}
                      {task.status === 'completed' && (
                        <span className="px-3 py-1 text-sm bg-success-100 text-success-700 rounded-md">Completed</span>
                      )}
                    </div>
                    {task.status === 'in_progress' && task.component && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {task.component}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            {/* AI Suggestions */}
            <div className="bg-white rounded-xl shadow-card p-4 md:p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Smart Suggestions</h2>
              <ul className="space-y-4">
                {aiSuggestions.length > 0 ? aiSuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-3 p-3 bg-primary-50 rounded-lg border border-primary-100">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </span>
                    <span className="text-gray-700 flex-1">{suggestion}</span>
                  </li>
                )) : (
                  <p className="text-gray-500 italic">Upload financial data to receive AI-powered suggestions</p>
                )}
              </ul>
            </div>

            {/* Optimization Recommendations */}
            <div className="bg-white rounded-xl shadow-card p-4 md:p-6 border border-gray-100">
              <OptimizationRecommendations />
            </div>

            {/* Chat Interface */}
            <div className="bg-white rounded-xl shadow-card p-4 md:p-6 border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Financial Assistant</h2>
              <ChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            </div>
          </div>
        )}
        {/* Testimonials Section - Only shown on overview tab */}
        {activeTab === 'overview' && (
          <>
            {/* Subscription CTA */}
            {!uploadLimits.hasPremium && (
              <div className="mt-8 mb-8">
                <SubscriptionCTA variant="compact" />
              </div>
            )}
            
            <div className="mt-8">
              <Testimonials withCTA={!uploadLimits.hasPremium} />
            </div>
          </>
        )}
      </main>
      </div>
    </div>
  );
};

export default Dashboard;