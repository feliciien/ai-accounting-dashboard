/**
 * Firestore WebChannel Fix Initializer
 * 
 * This utility ensures the Firestore WebChannel fix is applied
 * before any Firebase operations occur.
 */

import { initializeEnhancedFirebase } from './enhancedFirebaseInit';
import { initializeFirestoreFixes } from './firestoreWebChannelFix';
import { applyWorkfusionDomainFix } from './workfusionDomainFix';

// Apply the fix immediately when this module is imported
export const applyFirestoreFix = async (): Promise<void> => {
  try {
    console.log('Applying Firestore WebChannel fix...');
    
    // Initialize enhanced Firebase with all fixes enabled
    const { db, auth } = await initializeEnhancedFirebase({
      enableMultiTab: false,
      enableDiagnostics: true,
      maxRetries: 5
    });
    
    // Apply the fix directly to ensure it's properly initialized
    initializeFirestoreFixes(db, auth);
    
    // Apply workfusionapp.com specific fixes if needed
    applyWorkfusionDomainFix(db, auth);
    
    console.log('Firestore WebChannel fix applied successfully');
  } catch (error) {
    console.error('Failed to apply Firestore WebChannel fix:', error);
  }
};

// Execute the fix immediately
applyFirestoreFix();

export default applyFirestoreFix;