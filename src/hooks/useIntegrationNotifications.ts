import { useEffect } from 'react';
import { useIntegration } from '../context/IntegrationContext';
import { useNotification } from '../context/NotificationContext';

export const useIntegrationNotifications = () => {
  const { xero, paypal, stripe, bank } = useIntegration();
  const { addNotification } = useNotification();

  useEffect(() => {
    if (xero.connected) {
      addNotification('success', '🧾 Xero integration connected successfully');
    }
  }, [xero.connected, addNotification]);

  useEffect(() => {
    if (paypal.connected) {
      addNotification('success', '💸 PayPal integration connected successfully');
    }
  }, [paypal.connected, addNotification]);

  useEffect(() => {
    if (stripe.connected) {
      addNotification('success', '📈 Stripe integration connected successfully');
    }
  }, [stripe.connected, addNotification]);

  useEffect(() => {
    if (bank.connected) {
      addNotification('success', '🏦 Bank integration connected successfully');
    }
  }, [bank.connected, addNotification]);

  // Add transaction notifications
  useEffect(() => {
    const handleNewTransaction = (amount: number, source: string) => {
      addNotification(
        'info',
        `New ${source} transaction: ${amount.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        })}`
      );
    };

    // Here you would set up listeners for new transactions from each integration
    // This is a placeholder for the actual implementation
    const cleanup = () => {
      // Remove event listeners when component unmounts
    };

    return cleanup;
  }, [addNotification]);
};