import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onClose: () => void;
  duration?: number; // ms
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-yellow-500 text-gray-900',
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible,
  onClose,
  duration = 3500,
}) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded shadow-lg flex items-center space-x-2 transition-all duration-300 ${typeStyles[type]}`}
      role="alert"
      aria-live="assertive"
      tabIndex={0}
    >
      <span className="font-semibold capitalize">{type}:</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-4 text-lg font-bold focus:outline-none"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
