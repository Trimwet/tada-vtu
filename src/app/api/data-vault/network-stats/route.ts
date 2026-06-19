import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('network_reliability_stats')
      .select('*');

    if (error) {
      console.error('[NETWORK-STATS] Error:', error);
      return NextResponse.json({ status: false, message: 'Failed to fetch stats' }, { status: 500 });
    }

    return NextResponse.json({ status: true, data });
  } catch (error) {
    console.error('[NETWORK-STATS] Unexpected error:', error);
    return NextResponse.json({ status: false, message: 'Internal server error' }, { status: 500 });
  }
}
