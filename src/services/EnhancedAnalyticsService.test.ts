import { enhancedAnalytics } from './EnhancedAnalyticsService';

// Mock fetch for testing
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      eventCounts: { page_view: 10, feature_used: 5 },
      userActivity: { '2023-06-01': 5, '2023-06-02': 8 },
      conversionRates: { signup: 0.25, subscription: 0.1 }
    })
  })
) as jest.Mock;

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => 'test-token'),
    setItem: jest.fn(),
  },
  writable: true
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
  writable: true
});

describe('EnhancedAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track user actions with enhanced metadata', () => {
    const trackEventSpy = jest.spyOn(require('../utils/analytics'), 'trackEvent');
    
    enhancedAnalytics.trackUserAction('test_action', { test: 'data' }, 'user123');
    
    expect(trackEventSpy).toHaveBeenCalledWith('test_action', expect.objectContaining({
      test: 'data',
      user_id: 'user123',
      session_id: expect.any(String),
      timestamp: expect.any(String),
    }));
  });

  it('should track page views with correct data', () => {
    const trackUserActionSpy = jest.spyOn(enhancedAnalytics, 'trackUserAction');
    
    enhancedAnalytics.trackEnhancedPageView('/test-page', 'Test Page', 'user123');
    
    expect(trackUserActionSpy).toHaveBeenCalledWith('page_view', expect.objectContaining({
      page_path: '/test-page',
      page_title: 'Test Page',
      page_location: expect.any(String),
      user_id: 'user123'
    }));
  });

  it('should fetch analytics dashboard data', async () => {
    const result = await enhancedAnalytics.getAnalyticsDashboardData();
    
    expect(fetch).toHaveBeenCalledWith('/api/analytics', expect.any(Object));
    expect(result).toEqual(expect.objectContaining({
      eventCounts: { page_view: 10, feature_used: 5 },
      userActivity: { '2023-06-01': 5, '2023-06-02': 8 },
      conversionRates: { signup: 0.25, subscription: 0.1 }
    }));
  });

  it('should create user segments', () => {
    const segment = enhancedAnalytics.createUserSegment('Premium Users', { hasPremium: true });
    
    expect(segment).toEqual(expect.objectContaining({
      id: expect.any(String),
      name: 'Premium Users',
      criteria: { hasPremium: true }
    }));
  });
});