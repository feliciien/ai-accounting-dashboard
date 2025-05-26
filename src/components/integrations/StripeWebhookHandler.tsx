import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface StripeWebhookHandlerProps {
  className?: string;
}

interface WebhookEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: any;
  };
}

const StripeWebhookHandler: React.FC<StripeWebhookHandlerProps> = ({ 
  className = ''
}) => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [latestEvent, setLatestEvent] = useState<WebhookEvent | null>(null);

  // Fetch initial webhook events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!currentUser) return;

      try {
        setIsLoading(true);
        setError(null);

        // Get the auth token
        const token = await currentUser.getIdToken();

        // Fetch recent webhook events
        const response = await fetch('/api/stripe/webhook-events', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch webhook events');
        }

        const data = await response.json();
        setEvents(data.events || []);
      } catch (err) {
        console.error('Error fetching webhook events:', err);
        setError('Failed to load webhook events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [currentUser]);

  // Setup WebSocket connection for real-time events
  useEffect(() => {
    if (!currentUser) return;

    // This would be replaced with actual WebSocket implementation
    // For demo purposes, we'll simulate incoming events
    const simulateWebhookEvent = () => {
      const eventTypes = [
        'charge.succeeded',
        'invoice.payment_succeeded',
        'customer.subscription.created',
        'payment_intent.succeeded'
      ];
      
      const randomEvent = {
        id: `evt_${Math.random().toString(36).substring(2, 10)}`,
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            amount: Math.floor(Math.random() * 10000) / 100,
            currency: 'usd'
          }
        }
      };

      // Add to events list
      setEvents(prev => [randomEvent, ...prev.slice(0, 9)]);
      
      // Show notification
      setLatestEvent(randomEvent);
      setShowNotification(true);
      
      // Hide notification after 5 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
    };

    // In a real implementation, you would connect to a WebSocket here
    // For demo, we'll just set up a timer to simulate events
    const timer = setInterval(() => {
      // 10% chance of a new event every 30 seconds
      if (Math.random() < 0.1) {
        simulateWebhookEvent();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [currentUser]);

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Get event description
  const getEventDescription = (event: WebhookEvent) => {
    switch (event.type) {
      case 'charge.succeeded':
        return `Payment of $${event.data.object.amount} ${event.data.object.currency.toUpperCase()} was successful`;
      case 'invoice.payment_succeeded':
        return `Invoice payment of $${event.data.object.amount} ${event.data.object.currency.toUpperCase()} succeeded`;
      case 'customer.subscription.created':
        return 'New subscription was created';
      case 'payment_intent.succeeded':
        return `Payment intent of $${event.data.object.amount} ${event.data.object.currency.toUpperCase()} succeeded`;
      default:
        return `${event.type} event received`;
    }
  };

  // Get event icon
  const getEventIcon = (eventType: string) => {
    if (eventType.includes('succeeded') || eventType.includes('created')) {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    } else if (eventType.includes('failed') || eventType.includes('deleted')) {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Notifications</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-full mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Notifications</h2>
        <div className="bg-red-100 text-red-800 p-4 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast notification for new events */}
      {showNotification && latestEvent && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-md animate-slide-up z-50 border-l-4 border-green-500">
          <div className="flex items-center">
            {getEventIcon(latestEvent.type)}
            <div className="ml-3">
              <h3 className="font-medium text-gray-800">New Payment Activity</h3>
              <p className="text-sm text-gray-600">{getEventDescription(latestEvent)}</p>
              <p className="text-xs text-gray-500 mt-1">{formatDate(latestEvent.created)}</p>
            </div>
            <button 
              onClick={() => setShowNotification(false)}
              className="ml-auto text-gray-400 hover:text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Payment Notifications</h2>
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Live Updates</span>
        </div>
        
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start p-3 hover:bg-gray-50 rounded-md transition-colors">
                {getEventIcon(event.type)}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-800">{getEventDescription(event)}</p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-500">{formatDate(event.created)}</span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-xs font-medium text-purple-600">{event.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No webhook events received yet</p>
        )}
      </div>
    </>
  );
};

export default StripeWebhookHandler;