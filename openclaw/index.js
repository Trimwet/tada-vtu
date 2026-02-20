#!/usr/bin/env node

/**
 * OpenClaw Skill Entry Point for TADA VTU
 * This is the main executable that OpenClaw will call
 */

const https = require('https');

// Configuration
const BASE_URL = 'https://www.tadavtu.com';
const API_KEY = process.env.OPENCLAW_API_KEY || 'oc_tada_2024_secure_key_change_in_production';

// In-memory session storage (in production, this should be persistent)
let userSession = null;

// Simple HTTP request helper
function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Identify user and get session
async function identifyUser(phoneNumber) {
  try {
    const response = await makeRequest(
      `/api/openclaw/user/identify?whatsapp=${encodeURIComponent(phoneNumber)}`,
      'GET'
    );

    if (response.status === 200 && response.data && response.data.success) {
      // Data is at root level, not nested
      const userData = response.data;
      
      // Check if user is registered
      if (!userData.isRegistered) {
        console.error('[INFO] User not registered. Please register at tadavtu.com');
        return false;
      }

      userSession = {
        userId: userData.userId,
        phone: phoneNumber,
        fullName: userData.fullName,
        balance: userData.balance
      };
      return true;
    }
    
    console.error('[ERROR] Identify failed:', response.status, response.data);
    return false;
  } catch (error) {
    console.error('[ERROR] Identify exception:', error);
    return false;
  }
}

// Main handler
async function handleMessage(message, phoneNumber = '08012345678') {
  const lowerMessage = message.toLowerCase();

  try {
    // Ensure user is identified
    if (!userSession) {
      const identified = await identifyUser(phoneNumber);
      if (!identified) {
        return '❌ Unable to identify user. Please try again.';
      }
    }

    // Check balance
    if (lowerMessage.includes('balance')) {
      const response = await makeRequest(
        `/api/openclaw/user/balance?userId=${userSession.userId}`
      );
      
      console.error('[DEBUG] Balance response:', JSON.stringify(response, null, 2));
      
      if (response.status === 200 && response.data && response.data.success) {
        // Data is spread at root level by openclawSuccess
        const balance = response.data.balance || 0;
        return `💰 Your current balance is ₦${balance.toLocaleString()}`;
      }
      return `❌ Unable to fetch balance: ${response.data?.message || 'Unknown error'}`;
    }

    // Check history
    if (lowerMessage.includes('history') || lowerMessage.includes('transaction')) {
      const response = await makeRequest(
        `/api/openclaw/transactions/recent?userId=${userSession.userId}`
      );
      
      if (response.status === 200 && response.data && response.data.success) {
        // Check both possible response structures
        const transactions = response.data.transactions || response.data.data?.transactions || [];
        
        if (transactions.length === 0) {
          return "You haven't made any transactions yet.";
        }

        const list = transactions.slice(0, 5).map((tx, i) => {
          const status = tx.status === 'completed' ? '✅' : tx.status === 'failed' ? '❌' : '⏳';
          const date = new Date(tx.created_at).toLocaleDateString();
          return `${i + 1}. ${status} ${tx.type} - ${tx.network} - ₦${tx.amount} (${date})`;
        }).join('\n');

        return `📊 Your recent transactions:\n\n${list}`;
      }
      return `❌ Unable to fetch transaction history: ${response.data?.message || 'Unknown error'}`;
    }

    // Help
    if (lowerMessage.includes('help')) {
      return `👋 I'm your TADA VTU assistant! Here's what I can do:

📱 Buy Airtime: "Buy ₦500 MTN airtime for 08012345678"
📶 Buy Data: "Get 2GB Airtel data for 08012345678"
💰 Check Balance: "What's my balance?"
📊 View History: "Show my recent transactions"

Just tell me what you need!`;
    }

    // Default response
    return `I can help you with:
• Buying airtime
• Buying data  
• Checking your balance
• Viewing transaction history

What would you like to do?`;

  } catch (error) {
    console.error('Error:', error);
    return `❌ An error occurred: ${error.message}`;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const message = args.join(' ');

  if (!message) {
    console.log('Usage: node index.js <message> [phone_number]');
    process.exit(1);
  }

  // Optional phone number as second argument
  const phoneNumber = process.env.USER_PHONE || '08012345678';

  handleMessage(message, phoneNumber)
    .then(response => {
      console.log(response);
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

module.exports = { handleMessage, identifyUser };
