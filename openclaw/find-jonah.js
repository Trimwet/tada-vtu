#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  }
});

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findJonah() {
  console.log('🔍 Searching for Jonah account...\n');

  // Search by email
  const { data: byEmail } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone_number, is_active, balance')
    .eq('email', 'jonahmafuyai81@gmail.com')
    .single();

  if (byEmail) {
    console.log('✅ Found by email (jonahmafuyai81@gmail.com):');
    console.log(JSON.stringify(byEmail, null, 2));
    console.log('\n📱 Phone number in database:', byEmail.phone_number);
  } else {
    console.log('❌ No account found with email jonahmafuyai81@gmail.com');
  }

  // Search by name containing "jonah"
  console.log('\n🔍 Searching by name containing "jonah"...');
  const { data: byName } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone_number, is_active, balance')
    .ilike('full_name', '%jonah%');

  if (byName && byName.length > 0) {
    console.log(`\n✅ Found ${byName.length} account(s) with "jonah" in name:`);
    byName.forEach((acc, i) => {
      console.log(`\n${i + 1}.`, JSON.stringify(acc, null, 2));
    });
  }
}

findJonah().catch(console.error);
