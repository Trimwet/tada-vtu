#!/usr/bin/env node

// Get the current server IP that Flutterwave sees
const https = require('https');

console.log('🔍 Getting your server\'s public IP...\n');

// Test what IP Flutterwave sees when calling your webhook
const options = {
  hostname: 'httpbin.org',
  path: '/ip',
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const ipData = JSON.parse(data);
      console.log('📍 Your current public IP:', ipData.origin);
      console.log('\n💡 Add this IP to Flutterwave whitelist:');
      console.log(`   ${ipData.origin}`);
      console.log('\n⚠️  Note: Vercel uses dynamic IPs, so this might change.');
      console.log('   Better to remove IP restrictions entirely for webhooks.');
    } catch (e) {
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Failed to get IP:', e.message);
});

req.end();