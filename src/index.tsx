import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tailwind.css';
import './index.css';
// Import the Firestore fix before any other Firebase imports
import './lib/applyFirestoreFix';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Analytics } from '@vercel/analytics/react';
import { trackEvent } from './utils/analytics';
import ErrorBoundary from './components/ErrorBoundary';
import { handleApiError, handlePermissionError } from './middleware/errorHandling';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
// Setup global error handlers
window.onerror = (message, source, lineno, colno, error) => {
  trackEvent('global_error', {
    error_message: message,
    error_source: source,
    error_line: lineno,
    error_column: colno,
    error_stack: error?.stack
  });
};

// Handle unhandled promise rejections
window.onunhandledrejection = (event) => {
  const error = event.reason;
  if (error?.code === 403) {
    handlePermissionError(error);
  } else {
    handleApiError(error);
  }
};

root.render(
  <React.StrictMode>
    <React.Suspense fallback={null}>
      <ErrorBoundary>
        <Analytics />
        <App />
      </ErrorBoundary>
    </React.Suspense>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals((metric) => {
  // Send metrics to Firebase Analytics
  trackEvent('web_vital', {
    metric_name: metric.name,
    metric_value: metric.value
  });
});
