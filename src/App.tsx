import React, { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { FinancialProvider, useFinancial } from './context/FinancialContext';
import { AuthProvider } from './context/AuthContext';
import { FeatureFlagsProvider } from './context/FeatureFlagsContext';
import { NotificationProvider } from './context/NotificationContext';
import { IntegrationProvider } from './context/IntegrationContext';
import { UserPreferencesProvider } from './context/UserPreferencesContext';
import { logFirebaseConfigStatus } from './lib/firebaseConfigVerifier';
import { logFirestoreConfigStatus } from './lib/firestoreConfigVerifier';
import { logFirestoreSecurityHelp } from './lib/firestoreSecurityHelper';
import { initializeEnhancedFirebase } from './lib/enhancedFirebaseInit';
import { initializeFirebaseAnalytics, trackPageView } from './utils/analytics';
import { SEO } from './components/SEO';
import ApiErrorBoundary from './components/common/ApiErrorBoundary';
import ConversionOptimizer from './components/ConversionOptimizer';
import './App.css';

// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Pricing = lazy(() => import('./pages/Pricing'));

// Lazy load integration pages
const XeroIntegration = lazy(() => import('./pages/integrations/XeroIntegration'));
const PayPalIntegration = lazy(() => import('./pages/integrations/PayPalIntegration'));
const StripeIntegration = lazy(() => import('./pages/integrations/StripeIntegration'));
const BankIntegration = lazy(() => import('./pages/integrations/BankIntegration'));

// Define the type for SEO configuration
type SEOConfig = {
  title: string;
  description: string;
};

// Define valid route paths as a type
type ValidRoutePath = '/' | '/integrations/xero' | '/integrations/paypal' | '/integrations/stripe' | '/integrations/bank' | '/pricing';

// SEO configuration for different routes
const routeSEOConfig: Record<ValidRoutePath, SEOConfig> = {
  '/': {
    title: 'AI Accounting Dashboard - Smart Financial Management Made Easy | WorkFusion',
    description: 'Transform your financial management with our AI-powered accounting dashboard. Save time and gain real-time insights.',
  },
  '/pricing': {
    title: 'Pricing - AI Accounting Dashboard | WorkFusion',
    description: 'Choose the right plan for your business. Upgrade to premium for unlimited uploads and advanced features.',
  },
  '/integrations/xero': {
    title: 'Xero Integration - AI Accounting Dashboard | WorkFusion',
    description: 'Seamlessly integrate your Xero account with our AI accounting dashboard for automated financial management.',
  },
  '/integrations/paypal': {
    title: 'PayPal Integration - AI Accounting Dashboard | WorkFusion',
    description: 'Connect your PayPal account to automate payment tracking and reconciliation with our AI dashboard.',
  },
  '/integrations/stripe': {
    title: 'Stripe Integration - AI Accounting Dashboard | WorkFusion',
    description: 'Integrate Stripe payments with our AI accounting dashboard for automated revenue tracking and analytics.',
  },
  '/integrations/bank': {
    title: 'Bank Integration - AI Accounting Dashboard | WorkFusion',
    description: 'Connect your bank accounts for real-time transaction tracking and automated reconciliation.',
  },
};

// Custom loading component with better UX
const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-gray-600">Loading application...</p>
  </div>
);

// Route wrapper component for SEO
const RouteWrapper = () => {
  const location = useLocation();
  const pathname = location.pathname as string;
  const { uploadLimits: { hasPremium } } = useFinancial();
  const seoConfig = (pathname in routeSEOConfig
    ? routeSEOConfig[pathname as ValidRoutePath]
    : routeSEOConfig['/']);
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate resource preloading
  useEffect(() => {
    // Add a small delay to ensure critical resources are loaded
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <SEO {...seoConfig} />
      {isLoading ? (
        <LoadingFallback />
      ) : (
        <>
          <Routes>
              <Route path="/" element={
                <Suspense fallback={<LoadingFallback />}>
                  <Dashboard />
                </Suspense>
              } />
              <Route path="/pricing" element={
                <Suspense fallback={<LoadingFallback />}>
                  <Pricing />
                </Suspense>
              } />
              <Route path="/integrations/xero" element={hasPremium ? (
                <Suspense fallback={<LoadingFallback />}>
                  <XeroIntegration />
                </Suspense>
              ) : (
                <Navigate to="/pricing" replace />
              )} />
              <Route path="/integrations/paypal" element={hasPremium ? (
                <Suspense fallback={<LoadingFallback />}>
                  <PayPalIntegration />
                </Suspense>
              ) : (
                <Navigate to="/pricing" replace />
              )} />
              <Route path="/integrations/stripe" element={hasPremium ? (
                <Suspense fallback={<LoadingFallback />}>
                  <StripeIntegration />
                </Suspense>
              ) : (
                <Navigate to="/pricing" replace />
              )} />
              <Route path="/integrations/bank" element={hasPremium ? (
                <Suspense fallback={<LoadingFallback />}>
                  <BankIntegration />
                </Suspense>
              ) : (
                <Navigate to="/pricing" replace />
              )} />
              <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* Global Conversion Optimizer - shows targeted subscription prompts */}
          <ConversionOptimizer />
        </>
      )}
    </>
  );
};

function App() {
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  // Initialize Firebase with better error handling
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        // Add timeout to prevent Firebase initialization from hanging
        const initPromise = initializeEnhancedFirebase({
          enableMultiTab: false,
          enableDiagnostics: true,
          maxRetries: 5
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Firebase initialization timeout')), 10000); // Increased timeout
        });
        
        await Promise.race([initPromise, timeoutPromise]);
        
        // Initialize Firebase Analytics
        initializeFirebaseAnalytics();
        // Track initial page view
        trackPageView(window.location.pathname, 'Dashboard');
        setFirebaseInitialized(true);
      } catch (error: any) {
        console.error('Failed to initialize enhanced Firebase:', error);
        // Set error message for user display
        setInitializationError(error?.message || 'Failed to initialize Firebase services');
        // Track initialization error
        trackPageView('/error/firebase-initialization', 'Firebase Initialization Error');
        // Continue with app initialization even if Firebase fails
        setFirebaseInitialized(true);
      }
    };
    
    initializeFirebase();
    
    // Verify Firebase configuration on app startup
    logFirebaseConfigStatus().catch(error => {
      console.error('Failed to verify Firebase configuration:', error);
    });
    
    // Verify Firestore connection specifically
    logFirestoreConfigStatus().catch(error => {
      console.error('Failed to verify Firestore configuration:', error);
      
      // Log security troubleshooting help when Firestore errors occur
      logFirestoreSecurityHelp();
    });
  }, []);

  // Show a loading screen while Firebase is initializing
  if (!firebaseInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Initializing services...</p>
      </div>
    );
  }
  
  // Show error message if initialization failed
  if (initializationError) {
    console.warn('Continuing with limited functionality due to initialization error');
  }
  
  return (
    <div className="App h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto ios-scroll momentum-scroll">
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 dark:text-gray-100">
          <AuthProvider>
            <FeatureFlagsProvider>
              <NotificationProvider>
                <UserPreferencesProvider>
                  <FinancialProvider>
                    <IntegrationProvider>
                      <Router>
                        <ApiErrorBoundary>
                          <RouteWrapper />
                        </ApiErrorBoundary>
                      </Router>
                    </IntegrationProvider>
                  </FinancialProvider>
                </UserPreferencesProvider>
              </NotificationProvider>
            </FeatureFlagsProvider>
          </AuthProvider>
        </div>
      </div>
    </div>
  );
}

export default App;
