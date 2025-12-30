/**
 * Webhook Security Service
 * Verifies webhook signatures and prevents replay attacks
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';

export class WebhookSecurity {
  /**
   * Verify Flutterwave webhook signature
   */
  static verifyFlutterwaveWebhook(
    signature: string,
    payload: string,
    secretHash: string
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secretHash)
        .update(payload)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify Inlomax webhook signature
   */
  static verifyInlomaxWebhook(
    signature: string,
    payload: string,
    apiKey: string
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha512', apiKey)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Inlomax webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Extract and verify webhook from request
   */
  static async verifyWebhookRequest(
    request: NextRequest,
    provider: 'flutterwave' | 'inlomax'
  ): Promise<{ isValid: boolean; payload: Record<string, any> | null; error?: string }> {
    try {
      const body = await request.text();
      const signature = request.headers.get('verif-hash') ||
        request.headers.get('x-signature') || '';

      if (!signature) {
        return {
          isValid: false,
          payload: null,
          error: 'Missing webhook signature'
        };
      }

      let isValid = false;
      let secretKey = '';

      switch (provider) {
        case 'flutterwave':
          secretKey = process.env.FLUTTERWAVE_SECRET_HASH!;
          isValid = this.verifyFlutterwaveWebhook(signature, body, secretKey);
          break;

        case 'inlomax':
          secretKey = process.env.INLOMAX_WEBHOOK_SECRET!;
          isValid = this.verifyInlomaxWebhook(signature, body, secretKey);
          break;

        default:
          return {
            isValid: false,
            payload: null,
            error: 'Unknown webhook provider'
          };
      }

      if (!isValid) {
        return {
          isValid: false,
          payload: null,
          error: 'Invalid webhook signature'
        };
      }

      const payload = JSON.parse(body);

      // Additional validation
      if (!payload || typeof payload !== 'object') {
        return {
          isValid: false,
          payload: null,
          error: 'Invalid webhook payload'
        };
      }

      return {
        isValid: true,
        payload
      };

    } catch (error) {
      console.error('Webhook verification error:', error);
      return {
        isValid: false,
        payload: null,
        error: 'Webhook processing failed'
      };
    }
  }

  /**
   * Prevent replay attacks by checking timestamp
   */
  static isWebhookTimestampValid(
    timestamp: number,
    toleranceSeconds: number = 300 // 5 minutes
  ): boolean {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - timestamp);

    return diff <= toleranceSeconds;
  }

  /**
   * Rate limit webhook endpoints
   */
  static async checkWebhookRateLimit(
    _provider: string,
    _identifier: string,
    _maxRequests: number = 100,
    _windowSeconds: number = 3600
  ): Promise<boolean> {
    // Implementation would use Redis or database
    // For now, return true (allow all)
    return true;
  }
}

// Middleware for webhook routes
export async function webhookMiddleware(
  request: NextRequest,
  provider: 'flutterwave' | 'inlomax'
) {
  // Verify webhook signature
  const verification = await WebhookSecurity.verifyWebhookRequest(request, provider);

  if (!verification.isValid || !verification.payload) {
    console.error(`Webhook verification failed for ${provider}:`, verification.error);
    return new Response(
      JSON.stringify({ error: 'Webhook verification failed' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check timestamp if available
  if (verification.payload.timestamp) {
    const isValidTimestamp = WebhookSecurity.isWebhookTimestampValid(
      verification.payload.timestamp
    );

    if (!isValidTimestamp) {
      console.error(`Webhook timestamp invalid for ${provider}`);
      return new Response(
        JSON.stringify({ error: 'Webhook timestamp invalid' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return verification.payload;
}