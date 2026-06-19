import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/admin-auth';
import { sendPinResetNotificationEmail } from '@/lib/email';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

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

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, full_name, role')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

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

        const newBalance = (user.balance || 0) + fundAmount;
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', userId);

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
        if (!user.pin) {
          return NextResponse.json({
            success: true,
            message: 'User already has no transaction PIN set',
            alreadyReset: true
          });
        }

        if (!user.email) {
          return NextResponse.json({
            error: 'User has no email address. Cannot send notification.'
          }, { status: 400 });
        }

        await supabase
          .from('profiles')
          .update({ pin: null, updated_at: new Date().toISOString() })
          .eq('id', userId);

        let emailSent = false;
        try {
          const emailResult = await sendPinResetNotificationEmail({
            recipientEmail: user.email,
            recipientName: user.full_name || 'User',
            adminName: admin.full_name
          });
          emailSent = emailResult.success;
        } catch (emailError) {
          console.error('Failed to send PIN reset email:', emailError);
        }

        return NextResponse.json({
          success: true,
          message: emailSent
            ? 'User PIN has been reset and notification email sent successfully'
            : 'User PIN has been reset (email notification failed)',
          emailSent,
          resetAt: new Date().toISOString()
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
