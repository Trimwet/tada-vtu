#!/usr/bin/env node

// Setup webhook.site test to confirm if Flutterwave is sending webhooks
const https = require('https');

console.log('🧪 Setting up webhook.site test for Flutterwave webhook debugging\n');

// Create a webhook.site URL
const options = {
  hostname: 'webhook.site',
  path: '/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      const webhookUrl = `https://webhook.site/${response.uuid}`;
      
      console.log('✅ Webhook.site URL created successfully!\n');
      console.log('🔗 Test Webhook URL:', webhookUrl);
      console.log('📊 View requests at:', `https://webhook.site/#!/${response.uuid}`);
      
      console.log('\n📋 INSTRUCTIONS:');
      console.log('================');
      console.log('1. Copy this URL:', webhookUrl);
      console.log('2. Go to Flutterwave Dashboard → Settings → Webhooks');
      console.log('3. Replace your webhook URL with the one above');
      console.log('4. Save the settings');
      console.log('5. Make a small test transfer (₦100) to your virtual account');
      console.log('6. Check the webhook.site page to see if Flutterwave sends the webhook');
      console.log('7. If you see the webhook data, the issue is with your server');
      console.log('8. If you see nothing, contact Flutterwave support');
      
      console.log('\n⚠️  IMPORTANT:');
      console.log('- After testing, change the webhook URL back to:');
      console.log('  https://www.tadavtu.com/api/flutterwave/webhook');
      
      console.log('\n🎯 What to look for in webhook.site:');
      console.log('- Event type: "charge.completed"');
      console.log('- Payment type: "bank_transfer"');
      console.log('- Your account number: 8817928367');
      console.log('- Transfer amount: ₦100 (or whatever you send)');
      
    } catch (e) {
      console.error('❌ Failed to create webhook.site URL');
      console.log('📄 Raw response:', data);
      
      // Provide manual instructions
      console.log('\n📋 Manual Alternative:');
      console.log('===================');
      console.log('1. Go to https://webhook.site/');
      console.log('2. Copy the unique URL they provide');
      console.log('3. Use that URL in Flutterwave webhook settings');
      console.log('4. Test with a small transfer');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Failed to connect to webhook.site:', e.message);
  
  console.log('\n📋 Manual Instructions:');
  console.log('=====================');
  console.log('1. Go to https://webhook.site/ in your browser');
  console.log('2. Copy the unique URL (e.g., https://webhook.site/abc123)');
  console.log('3. Go to Flutterwave Dashboard → Settings → Webhooks');
  console.log('4. Replace webhook URL with the webhook.site URL');
  console.log('5. Make a test transfer and check if webhook.site receives it');
});

req.end();