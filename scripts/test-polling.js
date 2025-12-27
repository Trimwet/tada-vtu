#!/usr/bin/env node

// Test the polling system manually
const https = require('https');

console.log('🧪 Testing transfer polling system...\n');

const options = {
  hostname: 'www.tadavtu.com',
  path: '/api/cron/process-transfers',
  method: 'GET',
  headers: {
    'User-Agent': 'TADA-VTU-Polling-Test'
  }
};

console.log('📡 Calling polling endpoint:', `https://${options.hostname}${options.path}`);

const req = https.request(options, (res) => {
  console.log(`\n📊 Response Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📋 Response:', JSON.stringify(response, null, 2));
      
      if (response.status === 'success') {
        console.log(`\n✅ Polling successful!`);
        console.log(`   Processed: ${response.processed} transfers`);
        console.log(`   Period: ${response.checked_period}`);
        console.log(`   Total found: ${response.total_found}`);
        
        if (response.processed > 0) {
          console.log('\n🎉 New transfers were processed! Check your wallet balance.');
        } else {
          console.log('\n💡 No new transfers found. This is normal if all transfers are already processed.');
        }
      } else {
        console.log('❌ Polling failed:', response.message);
      }
    } catch (e) {
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Polling test failed:', e.message);
  console.log('\n💡 Make sure:');
  console.log('1. The polling endpoint is deployed');
  console.log('2. Environment variables are set');
  console.log('3. System_settings table exists in Supabase');
});

req.end();