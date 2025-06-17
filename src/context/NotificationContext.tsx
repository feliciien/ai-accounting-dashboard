import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
  read: boolean;
  duration?: number;
}

interface ToastState {
  message: string;
  type: NotificationType;
  visible: boolean;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (type: NotificationType, message: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  showNotification: (notification: Notification) => void;
  toast: ToastState | null;
  showToast: (type: NotificationType, message: string, duration?: number) => void;
  hideToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const newNotification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const showNotification = (notification: Notification) => {
    const newNotification = {
      ...notification,
      duration: notification.duration || 5000 // Default duration of 5 seconds
    };

    setNotifications(prev => [...prev, newNotification]);

    // Automatically remove the notification after duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== newNotification));
    }, newNotification.duration);
  };

  // Toast methods
  const showToast = useCallback(
    (type: NotificationType, message: string, duration: number = 3500) => {
      setToast({ type, message, visible: true, duration });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => (prev ? { ...prev, visible: false } : null));
  }, []);

  // Auto-hide toast after duration
  React.useEffect(() => {
    if (toast && toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => (prev ? { ...prev, visible: false } : null));
      }, toast.duration || 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    showNotification,
    toast,
    showToast,
    hideToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
