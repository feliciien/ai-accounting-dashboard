import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './common/Button';
import { trackEvent } from '../utils/analytics';

interface ConversionOptimizerProps {
  className?: string;
}

/**
 * ConversionOptimizer - A smart component that displays targeted subscription prompts
 * at optimal moments based on user behavior to maximize conversion rates.
 */
const ConversionOptimizer: React.FC<ConversionOptimizerProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { uploadLimits } = useAuth(); // Removed unused currentUser variable
  const [showPrompt, setShowPrompt] = useState(false);
  const [exitIntent, setExitIntent] = useState(false);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [timeOnPage, setTimeOnPage] = useState(0);
  
  // Track user behavior
  useEffect(() => {
    // Don't track for premium users
    if (uploadLimits.hasPremium) {
      return;
    }
    
    const startTime = Date.now();
    let timer: NodeJS.Timeout;
    
    // Track time on page
    const updateTimeOnPage = () => {
      setTimeOnPage(Math.floor((Date.now() - startTime) / 1000));
      timer = setTimeout(updateTimeOnPage, 1000);
    };
    timer = setTimeout(updateTimeOnPage, 1000);
    
    // Track scroll depth
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.body.offsetHeight - window.innerHeight;
      const scrollPercent = scrollTop / docHeight * 100;
      setScrollDepth(scrollPercent);
    };
    
    // Track exit intent
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setExitIntent(true);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [uploadLimits.hasPremium]);
  
  // Determine when to show the prompt
  useEffect(() => {
    // Don't show for premium users or if previously dismissed
    if (uploadLimits.hasPremium || localStorage.getItem('premium_prompt_dismissed') === 'true') {
      return;
    }
    
    // Show after 60 seconds on page
    if (timeOnPage > 60 && !showPrompt) {
      setShowPrompt(true);
      trackEvent('conversion_prompt_shown', { trigger: 'time_on_page' });
    }
    
    // Show after scrolling 70% of the page
    if (scrollDepth > 70 && !showPrompt) {
      setShowPrompt(true);
      trackEvent('conversion_prompt_shown', { trigger: 'scroll_depth' });
    }
    
    // Show on exit intent
    if (exitIntent && !showPrompt) {
      setShowPrompt(true);
      trackEvent('conversion_prompt_shown', { trigger: 'exit_intent' });
    }
  }, [timeOnPage, scrollDepth, exitIntent, showPrompt, uploadLimits.hasPremium]);
  
  const handleUpgradeClick = () => {
    trackEvent('conversion_prompt_clicked', { page: window.location.pathname });
    navigate('/pricing');
  };
  
  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal in localStorage to prevent showing again in the same session
    localStorage.setItem('premium_prompt_dismissed', 'true');
    trackEvent('conversion_prompt_dismissed', { page: window.location.pathname });
  };
  
  // Don't show for premium users or if prompt is not triggered
  if (uploadLimits.hasPremium || !showPrompt) {
    return null;
  }
  
  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}>
      <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-primary-100 animate-fade-in-up">
        <div className="bg-primary-600 px-4 py-2 flex justify-between items-center">
          <h3 className="text-white font-medium">Unlock Premium Features</h3>
          <button 
            onClick={handleDismiss}
            className="text-white hover:text-primary-100"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <p className="text-gray-700 mb-3">
            {uploadLimits.freeUploadUsed && !uploadLimits.hasPremium && uploadLimits.bonusUploadsAvailable === 0
              ? "You've reached your upload limit. Upgrade now to continue using all features."
              : "Upgrade to Pro for unlimited uploads and advanced AI insights."}
          </p>
          <div className="flex justify-between items-center">
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpgradeClick}
            >
              Upgrade Now
            </Button>
            <span className="text-gray-500 text-sm">Starting at $9.99/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionOptimizer;