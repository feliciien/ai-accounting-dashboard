/**
 * Firestore WebChannel Diagnostic Utility
 * 
 * This utility provides diagnostic tools for troubleshooting Firestore WebChannel connection issues,
 * specifically the "WebChannelConnection RPC 'Listen' stream transport errored: bn" errors with 400 responses.
 */

import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

// Track diagnostic information
interface DiagnosticInfo {
  timestamp: number;
  domain: string;
  userAgent: string;
  authenticated: boolean;
  errorCount: number;
  lastErrorMessage?: string;
  lastErrorCode?: number;
}

let diagnosticInfo: DiagnosticInfo = {
  timestamp: Date.now(),
  domain: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  authenticated: false,
  errorCount: 0
};

/**
 * Monitors for Firestore WebChannel errors and collects diagnostic information
 */
export const monitorFirestoreWebChannelErrors = (db: Firestore, auth: Auth): void => {
  console.log('Starting Firestore WebChannel diagnostic monitoring...');
  
  // Update authentication status when it changes
  auth.onAuthStateChanged(user => {
    diagnosticInfo.authenticated = !!user;
  });
  
  // Listen for WebChannel errors
  window.addEventListener('error', (event) => {
    const isWebChannelError = 
      event.message?.includes('WebChannelConnection') || 
      event.error?.message?.includes('WebChannelConnection') ||
      event.message?.includes('Unknown SID') ||
      event.message?.includes('Failed to load resource: the server responded with a status of 400');
    
    if (isWebChannelError) {
      // Update diagnostic info
      diagnosticInfo.errorCount++;
      diagnosticInfo.lastErrorMessage = event.message || event.error?.message;
      diagnosticInfo.lastErrorCode = 400; // Most common for these errors
      diagnosticInfo.timestamp = Date.now();
      
      // Log diagnostic information
      logDiagnosticInfo();
    }
  });
};

/**
 * Logs diagnostic information to help troubleshoot Firestore connection issues
 */
export const logDiagnosticInfo = (): void => {
  console.group('Firestore WebChannel Diagnostic Information');
  console.log('Timestamp:', new Date(diagnosticInfo.timestamp).toISOString());
  console.log('Domain:', diagnosticInfo.domain);
  console.log('User Agent:', diagnosticInfo.userAgent);
  console.log('Authenticated:', diagnosticInfo.authenticated ? 'Yes' : 'No');
  console.log('WebChannel Error Count:', diagnosticInfo.errorCount);
  
  if (diagnosticInfo.lastErrorMessage) {
    console.log('Last Error Message:', diagnosticInfo.lastErrorMessage);
  }
  
  if (diagnosticInfo.lastErrorCode) {
    console.log('Last Error Code:', diagnosticInfo.lastErrorCode);
  }
  
  // Provide troubleshooting recommendations
  console.log('\nTroubleshooting Recommendations:');
  console.log('1. Verify domain is authorized in Firebase Console');
  console.log('2. Check Firestore security rules for proper configuration');
  console.log('3. Ensure authentication is working properly');
  console.log('4. Verify project billing is active');
  console.log('5. Check for CORS issues if accessing from a different domain');
  
  console.groupEnd();
};

/**
 * Checks if the current domain is likely to have authorization issues with Firestore
 */
export const checkDomainAuthorization = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  const hostname = window.location.hostname;
  
  // Common development domains that might not be authorized
  const potentiallyUnauthorizedDomains = [
    'localhost',
    '127.0.0.1',
    'workfusionapp.com', // Based on the error logs
    'vercel.app',
    'netlify.app',
    'github.io'
  ];
  
  // Check if we're on a potentially unauthorized domain
  const isUnauthorizedDomain = potentiallyUnauthorizedDomains.some(domain => 
    hostname === domain || hostname.endsWith(`.${domain}`)
  );
  
  if (isUnauthorizedDomain) {
    console.warn(`Domain '${hostname}' may not be authorized in Firebase Console.`);
    console.warn('Add this domain to your Firebase project authorized domains list.');
    return false;
  }
  
  return true;
};

/**
 * Initialize the diagnostic tools and perform initial checks
 */
export const initializeFirestoreDiagnostics = (db: Firestore, auth: Auth): void => {
  // Check domain authorization
  const isDomainAuthorized = checkDomainAuthorization();
  
  // Start monitoring for errors
  monitorFirestoreWebChannelErrors(db, auth);
  
  // Log initial diagnostic information
  console.group('Firestore Connection Diagnostics');
  console.log('Domain authorization check:', isDomainAuthorized ? '✅ Likely authorized' : '⚠️ May need authorization');
  console.log('Current domain:', window.location.hostname);
  console.log('Authentication status:', auth.currentUser ? '✅ Authenticated' : '❌ Not authenticated');
  console.groupEnd();
};