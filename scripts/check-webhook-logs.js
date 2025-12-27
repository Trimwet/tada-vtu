#!/usr/bin/env node

// Check for webhook activity in the last 24 hours
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
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

async function checkWebhookActivity() {
  try {
    console.log('🔍 Checking webhook activity for the last 24 hours...\n');

    // Check for bank transfer deposits in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: bankTransfers, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'deposit')
      .gte('created_at', yesterday)
      .ilike('description', '%bank transfer%')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error checking transactions:', error);
      return;
    }

    console.log(`📊 Bank transfer deposits in last 24h: ${bankTransfers.length}`);
    
    if (bankTransfers.length === 0) {
      console.log('❌ No bank transfer deposits found - webhooks likely not working');
    } else {
      console.log('✅ Found bank transfer deposits:');
      bankTransfers.forEach(tx => {
        console.log(`   - ${tx.created_at}: ₦${tx.amount} (${tx.status})`);
        console.log(`     Description: ${tx.description}`);
        console.log(`     External Ref: ${tx.external_reference || 'N/A'}`);
        console.log('');
      });
    }

    // Check your specific account
    console.log('🎯 Checking your account (jonahmafuyai81@gmail.com):');
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, balance')
      .eq('email', 'jonahmafuyai81@gmail.com')
      .single();

    if (profile) {
      console.log(`   Current balance: ₦${profile.balance}`);
      
      // Check your recent transactions
      const { data: yourTxs } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false });

      console.log(`   Recent transactions: ${yourTxs.length}`);
      yourTxs.forEach(tx => {
        console.log(`   - ${tx.created_at}: ₦${tx.amount} (${tx.type}) - ${tx.description}`);
      });
    }

    // Recommendation
    console.log('\n💡 Recommendation:');
    if (bankTransfers.length === 0) {
      console.log('   The webhook is likely not receiving calls from Flutterwave.');
      console.log('   Try making a small test transfer (₦100) and check if it processes.');
      console.log('   If not, contact Flutterwave support to verify webhook delivery.');
    } else {
      console.log('   Webhooks appear to be working for other users.');
      console.log('   Your specific transfer might have failed due to timing or account matching issues.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkWebhookActivity();