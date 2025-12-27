#!/usr/bin/env node

// Webhook debugging script
// Usage: node scripts/debug-webhook.js

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

async function debugWebhook() {
  try {
    console.log('🔍 TADA VTU Webhook Debug Report');
    console.log('================================\n');

    // 1. Check virtual accounts
    console.log('1. Virtual Accounts:');
    const { data: virtualAccounts, error: vaError } = await supabase
      .from('virtual_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (vaError) {
      console.error('❌ Error fetching virtual accounts:', vaError);
    } else {
      console.log(`✅ Found ${virtualAccounts.length} active virtual accounts`);
      virtualAccounts.forEach(va => {
        console.log(`   - ${va.account_number} (${va.bank_name}) - User: ${va.user_id.slice(0, 8)}...`);
        if (va.is_temporary) {
          console.log(`     TEMP: ₦${va.expected_amount} expires ${va.expires_at}`);
        }
      });
    }

    // 2. Check recent transactions
    console.log('\n2. Recent Deposit Transactions (last 10):');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      console.error('❌ Error fetching transactions:', txError);
    } else {
      console.log(`✅ Found ${transactions.length} recent deposits`);
      transactions.forEach(tx => {
        console.log(`   - ${tx.created_at}: ₦${tx.amount} (${tx.status}) - ${tx.description}`);
        console.log(`     Ref: ${tx.reference} | External: ${tx.external_reference || 'N/A'}`);
      });
    }

    // 3. Check for failed/pending deposits today
    console.log('\n3. Today\'s Deposit Activity:');
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTx, error: todayError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'deposit')
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false });

    if (todayError) {
      console.error('❌ Error fetching today\'s transactions:', todayError);
    } else {
      console.log(`✅ Found ${todayTx.length} deposits today`);
      const successful = todayTx.filter(tx => tx.status === 'success').length;
      const pending = todayTx.filter(tx => tx.status === 'pending').length;
      const failed = todayTx.filter(tx => tx.status === 'failed').length;
      
      console.log(`   Success: ${successful} | Pending: ${pending} | Failed: ${failed}`);
    }

    // 4. Environment check
    console.log('\n4. Environment Configuration:');
    console.log(`✅ Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : '❌ Missing'}`);
    console.log(`✅ Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : '❌ Missing'}`);
    console.log(`✅ Flutterwave Secret: ${process.env.FLUTTERWAVE_SECRET_KEY ? 'Set' : '❌ Missing'}`);
    console.log(`✅ Webhook Secret: ${process.env.FLUTTERWAVE_WEBHOOK_SECRET ? 'Set' : '❌ Missing'}`);

    // 5. Webhook URL test
    console.log('\n5. Webhook Endpoint Test:');
    try {
      const response = await fetch('https://tadavtu.com/api/flutterwave/webhook');
      const result = await response.json();
      console.log(`✅ Webhook endpoint accessible: ${response.status}`);
      console.log(`   Response: ${result.message}`);
    } catch (error) {
      console.error('❌ Webhook endpoint not accessible:', error.message);
    }

    console.log('\n================================');
    console.log('Debug complete! 🎯');

  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugWebhook();