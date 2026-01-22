import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPinResetNotificationEmail } from '@/lib/email';

function verifyToken(token: string): { valid: boolean; adminId?: string } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) return { valid: false };
    return { valid: true, adminId: payload.id };
  } catch {
    return { valid: false };
  }
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// GET - Get single user details
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { valid } = verifyToken(authHeader.split(' ')[1]);
    if (!valid) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's recent transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ user, transactions: transactions || [] });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Admin actions on users
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { valid, adminId } = verifyToken(authHeader.split(' ')[1]);
    if (!valid || !adminId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { action, userId, amount, reason } = body;

    if (!action || !userId) {
      return NextResponse.json({ error: 'Action and userId required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify admin exists and is active
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, full_name, role')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'fund_wallet': {
        const fundAmount = Number(amount);
        if (!fundAmount || fundAmount <= 0) {
          return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
        }

        // Update balance
        const newBalance = (user.balance || 0) + fundAmount;
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', userId);

        // Create transaction record
        await supabase.from('transactions').insert({
          user_id: userId,
          type: 'deposit',
          amount: fundAmount,
          status: 'success',
          description: `Admin funding${reason ? `: ${reason}` : ''}`,
          reference: `ADMIN_${Date.now()}`,
          metadata: { admin_id: adminId, admin_name: admin.full_name, reason }
        });

        return NextResponse.json({
          success: true,
          message: `₦${fundAmount.toLocaleString()} added to user wallet`,
          newBalance
        });
      }

      case 'debit_wallet': {
        const debitAmount = Number(amount);
        if (!debitAmount || debitAmount <= 0) {
          return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
        }

        if ((user.balance || 0) < debitAmount) {
          return NextResponse.json({ error: 'User has insufficient balance' }, { status: 400 });
        }

        const newBalance = (user.balance || 0) - debitAmount;
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', userId);

        await supabase.from('transactions').insert({
          user_id: userId,
          type: 'debit',
          amount: -debitAmount,
          status: 'success',
          description: `Admin debit${reason ? `: ${reason}` : ''}`,
          reference: `ADMIN_DEBIT_${Date.now()}`,
          metadata: { admin_id: adminId, admin_name: admin.full_name, reason }
        });

        return NextResponse.json({
          success: true,
          message: `₦${debitAmount.toLocaleString()} deducted from user wallet`,
          newBalance
        });
      }

      case 'toggle_status': {
        const newStatus = !user.is_active;
        await supabase
          .from('profiles')
          .update({ is_active: newStatus })
          .eq('id', userId);

        return NextResponse.json({
          success: true,
          message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
          is_active: newStatus
        });
      }

      case 'reset_pin': {
        // Reset the user's PIN
        await supabase
          .from('profiles')
          .update({ pin: null })
          .eq('id', userId);

        // Send email notification to user about PIN reset
        try {
          await sendPinResetNotificationEmail({
            recipientEmail: user.email!,
            recipientName: user.full_name || 'User',
            adminName: admin.full_name
          });
        } catch (emailError) {
          console.error('Failed to send PIN reset email:', emailError);
          // Don't fail the entire operation if email fails
        }

        return NextResponse.json({
          success: true,
          message: 'User PIN has been reset and notification email sent'
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin user action error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
