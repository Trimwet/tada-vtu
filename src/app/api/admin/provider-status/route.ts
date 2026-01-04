import { NextResponse } from 'next/server';
import { getProviderStatus, Provider } from '@/lib/api/provider-router';
import { createClient } from '@/lib/supabase/server';

// GET /api/admin/provider-status - Get current provider health status
export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin role (you may want to add an is_admin column to users table)
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    // Simple admin check - you can customize this
    const adminEmails = ['jonahmafuyai@gmail.com']; // Add your admin emails
    if (!userData || !adminEmails.includes((userData as { email: string }).email)) {
      return NextResponse.json(
        { status: 'error', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const status = getProviderStatus();

    return NextResponse.json({
      status: 'success',
      data: status,
    });
  } catch (error) {
    console.error('Provider status error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to get provider status' },
      { status: 500 }
    );
  }
}

// POST /api/admin/provider-status - Reset provider health
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    const adminEmails = ['jonahmafuyai@gmail.com'];
    if (!userData || !adminEmails.includes((userData as { email: string }).email)) {
      return NextResponse.json(
        { status: 'error', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { provider } = await request.json();

    if (!provider || provider !== 'inlomax') {
      return NextResponse.json(
        { status: 'error', message: 'Invalid provider' },
        { status: 400 }
      );
    }

    // resetProviderHealth removed as it's no longer needed for Inlomax-only
    // but we can clear the plans cache as a form of "reset"
    const { clearPlansCache } = await import('@/lib/api/provider-router');
    clearPlansCache();

    return NextResponse.json({
      status: 'success',
      message: `${provider} cache cleared successfully`,
      data: getProviderStatus(),
    });
  } catch (error) {
    console.error('Provider reset error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to reset provider' },
      { status: 500 }
    );
  }
}
