/**
 * Enhanced Analytics Service
 * 
 * Provides advanced analytics tracking and reporting capabilities
 * with support for user segmentation, event filtering, and data visualization.
 */

import { trackEvent, setAnalyticsUserId, setAnalyticsUserProperties } from '../utils/analytics';

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: string[];
  userId?: string;
};

export interface UserSegment {
  id: string;
  name: string;
  criteria: Record<string, any>;
}

export interface AnalyticsDashboardData {
  eventCounts: Record<string, number>;
  userActivity: Record<string, number>;
  conversionRates: Record<string, number>;
  revenueData?: Record<string, number>;
}

class EnhancedAnalyticsService {
  private userSegments: UserSegment[] = [];
  
  /**
   * Track a user action with enhanced metadata
   */
  trackUserAction(action: string, data: Record<string, any> = {}, userId?: string) {
    const enhancedData = {
      ...data,
      user_id: userId,
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      device_type: this.getDeviceType(),
      browser: this.getBrowserInfo(),
      referrer: document.referrer || 'direct',
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
    };
    
    return trackEvent(action, enhancedData);
  }
  
  /**
   * Track a page view with enhanced data
   */
  trackEnhancedPageView(pagePath: string, pageTitle?: string, userId?: string) {
    return this.trackUserAction('page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
      page_location: window.location.href,
      user_id: userId
    });
  }
  
  /**
   * Track a feature usage
   */
  trackFeatureUsage(featureName: string, metadata: Record<string, any> = {}, userId?: string) {
    return this.trackUserAction('feature_used', {
      feature_name: featureName,
      ...metadata,
      user_id: userId
    });
  }
  
  /**
   * Track a conversion event (signup, subscription, etc)
   */
  trackConversion(conversionType: string, value?: number, metadata: Record<string, any> = {}, userId?: string) {
    return this.trackUserAction('conversion', {
      conversion_type: conversionType,
      conversion_value: value,
      ...metadata,
      user_id: userId
    });
  }
  
  /**
   * Identify a user for analytics tracking
   */
  identifyUser(userId: string, userProperties: Record<string, any> = {}) {
    setAnalyticsUserId(userId);
    setAnalyticsUserProperties(userProperties);
    
    // Store user ID in session for consistent tracking
    sessionStorage.setItem('analytics_user_id', userId);
    
    return this.trackUserAction('user_identified', userProperties, userId);
  }
  
  /**
   * Create a user segment for targeted analytics
   */
  createUserSegment(name: string, criteria: Record<string, any>): UserSegment {
    const segment = {
      id: `segment_${Date.now()}`,
      name,
      criteria
    };
    
    this.userSegments.push(segment);
    return segment;
  }
  
  /**
   * Get analytics dashboard data
   */
  async getAnalyticsDashboardData(filter?: AnalyticsFilter): Promise<AnalyticsDashboardData> {
    try {
      const response = await fetch('/api/analytics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      return {
        eventCounts: data.topEvents || {},
        userActivity: data.userActivity || {},
        conversionRates: data.conversionRates || {},
        revenueData: data.revenueData
      };
    } catch (error) {
      console.error('Error fetching analytics dashboard data:', error);
      return {
        eventCounts: {},
        userActivity: {},
        conversionRates: {}
      };
    }
  }
  
  /**
   * Get a unique session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }
  
  /**
   * Get device type information
   */
  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }
  
  /**
   * Get browser information
   */
  private getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    let browserName;
    
    if (userAgent.match(/chrome|chromium|crios/i)) {
      browserName = 'chrome';
    } else if (userAgent.match(/firefox|fxios/i)) {
      browserName = 'firefox';
    } else if (userAgent.match(/safari/i)) {
      browserName = 'safari';
    } else if (userAgent.match(/opr\//i)) {
      browserName = 'opera';
    } else if (userAgent.match(/edg/i)) {
      browserName = 'edge';
    } else {
      browserName = 'unknown';
    }
    
    return browserName;
  }
}

// Export a singleton instance
export const enhancedAnalytics = new EnhancedAnalyticsService();