import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseFirestore } from '../lib/firebase';

type FeatureFlags = {
  stripeIntegration: boolean;
  bankSync: boolean;
  aiForecasting: boolean;
  premiumUi: boolean;
  experimentalFeatures: boolean;
};

interface FeatureFlagsContextType {
  flags: FeatureFlags;
  loading: boolean;
  error: Error | null;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
  flags: {
    stripeIntegration: false,
    bankSync: false,
    aiForecasting: false,
    premiumUi: false,
    experimentalFeatures: false
  },
  loading: true,
  error: null
});

export const FeatureFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>({
    stripeIntegration: false,
    bankSync: false,
    aiForecasting: false,
    premiumUi: false,
    experimentalFeatures: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(getFirebaseFirestore(), 'config/featureFlags'),
      (snapshot) => {
        try {
          const data = snapshot.data() as FeatureFlags;
          setFlags({
            stripeIntegration: data?.stripeIntegration ?? false,
            bankSync: data?.bankSync ?? false,
            aiForecasting: data?.aiForecasting ?? false,
            premiumUi: data?.premiumUi ?? false,
            experimentalFeatures: data?.experimentalFeatures ?? false
          });
          setLoading(false);
        } catch (err) {
          setError(err as Error);
          setLoading(false);
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({ flags, loading, error }), [flags, loading, error]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
};