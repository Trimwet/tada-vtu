#!/usr/bin/env node

// Get Vercel IP ranges for whitelisting
const https = require('https');

console.log('🌐 Getting Vercel IP ranges for Flutterwave whitelist...\n');

// Vercel's official IP ranges endpoint
const options = {
  hostname: 'api.vercel.com',
  path: '/v1/edge-config/vercel-ips',
  method: 'GET',
  headers: {
    'User-Agent': 'TADA-VTU-Webhook-Setup'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const ipData = JSON.parse(data);
      
      console.log('📋 Vercel IP Ranges to Whitelist in Flutterwave:');
      console.log('================================================\n');
      
      if (ipData.ranges) {
        console.log('🔹 IPv4 Ranges:');
        ipData.ranges.forEach(range => {
          console.log(`   ${range}`);
        });
      }
      
      if (ipData.ipv6) {
        console.log('\n🔹 IPv6 Ranges:');
        ipData.ipv6.forEach(range => {
          console.log(`   ${range}`);
        });
      }
      
      console.log('\n💡 Instructions:');
      console.log('1. Copy all the IP ranges above');
      console.log('2. Go to Flutterwave Dashboard → Settings → Whitelisted IP addresses');
      console.log('3. Add each IP range to the whitelist');
      console.log('4. Save the settings');
      console.log('5. Test with a small transfer (₦100)');
      
      console.log('\n⚠️  Alternative (Less Secure):');
      console.log('If the above doesn\'t work, temporarily remove all IP restrictions');
      console.log('to test if whitelisting is the issue.');
      
    } catch (e) {
      console.error('❌ Failed to parse Vercel IP data');
      console.log('📄 Raw response:', data);
      
      // Fallback - provide known Vercel IP ranges
      console.log('\n📋 Known Vercel IP Ranges (Fallback):');
      console.log('=====================================');
      const knownRanges = [
        '76.76.19.0/24',
        '76.223.126.0/24', 
        '13.107.42.14/32',
        '13.107.213.70/32'
      ];
      
      knownRanges.forEach(range => {
        console.log(`   ${range}`);
      });
      
      console.log('\n💡 Add these to Flutterwave whitelist as a starting point.');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Failed to fetch Vercel IPs:', e.message);
  
  // Provide manual instructions
  console.log('\n📋 Manual Solution:');
  console.log('==================');
  console.log('1. Go to Flutterwave Dashboard → Settings → Whitelisted IP addresses');
  console.log('2. Temporarily REMOVE all IP restrictions (leave empty)');
  console.log('3. Test webhook with a small transfer');
  console.log('4. If it works, the issue was IP whitelisting');
  console.log('5. Contact Vercel support for current IP ranges to whitelist');
});

req.end();