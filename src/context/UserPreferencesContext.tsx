import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface DashboardLayout {
  widgets: {
    id: string;
    position: { x: number; y: number };
    visible: boolean;
  }[];
}

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  achievementAlerts: boolean;
}

interface FavoriteItem {
  id: string;
  type: 'transaction' | 'report';
  name: string;
  addedAt: number;
}

interface AchievementProgress {
  id: string;
  name: string;
  progress: number;
  completed: boolean;
  completedAt?: number;
}

interface TutorialProgress {
  id: string;
  completed: boolean;
  completedAt?: number;
}

interface UserPreferencesContextType {
  dashboardLayout: DashboardLayout;
  notificationPreferences: NotificationPreferences;
  favorites: FavoriteItem[];
  achievements: AchievementProgress[];
  tutorials: TutorialProgress[];
  updateDashboardLayout: (layout: DashboardLayout) => Promise<void>;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  toggleFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => Promise<void>;
  updateAchievementProgress: (achievementId: string, progress: number) => Promise<void>;
  completeTutorial: (tutorialId: string) => Promise<void>;
}

const defaultNotificationPreferences: NotificationPreferences = {
  email: true,
  push: true,
  weeklyReport: true,
  monthlyReport: true,
  achievementAlerts: true,
};

const defaultDashboardLayout: DashboardLayout = {
  widgets: [],
};

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(defaultDashboardLayout);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [tutorials, setTutorials] = useState<TutorialProgress[]>([]);

  useEffect(() => {
    if (currentUser) {
      const loadUserPreferences = async () => {
        try {
          const userPrefsRef = doc(getFirebaseFirestore(), 'userPreferences', currentUser.uid);
          const userPrefsDoc = await getDoc(userPrefsRef);

          if (userPrefsDoc.exists()) {
            const data = userPrefsDoc.data();
            setDashboardLayout(data.dashboardLayout || defaultDashboardLayout);
            setNotificationPreferences(data.notificationPreferences || defaultNotificationPreferences);
            setFavorites(data.favorites || []);
            setAchievements(data.achievements || []);
            setTutorials(data.tutorials || []);
          } else {
            // Initialize with defaults for new users
            await setDoc(userPrefsRef, {
              dashboardLayout: defaultDashboardLayout,
              notificationPreferences: defaultNotificationPreferences,
              favorites: [],
              achievements: [],
              tutorials: [],
              createdAt: serverTimestamp(),
            });
          }
        } catch (error) {
          console.error('Error loading user preferences:', error);
        }
      };

      loadUserPreferences();
    }
  }, [currentUser]);

  const updateUserPreferences = async (updates: Partial<{
    dashboardLayout: DashboardLayout;
    notificationPreferences: NotificationPreferences;
    favorites: FavoriteItem[];
    achievements: AchievementProgress[];
    tutorials: TutorialProgress[];
  }>) => {
    if (!currentUser) return;

    try {
      const userPrefsRef = doc(getFirebaseFirestore(), 'userPreferences', currentUser.uid);
      await updateDoc(userPrefsRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  };

  const updateDashboardLayout = async (layout: DashboardLayout) => {
    setDashboardLayout(layout);
    await updateUserPreferences({ dashboardLayout: layout });
  };

  const updateNotificationPreferences = async (prefs: Partial<NotificationPreferences>) => {
    const updatedPrefs = { ...notificationPreferences, ...prefs };
    setNotificationPreferences(updatedPrefs);
    await updateUserPreferences({ notificationPreferences: updatedPrefs });
  };

  const toggleFavorite = async (item: Omit<FavoriteItem, 'addedAt'>) => {
    const existingIndex = favorites.findIndex(f => f.id === item.id && f.type === item.type);
    let updatedFavorites: FavoriteItem[];

    if (existingIndex >= 0) {
      updatedFavorites = favorites.filter((_, index) => index !== existingIndex);
    } else {
      const newFavorite: FavoriteItem = { ...item, addedAt: Date.now() };
      updatedFavorites = [...favorites, newFavorite];
    }

    setFavorites(updatedFavorites);
    await updateUserPreferences({ favorites: updatedFavorites });
  };

  const updateAchievementProgress = async (achievementId: string, progress: number) => {
    const updatedAchievements = achievements.map(achievement => {
      if (achievement.id === achievementId) {
        const completed = progress >= 100;
        return {
          ...achievement,
          progress,
          completed,
          completedAt: completed && !achievement.completed ? Date.now() : achievement.completedAt,
        };
      }
      return achievement;
    });

    setAchievements(updatedAchievements);
    await updateUserPreferences({ achievements: updatedAchievements });
  };

  const completeTutorial = async (tutorialId: string) => {
    const updatedTutorials = tutorials.map(tutorial => {
      if (tutorial.id === tutorialId && !tutorial.completed) {
        return {
          ...tutorial,
          completed: true,
          completedAt: Date.now(),
        };
      }
      return tutorial;
    });

    setTutorials(updatedTutorials);
    await updateUserPreferences({ tutorials: updatedTutorials });
  };

  return (
    <UserPreferencesContext.Provider
      value={{
        dashboardLayout,
        notificationPreferences,
        favorites,
        achievements,
        tutorials,
        updateDashboardLayout,
        updateNotificationPreferences,
        toggleFavorite,
        updateAchievementProgress,
        completeTutorial,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};