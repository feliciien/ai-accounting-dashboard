import { AxiosError } from 'axios';
import { trackEvent } from '../utils/analytics';

export interface ErrorResponse {
  code: number;
  message: string;
  data?: any;
}

export class AppError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleApiError = (error: any): ErrorResponse => {
  // Handle Xero-specific authorization errors
  if (error?.response?.data?.code === 'xero_auth_error') {
    return {
      code: 403,
      message: 'Xero integration requires administrator permissions',
      data: { 
        originalError: error,
        requiredRole: 'admin'
      }
    };
  }

  let errorResponse: ErrorResponse;

  if (error instanceof AppError) {
    errorResponse = {
      code: error.code,
      message: error.message,
      data: error.data
    };
  } else if (error?.code?.startsWith('auth/')) {
    // Handle Firebase Auth errors
    const code = 401;
    let message = 'Authentication error';
    
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        message = 'Invalid email or password';
        break;
      case 'auth/email-already-in-use':
        message = 'Email is already registered';
        break;
      case 'auth/weak-password':
        message = 'Password is too weak';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email format';
        break;
      case 'auth/network-request-failed':
        message = 'Network error - Please check your connection';
        break;
      case 'auth/too-many-requests':
        message = 'Too many attempts - Please try again later';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Authentication cancelled - Please try again';
        break;
      default:
        message = error.message || 'Authentication error occurred';
    }
    
    errorResponse = {
      code,
      message,
      data: { authError: error.code }
    };
  } else if (error?.response?.data) {
    // Handle API errors
    errorResponse = {
      code: error.response.status,
      message: error.response.data.message || 'An error occurred',
      data: error.response.data
    };
  } else {
    // Handle other errors
    errorResponse = {
      code: 500,
      message: error?.message || 'An unexpected error occurred'
    };
  }

  // Track error for analytics
  trackEvent('error_occurred', {
    error_code: errorResponse.code,
    error_message: errorResponse.message,
    error_type: error.name || 'UnknownError'
  });

  return errorResponse;
};

export const handlePermissionError = (error: any): ErrorResponse => {
  const errorResponse: ErrorResponse = {
    code: 403,
    message: error.message || 'You do not have permission to access this resource',
    data: {
      originalError: error,
      requiresAuthentication: true,
      requiredPermissions: ['admin']
    }
  };

  // Track permission error
  trackEvent('permission_error', {
    error_code: errorResponse.code,
    error_message: errorResponse.message,
    path: error?.reqInfo?.path
  });

  return errorResponse;
};

export const handleCookieConsent = (): void => {
  const hasConsent = localStorage.getItem('cookie-consent');
  
  if (!hasConsent) {
    trackEvent('cookie_consent_prompt', {
      timestamp: new Date().toISOString()
    });
  }
};