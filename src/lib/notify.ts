// Helper functions to send push notifications from server-side code
// Use these in API routes after successful operations

import type { NotificationType } from './push-notifications';

interface NotifyOptions {
  userId: string;
  type: NotificationType;
  context?: Record<string, unknown>;
  customTitle?: string;
  customBody?: string;
}

/**
 * Send a push notification to a user
 * Call this from server-side API routes
 */
export async function notifyUser(options: NotifyOptions): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.tadavtu.com';
    
    const response = await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: options.userId,
        type: options.type,
        context: options.context,
        customTitle: options.customTitle,
        customBody: options.customBody,
      }),
    });

    const result = await response.json();
    return result.status === true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

/**
 * Notify user of successful transaction
 */
export async function notifyTransactionSuccess(
  userId: string,
  amount: number,
  network: string,
  serviceType: string
): Promise<boolean> {
  return notifyUser({
    userId,
    type: 'transaction_success',
    context: { amount, network, serviceType },
  });
}

/**
 * Notify user of failed transaction
 */
export async function notifyTransactionFailed(
  userId: string,
  serviceType: string
): Promise<boolean> {
  return notifyUser({
    userId,
    type: 'transaction_failed',
    context: { serviceType },
  });
}

/**
 * Notify user of received gift
 */
export async function notifyGiftReceived(
  userId: string,
  amount: number,
  senderName: string
): Promise<boolean> {
  return notifyUser({
    userId,
    type: 'gift_received',
    context: { amount, senderName },
  });
}

/**
 * Notify user of low balance
 */
export async function notifyLowBalance(
  userId: string,
  balance: number
): Promise<boolean> {
  return notifyUser({
    userId,
    type: 'low_balance',
    context: { balance },
  });
}

/**
 * Send promotional notification
 */
export async function notifyPromo(
  userId: string,
  promoTitle: string
): Promise<boolean> {
  return notifyUser({
    userId,
    type: 'promotional',
    context: { promoTitle },
  });
}

/**
 * Send daily tip notification
 */
export async function notifyDailyTip(userId: string): Promise<boolean> {
  return notifyUser({
    userId,
    type: 'daily_tip',
  });
}
