/**
 * WorkFusion Domain-Specific Firestore Fix
 * 
 * This utility provides specific fixes for Firestore connection issues
 * on the workfusionapp.com domain.
 */

import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

/**
 * Checks if the current domain is workfusionapp.com or a subdomain
 */
const isWorkfusionDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  return hostname === 'workfusionapp.com' || hostname.endsWith('.workfusionapp.com');
};

/**
 * Adds specific CORS headers needed for workfusionapp.com domain
 */
const addWorkfusionCorsHeaders = (): void => {
  if (typeof document === 'undefined') return;
  
  // Add specific CORS meta tags for workfusionapp.com
  const metaTags = [
    { 'http-equiv': 'Cross-Origin-Opener-Policy', content: 'same-origin-allow-popups' },
    { 'http-equiv': 'Cross-Origin-Embedder-Policy', content: 'credentialless' },
    { 'http-equiv': 'Cross-Origin-Resource-Policy', content: 'cross-origin' },
    { name: 'referrer', content: 'no-referrer-when-downgrade' }
  ];

  metaTags.forEach(tag => {
    const selector = tag.name 
      ? `meta[name="${tag.name}"]` 
      : `meta[http-equiv="${tag['http-equiv']}"]`;
      
    if (!document.querySelector(selector)) {
      const meta = document.createElement('meta');
      if (tag.name) meta.name = tag.name;
      if (tag['http-equiv']) meta.httpEquiv = tag['http-equiv'];
      meta.content = tag.content;
      document.head.appendChild(meta);
      console.log(`Added CORS meta tag: ${tag.name || tag['http-equiv']}`);
    }
  });
};

/**
 * Applies workfusionapp.com specific fixes for Firestore
 */
export const applyWorkfusionDomainFix = (db: Firestore, auth: Auth): void => {
  // Only apply fixes if we're on workfusionapp.com domain
  if (!isWorkfusionDomain()) {
    return;
  }
  
  console.log('Applying workfusionapp.com specific Firestore fixes...');
  
  // Add CORS headers specific to workfusionapp.com
  addWorkfusionCorsHeaders();
  
  // Add domain to localStorage for diagnostic purposes
  try {
    localStorage.setItem('firestore_domain_fix_applied', 'workfusionapp.com');
    localStorage.setItem('firestore_fix_timestamp', Date.now().toString());
  } catch (e) {
    // Ignore localStorage errors
  }
  
  console.log('workfusionapp.com specific Firestore fixes applied');
};