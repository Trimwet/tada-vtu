import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    reference: string;
    type: 'data' | 'airtime';
    status: 'success' | 'failed' | 'pending';
    network: string;
    phone: string;
    amount: number;
    externalReference?: string;
  };
}

/**
 * Send webhook to a single URL with retry logic
 */
async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string,
  maxRetries: number = 3
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-TADA-Event': payload.event,
    'X-TADA-Timestamp': payload.timestamp,
  };

  // Add signature if secret is provided
  if (secret) {
    const crypto = await import('crypto');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    headers['X-TADA-Signature'] = signature;
  }

  let lastError: string = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, statusCode: response.status };
      }

      lastError = `HTTP ${response.status}: ${response.statusText}`;
      console.log(`[WEBHOOK] Attempt ${attempt} failed for ${url}: ${lastError}`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[WEBHOOK] Attempt ${attempt} failed for ${url}: ${lastError}`);
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  return { success: false, error: lastError };
}

/**
 * Get all active webhooks for a user
 */
async function getUserWebhooks(userId: string): Promise<Array<{ id: string; url: string; events: string[]; secret?: string }>> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('reseller_webhooks')
    .select('id, url, events, secret')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error || !data) {
    console.error('[WEBHOOK] Error fetching webhooks:', error);
    return [];
  }

  return data;
}

/**
 * Log webhook delivery for debugging
 */
async function logWebhookDelivery(
  webhookId: string,
  event: string,
  payload: WebhookPayload,
  response: { success: boolean; statusCode?: number; error?: string }
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase.from('reseller_webhook_logs').insert({
    webhook_id: webhookId,
    event,
    payload: payload as any,
    status: response.success ? 'success' : 'failed',
    status_code: response.statusCode,
    error_message: response.error,
    delivered_at: new Date().toISOString(),
  });
}

/**
 * Send webhook notifications for a transaction
 */
export async function sendTransactionWebhook(
  userId: string,
  transaction: {
    reference: string;
    type: 'data' | 'airtime';
    status: 'success' | 'failed' | 'pending';
    network: string;
    phone: string;
    amount: number;
    external_reference?: string;
  }
): Promise<void> {
  const event = transaction.status === 'success' 
    ? 'transaction.completed' 
    : transaction.status === 'failed' 
    ? 'transaction.failed' 
    : 'transaction.pending';

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data: {
      reference: transaction.reference,
      type: transaction.type,
      status: transaction.status,
      network: transaction.network,
      phone: transaction.phone,
      amount: Math.abs(transaction.amount),
      externalReference: transaction.external_reference,
    },
  };

  const webhooks = await getUserWebhooks(userId);

  // Filter webhooks that subscribe to this event
  const matchingWebhooks = webhooks.filter((webhook) =>
    webhook.events.includes(event)
  );

  console.log(`[WEBHOOK] Sending ${event} to ${matchingWebhooks.length} webhooks`);

  // Send to all matching webhooks in parallel
  const results = await Promise.all(
    matchingWebhooks.map(async (webhook) => {
      const result = await deliverWebhook(webhook.url, payload, webhook.secret);
      
      // Log the delivery
      await logWebhookDelivery(webhook.id, event, payload, result);
      
      return { webhookId: webhook.id, ...result };
    })
  );

  const successful = results.filter((r) => r.success).length;
  console.log(`[WEBHOOK] Delivered to ${successful}/${results.length} webhooks`);
}

/**
 * Create webhook logs table if it doesn't exist
 */
export async function ensureWebhookLogsTable(): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Try to create the table (will fail if already exists, which is fine)
  await supabase.rpc('create_webhook_logs_table', {});
}
