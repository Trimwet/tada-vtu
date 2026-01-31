import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    console.log('[CRON] Processing expired vault items...');

    // Call the improved database function to process expired items
    const { data, error } = await supabase.rpc('process_expired_vault_items');

    if (error) {
      console.error('[CRON] Error processing expired vault items:', error);
      return NextResponse.json(
        { error: 'Failed to process expired items', details: error.message },
        { status: 500 }
      );
    }

    const result = data?.[0] || { processed_count: 0, error_count: 0 };
    
    console.log(`[CRON] Successfully processed expired vault items. Processed: ${result.processed_count}, Errors: ${result.error_count}`);

    return NextResponse.json({
      success: true,
      message: 'Expired vault items processed successfully',
      processedCount: result.processed_count,
      errorCount: result.error_count,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[CRON] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}