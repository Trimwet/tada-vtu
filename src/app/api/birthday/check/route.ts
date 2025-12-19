import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BIRTHDAY_BONUSES } from '@/lib/smart-optimizer';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase configuration');
  return createClient(url, serviceKey);
}

// POST - Check and credit birthday bonuses (called by cron job daily)
// Vercel Cron: Add to vercel.json: { "crons": [{ "path": "/api/birthday/check", "schedule": "0 8 * * *" }] }
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional security)
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Format today's date as MM-DD for comparison
    const todayMMDD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    console.log(`[BIRTHDAY] Checking birthdays for ${todayMMDD}`);

    // Find users with birthday today
    // Birthday format in DB could be: YYYY-MM-DD, MM-DD, or MM/DD
    const { data: birthdayUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, birthday, loyalty_tier')
      .not('birthday', 'is', null)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return NextResponse.json({ status: false, message: 'Failed to fetch users' }, { status: 500 });
    }

    if (!birthdayUsers || birthdayUsers.length === 0) {
      return NextResponse.json({
        status: true,
        message: 'No users with birthdays set',
        credited: 0,
      });
    }

    // Filter users whose birthday matches today
    const todaysBirthdays = birthdayUsers.filter(user => {
      if (!user.birthday) return false;
      
      // Handle different date formats
      const birthday = user.birthday;
      let birthdayMMDD: string;
      
      if (birthday.includes('-')) {
        // Format: YYYY-MM-DD or MM-DD
        const parts = birthday.split('-');
        if (parts.length === 3) {
          birthdayMMDD = `${parts[1]}-${parts[2]}`;
        } else if (parts.length === 2) {
          birthdayMMDD = birthday;
        } else {
          return false;
        }
      } else if (birthday.includes('/')) {
        // Format: MM/DD or MM/DD/YYYY
        const parts = birthday.split('/');
        birthdayMMDD = `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      } else {
        return false;
      }
      
      return birthdayMMDD === todayMMDD;
    });

    console.log(`[BIRTHDAY] Found ${todaysBirthdays.length} users with birthday today`);

    const results: Array<{ userId: string; name: string; amount: number; status: string }> = [];

    for (const user of todaysBirthdays) {
      try {
        // Check if already credited this year
        const { data: existingBonus } = await supabase
          .from('birthday_bonuses')
          .select('id')
          .eq('user_id', user.id)
          .eq('year', currentYear)
          .single();

        if (existingBonus) {
          results.push({
            userId: user.id,
            name: user.full_name || 'User',
            amount: 0,
            status: 'already_credited',
          });
          continue;
        }

        // Get bonus amount based on tier
        const tier = user.loyalty_tier || 'bronze';
        const bonusAmount = BIRTHDAY_BONUSES[tier] || BIRTHDAY_BONUSES.bronze;

        // Get current balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();

        if (!profile) continue;

        const newBalance = profile.balance + bonusAmount;

        // Credit the bonus
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', user.id);

        // Record wallet transaction
        await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          type: 'credit',
          amount: bonusAmount,
          description: `🎂 Birthday Bonus (${tier} tier)`,
          reference: `BDAY_${currentYear}_${user.id}`,
          balance_before: profile.balance,
          balance_after: newBalance,
        });

        // Record birthday bonus
        await supabase.from('birthday_bonuses').insert({
          user_id: user.id,
          year: currentYear,
          amount: bonusAmount,
          tier,
        });

        // Send notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '🎂 Happy Birthday!',
          message: `We've added ₦${bonusAmount.toLocaleString()} to your wallet as a birthday gift! Enjoy your special day! 🎉`,
          type: 'success',
        });

        results.push({
          userId: user.id,
          name: user.full_name || 'User',
          amount: bonusAmount,
          status: 'credited',
        });

        console.log(`[BIRTHDAY] Credited ₦${bonusAmount} to ${user.full_name || user.id}`);

      } catch (userError) {
        console.error(`[BIRTHDAY] Error processing user ${user.id}:`, userError);
        results.push({
          userId: user.id,
          name: user.full_name || 'User',
          amount: 0,
          status: 'error',
        });
      }
    }

    const credited = results.filter(r => r.status === 'credited').length;
    const totalAmount = results.reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      status: true,
      message: `Birthday check complete. Credited ${credited} users.`,
      credited,
      totalAmount,
      results,
    });

  } catch (error) {
    console.error('[BIRTHDAY] Check error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}

// GET - Check if current user has birthday bonus available
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ status: false, message: 'Authentication required' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const currentYear = new Date().getFullYear();

    // Check if user has birthday set
    const { data: profile } = await supabase
      .from('profiles')
      .select('birthday, loyalty_tier')
      .eq('id', userId)
      .single();

    if (!profile?.birthday) {
      return NextResponse.json({
        status: true,
        data: {
          hasBirthday: false,
          message: 'Set your birthday in profile settings to receive a birthday bonus!',
        },
      });
    }

    // Check if already received this year
    const { data: existingBonus } = await supabase
      .from('birthday_bonuses')
      .select('amount, credited_at')
      .eq('user_id', userId)
      .eq('year', currentYear)
      .single();

    if (existingBonus) {
      return NextResponse.json({
        status: true,
        data: {
          hasBirthday: true,
          alreadyReceived: true,
          amount: existingBonus.amount,
          receivedAt: existingBonus.credited_at,
        },
      });
    }

    // Calculate potential bonus
    const tier = profile.loyalty_tier || 'bronze';
    const potentialBonus = BIRTHDAY_BONUSES[tier] || BIRTHDAY_BONUSES.bronze;

    return NextResponse.json({
      status: true,
      data: {
        hasBirthday: true,
        alreadyReceived: false,
        potentialBonus,
        tier,
        message: `You'll receive ₦${potentialBonus.toLocaleString()} on your birthday!`,
      },
    });

  } catch (error) {
    console.error('Birthday GET error:', error);
    return NextResponse.json({ status: false, message: 'An error occurred' }, { status: 500 });
  }
}
