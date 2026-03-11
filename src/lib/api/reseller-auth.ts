import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

export interface ResellerApiKey {
  id: string;
  user_id: string;
  api_key: string;
  api_secret: string;
  name: string;
  is_active: boolean;
  rate_limit: number;
  monthly_limit: number;
  monthly_usage: number;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
  apiKey?: ResellerApiKey;
}

/**
 * Validate a reseller API key
 * @param apiKey - The API key from the X-API-Key header
 * @param apiSecret - The API secret from the X-API-Secret header (optional but recommended)
 */
export async function validateResellerApiKey(
  apiKey: string,
  apiSecret?: string
): Promise<ApiKeyValidationResult> {
  if (!apiKey) {
    return {
      valid: false,
      error: 'API key is required',
      statusCode: 401,
    };
  }

  try {
    const supabase = getSupabaseAdmin();

    // Find the API key in the database
    const { data: keyData, error: keyError } = await supabase
      .from('reseller_api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (keyError || !keyData) {
      return {
        valid: false,
        error: 'Invalid API key',
        statusCode: 401,
      };
    }

    const apiKeyRecord = keyData as ResellerApiKey;

    // Check if API key is active
    if (!apiKeyRecord.is_active) {
      return {
        valid: false,
        error: 'API key is inactive',
        statusCode: 403,
      };
    }

    // Check if API key has expired
    if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
      return {
        valid: false,
        error: 'API key has expired',
        statusCode: 403,
      };
    }

    // Verify API secret if provided
    if (apiSecret && apiKeyRecord.api_secret !== apiSecret) {
      return {
        valid: false,
        error: 'Invalid API secret',
        statusCode: 401,
      };
    }

    // Check monthly usage limit
    if (apiKeyRecord.monthly_usage >= apiKeyRecord.monthly_limit) {
      return {
        valid: false,
        error: 'Monthly API key limit exceeded',
        statusCode: 429,
      };
    }

    // Update last used timestamp
    await supabase
      .from('reseller_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyRecord.id);

    return {
      valid: true,
      apiKey: apiKeyRecord,
    };
  } catch (error) {
    console.error('[API-KEY-VALIDATION] Error:', error);
    return {
      valid: false,
      error: 'Failed to validate API key',
      statusCode: 500,
    };
  }
}

/**
 * Update the monthly usage for an API key
 */
export async function updateApiKeyUsage(
  apiKeyId: string,
  amount: number
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.rpc('increment_api_key_usage', {
      p_api_key_id: apiKeyId,
      p_amount: amount,
    });

    if (error) {
      // Fallback: direct update
      const { data: key } = await supabase
        .from('reseller_api_keys')
        .select('monthly_usage')
        .eq('id', apiKeyId)
        .single();

      if (key) {
        await supabase
          .from('reseller_api_keys')
          .update({ monthly_usage: (key.monthly_usage || 0) + amount })
          .eq('id', apiKeyId);
      }
    }

    return true;
  } catch (error) {
    console.error('[API-KEY-USAGE] Error:', error);
    return false;
  }
}

/**
 * Generate a new API key and secret
 */
export function generateApiCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = `tada_live_${Date.now()}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  const apiSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  
  return { apiKey, apiSecret };
}
