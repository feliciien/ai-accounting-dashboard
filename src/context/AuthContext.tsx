import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  UserCredential,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { User } from '../types/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, enableIndexedDbPersistence, arrayUnion, increment } from 'firebase/firestore';
import { auth, db, googleProvider, getFirebaseAuth, getFirebaseFirestore, getGoogleAuthProvider } from '../lib/firebase';
import { handleApiError } from '../middleware/errorHandling';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isOnline: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<User>;
  uploadLimits: {
    freeUploadUsed: boolean;
    lastFreeUpload: string | null;
    hasPremium: boolean;
    bonusUploadsAvailable: number;
    totalUploads: number;
  };
  updateUploadLimits: (newLimits: Partial<AuthContextType['uploadLimits']>) => Promise<void>;
  checkUploadEligibility: () => Promise<{ canUpload: boolean; reason?: string }>;
  getReferralLink: () => string;
  processReferralCode: (referralCode: string) => Promise<boolean>;
  getPremiumFeatures: () => {
    unlimitedUploads: boolean;
    advancedInsights: boolean;
    exportFeatures: boolean;
    bankIntegration: boolean;
    prioritySupport: boolean;
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationStage, setInitializationStage] = useState<string>('initializing');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [uploadLimits, setUploadLimits] = useState({
    freeUploadUsed: false,
    lastFreeUpload: null as string | null,
    hasPremium: false,
    bonusUploadsAvailable: 0,
    totalUploads: 0
  });
  
  // Track initialization progress for better UX feedback
  useEffect(() => {
    console.log(`Auth initialization stage: ${initializationStage}`);
  }, [initializationStage]);

  // Check if non-logged in user has used their free upload
  useEffect(() => {
    const freeUploadUsed = localStorage.getItem('freeUploadUsed');
    if (freeUploadUsed === 'true') {
      setUploadLimits(prev => ({ ...prev, freeUploadUsed: true }));
    }
  }, []);

  // Initialize offline persistence for Firestore with timeout
  useEffect(() => {
    const initializePersistence = async () => {
      setInitializationStage('enabling-persistence');
      try {
        // Add timeout to prevent persistence initialization from hanging
        const persistencePromise = enableIndexedDbPersistence(getFirebaseFirestore());
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Persistence initialization timeout')), 3000);
        });

        await Promise.race([persistencePromise, timeoutPromise]);
        console.log('Offline persistence enabled');
        setInitializationStage('persistence-enabled');
      } catch (err: unknown) {
          if (err instanceof Error) {
            console.warn('Persistence initialization error:', err.message);
          }
        if (err instanceof Error && 'code' in err) {
          if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
          } else if (err.code === 'unimplemented') {
            console.warn('Browser doesn\'t support persistence');
          } else {
            console.warn('Failed to enable persistence:', err.message);
          }
        }
        // Continue even if persistence fails
        setInitializationStage('persistence-skipped');
      }
    };
    initializePersistence();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for auth state changes with timeout
  useEffect(() => {
    let authTimeout: NodeJS.Timeout;
    let unsubscribe: () => void;
    
    const setupAuthListener = async () => {
    setInitializationStage('auth-initializing');
    
    // Set a timeout to prevent hanging on auth initialization
    authTimeout = setTimeout(() => {
      console.warn('Auth initialization timeout - proceeding with app load');
      setLoading(false);
      setInitializationStage('auth-timeout');
    }, 10000);
      
      try {
        unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (user) => {
          clearTimeout(authTimeout);
          // Batch state updates to minimize re-renders
          setCurrentUser(user);
          setInitializationStage(user ? 'auth-completed' : 'auth-failed');
          
          if (user) {
            setInitializationStage('fetching-user-data');
            // Get user upload limits from Firestore
            try {
              const userDocRef = doc(getFirebaseFirestore(), 'users', user.uid);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setUploadLimits({
                  freeUploadUsed: userData.freeUploadUsed || false,
                  lastFreeUpload: userData.lastFreeUpload || null,
                  hasPremium: userData.hasPremium || false,
                  bonusUploadsAvailable: userData.bonusUploadsAvailable || 0,
                  totalUploads: userData.totalUploads || 0
                });
              } else {
                // Create new user document if it doesn't exist
                await setDoc(userDocRef, {
                  email: user.email,
                  freeUploadUsed: false,
                  lastFreeUpload: null,
                  hasPremium: false,
                  bonusUploadsAvailable: 0,
                  totalUploads: 0,
                  referrals: [],
                  referredBy: null,
                  createdAt: serverTimestamp()
                });
              }
              setInitializationStage('user-data-loaded');
            } catch (error) {
              console.error('Error fetching user data:', error);
              setInitializationStage('user-data-error');
            }
          }
          
          setLoading(false);
          setInitializationStage('initialization-complete');
          // Force state update to ensure UI consistency
          setCurrentUser((prev) => prev ? {...prev} : null);
        });
      } catch (error) {
        console.error('Error setting up auth listener:', error);
        clearTimeout(authTimeout);
        setLoading(false);
        setInitializationStage('auth-error');
      }
    };
    
    setupAuthListener();
    
    return () => {
      if (unsubscribe) unsubscribe();
      clearTimeout(authTimeout);
    };
  }, []);

  // Login with email/password
  const login = async (email: string, password: string): Promise<User> => {
    if (!isOnline) {
      throw new Error('Cannot login while offline. Please check your internet connection.');
    }

    // Validate email format
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error('Please enter a valid email address');
    }

    // Validate password complexity
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    try {
      await setPersistence(getFirebaseAuth(), browserLocalPersistence);
      // First validate Firestore connection
      const db = getFirebaseFirestore();

      // Initialize auth with retry logic
      const auth = getFirebaseAuth();
      let userCredential: UserCredential | undefined;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          userCredential = await Promise.race([
            signInWithEmailAndPassword(auth, email, password),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Login timeout (attempt ${attempt}) - Please try again`)), 15000)
            )
          ]) as UserCredential;
          break;
        } catch (retryError) {
          if (attempt === 3) throw retryError;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      if (!userCredential?.user) {
        throw new Error('Authentication failed - No user credential obtained');
      }
      
      // Pre-fetch user data to speed up initial load
      const userDocRef = doc(getFirebaseFirestore(), 'users', userCredential.user.uid);
      await getDoc(userDocRef);
      
      if (!userCredential) {
        throw new Error('Authentication failed after 3 attempts');
      }
      return userCredential.user;
    } catch (error: any) {
      handleApiError(error);
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error - Please check your connection and try again');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Account temporarily locked due to multiple failed attempts');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid login credentials - Please check email/password');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        throw new Error('Invalid email or password combination');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Security check required - Please reauthenticate');
      } else if (error.code === 'auth/unverified-email') {
        throw new Error('Verify your email first - Check your inbox');
      } else if (error.message.includes('Database connection error')) {
        throw new Error('Failed to connect to database - Try again later');
      } else {
        throw new Error(`Authentication failed: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Sign up with email/password
  const signup = async (email: string, password: string): Promise<User> => {
    // Validate email format
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error('Please enter a valid email address');
    }

    // Validate password complexity
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
    const userCredential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);

    // Create user document in Firestore with error boundary and timeout
    const referralCode = localStorage.getItem('referralCode');
    
    try {
      await Promise.race([
        setDoc(doc(getFirebaseFirestore(), 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          freeUploadUsed: false,
          lastFreeUpload: null,
          hasPremium: false,
          bonusUploadsAvailable: 0,
          totalUploads: 0,
          referrals: [],
          referredBy: referralCode || null,
          createdAt: serverTimestamp()
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Document creation timeout')), 5000)
        )
      ]);
    } catch (docError) {
      // Delete user if document creation fails
      await userCredential.user.delete();
      throw new Error('Account setup failed: ' + (docError instanceof Error ? docError.message : 'Unknown error'));
    }
    
    // Process the referral if it exists
    if (referralCode) {
      await processReferralCode(referralCode);
      localStorage.removeItem('referralCode');
    }
    
    return userCredential.user;
  };

  // Login with Google
  const loginWithGoogle = async (): Promise<User> => {
    const result = await signInWithPopup(getFirebaseAuth(), getGoogleAuthProvider()) as UserCredential;
    const user = result.user;
    
    // Check if user document exists, create if not
    const userDocRef = doc(getFirebaseFirestore(), 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Check if there's a referral code in localStorage
      const referralCode = localStorage.getItem('referralCode');
      
      await setDoc(userDocRef, {
        email: user.email,
        freeUploadUsed: false,
        lastFreeUpload: null,
        hasPremium: false,
        bonusUploadsAvailable: 0,
        totalUploads: 0,
        referrals: [],
        referredBy: referralCode || null,
        createdAt: serverTimestamp()
      });
      
      // Process the referral if it exists
      if (referralCode) {
        await processReferralCode(referralCode);
        localStorage.removeItem('referralCode');
      }
    }
    
    return result.user;
  };

  // Logout
  const logout = () => {
    return signOut(getFirebaseAuth());
  };

  // Update upload limits
  const updateUploadLimits = async (newLimits: Partial<AuthContextType['uploadLimits']>) => {
    // Update local state
    setUploadLimits(prev => ({ ...prev, ...newLimits }));
    
    // If not logged in, only update localStorage
    if (!currentUser) {
      if (newLimits.freeUploadUsed) {
        localStorage.setItem('freeUploadUsed', 'true');
      }
      return;
    }
    
    // Update Firestore
    try {
      const userDocRef = doc(getFirebaseFirestore(), 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        ...newLimits,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating upload limits:', error);
    }
  };

  // Check if user can upload
  const checkUploadEligibility = async () => {
    // Not logged in
    if (!currentUser) {
      // Check if free upload already used
      if (uploadLimits.freeUploadUsed) {
        return { canUpload: false, reason: 'login_required' };
      }
      return { canUpload: true };
    }
    
    // Logged in user with premium
    if (uploadLimits.hasPremium) {
      return { canUpload: true };
    }
    
    // Check if bonus uploads are available
    if (uploadLimits.bonusUploadsAvailable > 0) {
      return { canUpload: true };
    }
    
    // Check if monthly free upload is available
    if (uploadLimits.lastFreeUpload) {
      const lastUpload = new Date(uploadLimits.lastFreeUpload);
      const currentDate = new Date();
      
      // Check if last upload was in the current month
      if (
        lastUpload.getMonth() === currentDate.getMonth() &&
        lastUpload.getFullYear() === currentDate.getFullYear()
      ) {
        return { canUpload: false, reason: 'monthly_limit_reached' };
      }
    }
    
    // Monthly free upload is available
    return { canUpload: true };
  };
  
  // Get referral link for current user
  const getReferralLink = () => {
    if (!currentUser) return '';
    
    const baseUrl = window.location.origin;
    return `${baseUrl}/?ref=${currentUser.uid}`;
  };
  
  // Process a referral code
  const processReferralCode = async (referralCode: string) => {
    if (!currentUser || !referralCode || referralCode === currentUser.uid) {
      return false;
    }
    
    try {
      const db = getFirebaseFirestore();
      
      // Update referrer's document
      const referrerDocRef = doc(db, 'users', referralCode);
      const referrerDoc = await getDoc(referrerDocRef);
      
      if (referrerDoc.exists()) {
        const referrerData = referrerDoc.data();
        const referrals = referrerData.referrals || [];
        
        // Check if this user is already in the referrals array
        if (!referrals.includes(currentUser.uid)) {
          // Add current user to referrer's referrals
          await updateDoc(referrerDocRef, {
            referrals: arrayUnion(currentUser.uid)
          });
          
          // Check if referrer has reached 3 referrals
          if ((referrals.length + 1) % 3 === 0) {
            // Award bonus upload
            await updateDoc(referrerDocRef, {
              bonusUploadsAvailable: increment(1)
            });
          }
          
          // Update current user's referredBy field
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            referredBy: referralCode
          });
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error processing referral:', error);
      return false;
    }
  };
  
  // Get premium features
  const getPremiumFeatures = () => {
    return {
      unlimitedUploads: uploadLimits.hasPremium,
      advancedInsights: uploadLimits.hasPremium,
      exportFeatures: uploadLimits.hasPremium,
      bankIntegration: uploadLimits.hasPremium,
      prioritySupport: uploadLimits.hasPremium
    };
  };

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    currentUser,
    loading,
    isOnline,
    login,
    signup,
    logout,
    loginWithGoogle,
    uploadLimits,
    updateUploadLimits,
    checkUploadEligibility,
    getReferralLink,
    processReferralCode,
    getPremiumFeatures
  }), [
    currentUser,
    loading,
    isOnline,
    uploadLimits,
    login,
    signup,
    logout,
    loginWithGoogle,
    updateUploadLimits
  ]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-sm">{initializationStage === 'initializing' ? 'Starting up...' : 
            initializationStage === 'enabling-persistence' ? 'Enabling offline mode...' :
            initializationStage === 'auth-initializing' ? 'Checking authentication...' :
            initializationStage === 'fetching-user-data' ? 'Loading your data...' :
            'Almost ready...'}</p>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}