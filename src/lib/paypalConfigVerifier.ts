/**
 * PayPal Configuration Verification Utility
 * 
 * This utility helps diagnose PayPal configuration issues
 * by checking environment variables and validating client ID format.
 */

export interface PayPalConfigStatus {
  isConfigured: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verifies PayPal configuration by checking environment variables
 */
export const verifyPayPalConfig = (): PayPalConfigStatus => {
  const status: PayPalConfigStatus = {
    isConfigured: false,
    errors: [],
    warnings: []
  };

  // Check if PayPal client ID is configured
  const envClientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;
  // Use fallback client ID if environment variable is not set
  const clientId = envClientId || '';
  
  // Check for placeholder values or empty values
  if (!clientId || clientId === 'your-paypal-client-id') {
    status.errors.push('PayPal client ID appears to be invalid or a placeholder');
    return status;
  }
  
  // Check if client ID is too short
  if (clientId.length < 10) {
    status.errors.push('PayPal client ID appears to be too short');
    return status;
  }

  // Basic format validation (PayPal client IDs are typically long alphanumeric strings)
  if (!/^[A-Za-z0-9_-]+$/.test(clientId)) {
    status.warnings.push('PayPal client ID contains invalid characters. It should be an alphanumeric string.');
  }

  // Basic configuration is present and seems valid
  status.isConfigured = true;
  
  return status;
};

/**
 * Logs PayPal configuration status to console
 */
export const logPayPalConfigStatus = (): void => {
  console.group('PayPal Configuration Status');
  try {
    const status = verifyPayPalConfig();
    
    console.log('Configuration present:', status.isConfigured ? '✅' : '❌');
    
    if (status.errors.length > 0) {
      console.error('Errors:');
      status.errors.forEach(err => console.error(`- ${err}`));
    }
    
    if (status.warnings.length > 0) {
      console.warn('Warnings:');
      status.warnings.forEach(warn => console.warn(`- ${warn}`));
    }
    
    if (status.errors.length === 0 && status.warnings.length === 0) {
      console.log('PayPal configuration looks good! 👍');
    }
  } catch (error) {
    console.error('Failed to verify PayPal configuration:', error);
  }
  console.groupEnd();
};