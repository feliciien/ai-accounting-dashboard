import React from 'react';
import { AnomalyAlert } from '../lib/anomalyDetection';

interface AlertBannerProps {
  alerts: AnomalyAlert[];
}

const AlertBanner: React.FC<AlertBannerProps> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  const getSeverityStyles = (severity: AnomalyAlert['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-danger-50 text-danger-800 border-danger-200';
      case 'medium':
        return 'bg-warning-50 text-warning-800 border-warning-200';
      case 'low':
        return 'bg-primary-50 text-primary-800 border-primary-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: AnomalyAlert['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-danger-100 text-danger-600';
      case 'medium':
        return 'bg-warning-100 text-warning-600';
      case 'low':
        return 'bg-primary-100 text-primary-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getIcon = (type: AnomalyAlert['type']) => {
    switch (type) {
      case 'revenue_drop':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      case 'expense_spike':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'balance_warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <div
          key={`${alert.type}-${index}`}
          className={`p-4 border rounded-xl shadow-card mb-2 ${getSeverityStyles(alert.severity)}`}
        >
          <div className="flex items-start">
            <div className={`flex-shrink-0 mr-3 p-2 rounded-full ${getSeverityIcon(alert.severity)}`}>
              {getIcon(alert.type)}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">{alert.title}</h3>
              <div className="mt-1 text-sm opacity-90">{alert.message}</div>
              {alert.recommendation && (
                <div className="mt-2 text-sm font-medium">
                  Recommendation: {alert.recommendation}
                </div>
              )}
            </div>
            <button className="ml-4 text-gray-400 hover:text-gray-500 focus:outline-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertBanner;