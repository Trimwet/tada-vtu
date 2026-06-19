import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_plan_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('service_type', 'data')
      .order('purchase_count', { ascending: false })
      .limit(10);

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json({ plans: [] });
      }
      throw error;
    }

    return NextResponse.json({ plans: data || [] });
  } catch (error) {
    console.error('Frequent plans error:', error);
    return NextResponse.json({ plans: [] });
  }
}
