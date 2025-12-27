#!/usr/bin/env node

// Manual credit script for failed webhook processing
// Usage: node scripts/manual-credit.js <user_email> <amount> <reference>

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      const value = line.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function manualCredit(userEmail, amount, reference = null) {
  try {
    console.log(`Processing manual credit for ${userEmail}: ₦${amount}`);

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, balance, full_name')
      .eq('email', userEmail)
      .single();

    if (profileError || !profile) {
      console.error('User not found:', userEmail);
      return;
    }

    console.log(`Found user: ${profile.full_name} (${profile.id})`);
    console.log(`Current balance: ₦${profile.balance}`);

    // Calculate new balance
    const creditAmount = parseFloat(amount);
    const newBalance = (profile.balance || 0) + creditAmount;

    // Update balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Failed to update balance:', updateError);
      return;
    }

    // Create transaction record
    const txReference = reference || `MANUAL-${Date.now()}-${profile.id.slice(0, 8)}`;
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: profile.id,
        type: 'deposit',
        amount: creditAmount,
        status: 'success',
        description: 'Manual credit - Bank transfer (webhook failed)',
        reference: txReference,
        external_reference: 'MANUAL_CREDIT',
        response_data: {
          payment_type: 'bank_transfer',
          manual_credit: true,
          credited_by: 'admin',
          original_amount: creditAmount,
        }
      });

    if (txError) {
      console.error('Failed to create transaction:', txError);
      return;
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'success',
      title: 'Wallet Credited! 💰',
      message: `₦${creditAmount.toLocaleString()} has been manually added to your wallet.`,
    });

    console.log(`✅ Successfully credited ₦${creditAmount} to ${userEmail}`);
    console.log(`New balance: ₦${newBalance}`);
    console.log(`Transaction reference: ${txReference}`);

  } catch (error) {
    console.error('Manual credit failed:', error);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/manual-credit.js <user_email> <amount> [reference]');
  console.log('Example: node scripts/manual-credit.js user@example.com 200 "Bank transfer 26/12/2024"');
  process.exit(1);
}

const [userEmail, amount, reference] = args;
manualCredit(userEmail, amount, reference);