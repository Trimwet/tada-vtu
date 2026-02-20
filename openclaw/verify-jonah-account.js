#!/usr/bin/env node
/**
 * Verify Jonah's account status for OpenClaw
 */

const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
      process.env[key] = value;
    }
  }
});

console.log('Loaded env vars:', {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
});

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAccount() {
  console.log('🔍 Checking account for phone: 09063546728\n');

  // Check with normalized format
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone_number, is_active, balance')
    .eq('phone_number', '09063546728')
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('Code:', error.code);
    
    if (error.code === 'PGRST116') {
      console.log('\n⚠️  No account found with phone number: 09063546728');
      console.log('Trying alternative formats...\n');
      
      // Try with +234 prefix
      const { data: data2, error: error2 } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone_number, is_active, balance')
        .eq('phone_number', '+2349063546728')
        .single();
        
      if (data2) {
        console.log('✅ Found with +234 format:', JSON.stringify(data2, null, 2));
      } else {
        console.log('❌ Not found with +234 format either');
        
        // Search by email
        const { data: data3 } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone_number, is_active, balance')
          .eq('email', 'jonahmafuyai81@gmail.com')
          .single();
          
        if (data3) {
          console.log('\n✅ Found by email:', JSON.stringify(data3, null, 2));
          console.log('\n⚠️  ISSUE: Phone number in database:', data3.phone_number);
          console.log('Expected: 09063546728 or +2349063546728');
        }
      }
    }
    return;
  }

  console.log('✅ Account found!');
  console.log(JSON.stringify(data, null, 2));
  
  if (!data.is_active) {
    console.log('\n⚠️  WARNING: Account is marked as INACTIVE');
  }
  
  if (!data.phone_number) {
    console.log('\n⚠️  WARNING: Phone number is NULL in database');
  }
}

verifyAccount().catch(console.error);
