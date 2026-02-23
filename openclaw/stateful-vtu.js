#!/usr/bin/env node

/**
 * TADA VTU Stateful Command System - ENHANCED VERSION
 * With caching, quick buy, and smart features
 */

const https = require('https');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.OPENCLAW_API_KEY || 'oc_tada_2024_secure_key_change_in_production';

// Enhanced logging
const DEBUG = process.env.NODE_ENV !== 'production';
function log(message, data = null) {
  if (DEBUG) {
    console.log(`[TADA-VTU] ${new Date().toISOString()} - ${message}`, data || '');
  }
}

// ============= CACHING LAYER =============
const cache = {
  plans: new Map(),
  users: new Map(),
  lastCleanup: Date.now()
};

const CACHE_TTL = {
  PLANS: 3600000,      // 1 hour
  USER: 300000,        // 5 minutes
  BALANCE: 30000       // 30 seconds
};

function getCached(type, key) {
  const item = cache[type].get(key);
  if (!item) return null;
  
  const ttl = CACHE_TTL[type.toUpperCase()];
  if (Date.now() - item.timestamp > ttl) {
    cache[type].delete(key);
    return null;
  }
  
  return item.data;
}

function setCache(type, key, data) {
  cache[type].set(key, {
    data: data,
    timestamp: Date.now()
  });
}

// Clean up cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [type, store] of Object.entries(cache)) {
    if (type === 'lastCleanup') continue;
    for (const [key, item] of store.entries()) {
      const ttl = CACHE_TTL[type.toUpperCase()] || 300000;
      if (now - item.timestamp > ttl) {
        store.delete(key);
      }
    }
  }
  cache.lastCleanup = now;
}, 60000); // Every minute

// ============= SESSION MANAGEMENT =============
const sessions = new Map();
const SESSION_TIMEOUT = 15 * 60 * 1000;

// User preferences for smart defaults
const userPreferences = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [phone, session] of sessions.entries()) {
    if (now - session.lastUpdated > SESSION_TIMEOUT) {
      sessions.delete(phone);
    }
  }
}, 60000);

const STATES = {
  IDLE: 'idle',
  CHECKING_USER: 'checking_user',
  AWAITING_EMAIL_CHECK: 'awaiting_email_check',
  AWAITING_EXISTING_PIN: 'awaiting_existing_pin',
  AWAITING_NEW_EMAIL: 'awaiting_new_email',
  AWAITING_PIN_FOR_LINK: 'awaiting_pin_for_link',
  AWAITING_NETWORK: 'awaiting_network',
  AWAITING_DATA_TYPE: 'awaiting_data_type',
  AWAITING_PLAN: 'awaiting_plan',
  AWAITING_PHONE: 'awaiting_phone',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  AWAITING_PIN: 'awaiting_pin',
  AWAITING_AIRTIME_AMOUNT: 'awaiting_airtime_amount',
  AWAITING_AIRTIME_PHONE: 'awaiting_airtime_phone',
  AWAITING_AIRTIME_NETWORK: 'awaiting_airtime_network'
};

const DATA_TYPES = {
  'gifting': {
    name: 'Gifting Plans',
    keywords: ['gifting']
  },
  'talkmore': {
    name: 'Talkmore Plans', 
    keywords: ['talkmore']
  },
  'data_share': {
    name: 'Data Share Plans',
    keywords: ['data share', 'data_share']
  },
  'corporate': {
    name: 'Corporate Gifting',
    keywords: ['corporate gifting', 'corporate_gifting', 'corporate']
  },
  'social': {
    name: 'Social Bundles',
    keywords: ['social bundles', 'social_bundles', 'social']
  },
  'awoof': {
    name: 'Awoof Plans',
    keywords: ['awoof']
  },
  'all': {
    name: 'All Plans',
    keywords: ['all', 'popular']
  },
  'browse': {
    name: 'Browse All Plans',
    keywords: ['browse', 'view all', 'see all', 'complete list']
  }
};

function formatDataTypeMenu() {
  let menu = '';
  Object.entries(DATA_TYPES).forEach((entry, i) => {
    const [key, type] = entry;
    menu += `${i + 1}. ${type.name}\n`;
  });
  return menu.trim();
}

const NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];

function categorizePlansByType(plans, selectedType) {
  if (!selectedType || selectedType === 'all') {
    return plans.slice(0, 15);
  }
  
  if (selectedType === 'browse') {
    // Show ALL plans with pagination
    return plans.slice(0, 20); // Show more plans for browsing
  }
  
  const typeConfig = DATA_TYPES[selectedType];
  if (!typeConfig) return plans.slice(0, 15);
  
  let filteredPlans = plans.filter(plan => {
    const planName = (plan.name || plan.planName || plan.description || '').toLowerCase();
    const planCategory = (plan.category || plan.type || '').toLowerCase();
    const fullText = `${planName} ${planCategory}`;
    
    return typeConfig.keywords.some(keyword => 
      fullText.includes(keyword.toLowerCase()) || 
      planCategory.includes(keyword.toLowerCase()) ||
      planName.includes(keyword.toLowerCase())
    );
  });
  
  return filteredPlans.length > 0 ? filteredPlans.slice(0, 15) : plans.slice(0, 10);
}

function parseDataTypeSelection(input) {
  const lowerInput = input.toLowerCase().trim();
  
  // Handle numeric selection (1-8)
  if (/^[1-8]$/.test(lowerInput)) {
    const index = parseInt(lowerInput) - 1;
    const types = Object.keys(DATA_TYPES);
    return types[index];
  }
  
  // Handle "all" for popular plans
  if (lowerInput === 'all' || lowerInput === 'popular') {
    return 'all';
  }
  
  // Handle "browse" for all plans
  if (lowerInput === 'browse' || lowerInput === 'view all' || lowerInput === 'see all') {
    return 'browse';
  }
  
  // Handle direct type name matching
  for (const [key, type] of Object.entries(DATA_TYPES)) {
    if (lowerInput === key || lowerInput === type.name.toLowerCase()) {
      return key;
    }
    
    // Check if input matches any keywords
    if (type.keywords.some(keyword => lowerInput.includes(keyword) || keyword.includes(lowerInput))) {
      return key;
    }
  }
  
  return null;
}

function normalizePhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('0')) {
    // Already correct
  } else if (cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
}

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : require('http');
    
    const options = {
      hostname: url.hostname,
      port: isHttps ? 443 : (url.port || 3000),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TADA-VTU-OpenClaw/2.0.0'
      },
      timeout: 30000
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          log(`API Response [${res.statusCode}]: ${path}`, parsed);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          log(`API Response [${res.statusCode}]: ${path} - Raw: ${data}`);
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      log(`API Error: ${path}`, error.message);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      log(`API Timeout: ${path}`);
      reject(new Error('Request timeout'));
    });

    if (body) {
      const bodyStr = JSON.stringify(body);
      log(`API Request: ${method} ${path}`, body);
      req.write(bodyStr);
    }

    req.end();
  });
}

function getSession(phoneNumber) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  let session = sessions.get(normalizedPhone);
  
  if (!session) {
    session = {
      state: STATES.IDLE,
      data: {},
      lastUpdated: Date.now(),
      phone: normalizedPhone
    };
    sessions.set(normalizedPhone, session);
  }
  
  session.lastUpdated = Date.now();
  return session;
}

function formatNetworkMenu() {
  return NETWORKS.map((net, i) => `${i + 1}. ${net}`).join('\n');
}

// ============= ENHANCED WITH CACHING =============
async function getDataPlans(network) {
  // Check cache first
  const cached = getCached('plans', network);
  if (cached) {
    log(`Cache hit for ${network} plans`);
    return cached;
  }
  
  try {
    log(`Fetching ${network} plans from API`);
    const response = await makeRequest(`/api/openclaw/pricing?network=${network}`);
    
    if (response.status === 200 && response.data && response.data.success) {
      const plans = response.data.plans || [];
      setCache('plans', network, plans);
      return plans;
    }
    return [];
  } catch (error) {
    console.error('Error fetching plans:', error);
    return [];
  }
}

function formatPlanMenu(plans) {
  if (plans.length === 0) {
    return "No plans available for this category.";
  }
  
  let menu = '';
  
  plans.forEach((plan, i) => {
    const planName = plan.name || plan.planName || plan.description || 'Data Plan';
    const planAmount = plan.price || plan.amount || plan.cost || 0;
    const validity = plan.validity || plan.duration || '';
    
    // Don't truncate plan names - show full description for social plans
    let displayName = planName;
    
    // For social plans, keep the full description to show TikTok, WhatsApp, etc.
    if (planName.toLowerCase().includes('social') || 
        planName.toLowerCase().includes('tiktok') || 
        planName.toLowerCase().includes('whatsapp') ||
        planName.toLowerCase().includes('facebook') ||
        planName.toLowerCase().includes('instagram')) {
      displayName = planName; // Keep full name
    } else if (displayName.length > 50) {
      displayName = displayName.substring(0, 50) + '...';
    }
    
    menu += `${i + 1}. ${displayName}\n`;
    menu += `   Price: N${planAmount.toLocaleString()}`;
    if (validity) {
      menu += ` | Validity: ${validity}`;
    }
    menu += '\n\n';
  });
  
  return menu.trim();
}

async function checkUserByPhone(phoneNumber) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  // Check cache
  const cached = getCached('users', normalizedPhone);
  if (cached) {
    log(`Cache hit for user ${normalizedPhone}`);
    return cached;
  }
  
  try {
    const response = await makeRequest(`/api/openclaw/user/check-phone?phone=${encodeURIComponent(normalizedPhone)}`);
    
    if (response.status === 200 && response.data && response.data.success) {
      const result = {
        found: response.data.found || false,
        linked: response.data.whatsappLinked || false,
        userId: response.data.userId,
        email: response.data.email,
        name: response.data.fullName || response.data.name,
        balance: response.data.balance || 0,
        userData: response.data
      };
      
      if (result.found) {
        setCache('users', normalizedPhone, result);
      }
      
      return result;
    }
    
    return { found: false, linked: false };
  } catch (error) {
    console.error('Error checking user by phone:', error);
    return { found: false, linked: false };
  }
}

async function checkUserByEmail(email) {
  try {
    const response = await makeRequest(`/api/openclaw/user/check-email?email=${encodeURIComponent(email.toLowerCase())}`);
    
    if (response.status === 200 && response.data && response.data.success) {
      return {
        found: response.data.found || false,
        userId: response.data.userId,
        email: response.data.email,
        name: response.data.fullName || response.data.name,
        balance: response.data.balance || 0,
        userData: response.data
      };
    }
    
    return { found: false };
  } catch (error) {
    console.error('Error checking user by email:', error);
    return { found: false };
  }
}

async function linkWhatsAppWithPin(phoneNumber, email, pin) {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const response = await makeRequest('/api/openclaw/user/link-whatsapp-pin', 'POST', {
      phone: normalizedPhone,
      email: email.toLowerCase(),
      pin: pin
    });
    
    if (response.status === 200 && response.data && response.data.success) {
      return {
        success: true,
        user: response.data.user
      };
    }
    
    return {
      success: false,
      message: response.data?.message || 'Invalid PIN or linking failed'
    };
  } catch (error) {
    console.error('Error linking WhatsApp with PIN:', error);
    return {
      success: false,
      message: 'Service unavailable'
    };
  }
}

async function identifyUser(phoneNumber) {
  const phoneCheck = await checkUserByPhone(phoneNumber);
  if (phoneCheck.found && phoneCheck.linked) {
    return {
      userId: phoneCheck.userId,
      fullName: phoneCheck.name,
      balance: phoneCheck.balance
    };
  }
  return null;
}

// ============= SMART FEATURES =============

// Save user preferences
function saveUserPreference(phone, key, value) {
  if (!userPreferences.has(phone)) {
    userPreferences.set(phone, {});
  }
  userPreferences.get(phone)[key] = value;
}

function getUserPreference(phone, key) {
  const prefs = userPreferences.get(phone);
  return prefs ? prefs[key] : null;
}

// Quick buy parser - "buy mtn 1gb 08012345678"
function parseQuickBuy(message) {
  // Pattern: buy [network] [data_amount] [phone]
  const pattern = /buy\s+(mtn|glo|airtel|9mobile)\s+(\d+(?:gb|mb))\s+(0\d{10})/i;
  const match = message.match(pattern);
  
  if (match) {
    return {
      quick: true,
      network: match[1].toUpperCase(),
      dataSize: match[2].toLowerCase(),
      phone: match[3]
    };
  }
  return null;
}

// Search plans by size
function searchPlansBySize(plans, sizeQuery) {
  return plans.filter(plan => {
    const name = (plan.name || plan.planName || '').toLowerCase();
    return name.includes(sizeQuery.toLowerCase());
  });
}

function normalizeInput(input) {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\/@.-]/g, '')
    .trim();
  
  // Quick command aliases
  const commandMap = {
    'hi': '/start',
    'hello': '/start', 
    'hey': '/start',
    'menu': '/start',
    'main': '/start',
    'home': '/start',
    'b': '/buy',
    'd': '/buy',
    'data': '/buy',
    'purchase': '/buy',
    'a': '/airtime',
    'recharge': '/airtime',
    'topup': '/airtime',
    'top-up': '/airtime',
    'wallet': '/balance',
    'bal': '/balance',
    'h': '/history',
    'transactions': '/history',
    'trans': '/history',
    'stop': '/cancel',
    'quit': '/cancel',
    'exit': '/cancel'
  };
  
  return commandMap[cleaned] || cleaned;
}

async function handleMessage(message, phoneNumber = '') {
  const session = getSession(phoneNumber);
  const lowerMsg = normalizeInput(message);

  log(`Incoming message from ${phoneNumber}: "${message}" (State: ${session.state})`);

  // Check for quick buy command
  if (lowerMsg.startsWith('buy ') && lowerMsg.includes('0')) {
    const quickBuy = parseQuickBuy(message);
    if (quickBuy) {
      const user = await identifyUser(phoneNumber);
      if (!user) {
        return "You're not registered with TADA VTU.\n\nType /start to connect your account.";
      }
      
      // Fetch plans and search
      const plans = await getDataPlans(quickBuy.network);
      const matchingPlans = searchPlansBySize(plans, quickBuy.dataSize);
      
      if (matchingPlans.length === 0) {
        return `No ${quickBuy.dataSize} plans found for ${quickBuy.network}.\n\nType /buy for all available plans.`;
      }
      
      // Setup session for quick confirmation
      session.state = STATES.AWAITING_PLAN;
      session.data = {
        type: 'data',
        user: user,
        network: quickBuy.network,
        targetPhone: quickBuy.phone,
        availablePlans: matchingPlans,
        quickBuy: true
      };
      
      return `Found ${matchingPlans.length} ${quickBuy.dataSize} plan(s) for ${quickBuy.network}:\n\n${formatPlanMenu(matchingPlans)}\n\nSelect plan number or type /cancel`;
    }
  }

  if (lowerMsg === '/cancel' || lowerMsg === 'cancel') {
    sessions.delete(session.phone);
    log(`Session cancelled for ${phoneNumber}`);
    return "Operation cancelled.\n\nType /help to see available commands.";
  }

  if (lowerMsg === '/help' || lowerMsg === 'help') {
    return `TADA VTU Commands:

/start - Start/restart session
/balance - Check wallet balance  
/buy - Buy data (guided menu)
/airtime - Buy airtime
/history - View transactions
/cancel - Cancel operation
/help - Show this menu

Quick Buy: "buy mtn 1gb 08012345678"

Need help? Visit https://www.tadavtu.com`;
  }

  if (lowerMsg === '/start' || lowerMsg === 'start') {
    sessions.delete(session.phone);
    const newSession = getSession(phoneNumber);
    newSession.state = STATES.CHECKING_USER;
    
    log(`Starting new session for ${phoneNumber}`);
    
    const phoneCheck = await checkUserByPhone(phoneNumber);
    
    if (phoneCheck.found && phoneCheck.linked) {
      newSession.authenticated = true;
      newSession.userData = phoneCheck.userData;
      newSession.state = STATES.IDLE;
      
      log(`Authenticated user found: ${phoneCheck.name}`);
      
      return `Welcome back, ${phoneCheck.name || 'Valued Customer'}!

Your balance: N${phoneCheck.balance?.toLocaleString() || '0'}

Quick Actions:
- Type "buy" for data plans
- Type "airtime" for airtime top-up  
- Type "balance" to check wallet
- Type "history" for transactions

Tip: Use "buy mtn 1gb 08012345678" for instant purchase

How can I help you today?`;
    }
    else if (phoneCheck.found && !phoneCheck.linked) {
      newSession.state = STATES.AWAITING_PIN_FOR_LINK;
      newSession.userData = phoneCheck.userData;
      newSession.linkEmail = phoneCheck.email;
      
      log(`Unlinking user found: ${phoneCheck.email}`);
      
      return `Hi ${phoneCheck.name || 'there'}!

I found your account: ${phoneCheck.email}

To link this WhatsApp number, please enter your 4-digit PIN:

(If this isn't your account, type /cancel)`;
    }
    else {
      newSession.state = STATES.AWAITING_EMAIL_CHECK;
      
      log(`New user detected: ${phoneNumber}`);
      
      return `Welcome to TADA VTU!

I couldn't find this WhatsApp number in our system.

Do you have an existing account?

YES - Enter your registered email address
NEW - Type "new" to create an account

(Type /cancel to exit)`;
    }
  }

  if (lowerMsg === '/balance' || lowerMsg === 'balance') {
    const user = await identifyUser(phoneNumber);
    if (!user) {
      return "You're not registered with TADA VTU.\n\nType /start to connect your account.";
    }
    
    try {
      const response = await makeRequest(`/api/openclaw/user/balance?userId=${user.userId}`);
      if (response.status === 200 && response.data && response.data.success) {
        const balance = response.data.balance || 0;
        return `Hello ${user.fullName}!\n\nYour current balance is N${balance.toLocaleString()}`;
      }
      return "Could not fetch balance. Please try again.";
    } catch (error) {
      return "Service unavailable. Please try again later.";
    }
  }

  if (lowerMsg === '/history' || lowerMsg === 'history') {
    const user = await identifyUser(phoneNumber);
    if (!user) {
      return "You're not registered with TADA VTU.\n\nType /start to connect your account.";
    }
    
    try {
      const response = await makeRequest(`/api/openclaw/transactions/recent?userId=${user.userId}`);
      if (response.status === 200 && response.data && response.data.success) {
        const transactions = response.data.transactions || [];
        
        if (transactions.length === 0) {
          return "No transactions found.\n\nStart by typing /buy to purchase data!";
        }

        const list = transactions.slice(0, 5).map((tx, i) => {
          // More comprehensive status mapping
          let status = '[PENDING]';
          const txStatus = (tx.status || '').toLowerCase();
          
          if (txStatus === 'completed' || txStatus === 'success' || txStatus === 'successful') {
            status = '[SUCCESS]';
          } else if (txStatus === 'failed' || txStatus === 'failure' || txStatus === 'error') {
            status = '[FAILED]';
          } else if (txStatus === 'pending' || txStatus === 'processing' || txStatus === 'initiated') {
            status = '[PENDING]';
          }
          
          let date = '';
          const dateValue = tx.created_at || tx.createdAt || tx.date || tx.timestamp || tx.created;
          
          if (dateValue) {
            try {
              let dateObj;
              if (typeof dateValue === 'number') {
                dateObj = new Date(dateValue < 10000000000 ? dateValue * 1000 : dateValue);
              } else {
                dateObj = new Date(dateValue);
              }
              
              if (!isNaN(dateObj.getTime())) {
                date = dateObj.toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
              }
            } catch (e) {
              // Ignore date parsing errors
            }
          }
          
          const type = tx.type || 'purchase';
          const network = tx.network || '';
          const amount = tx.amount || 0;
          
          const dateStr = date ? ` (${date})` : '';
          return `${i + 1}. ${status} ${type} ${network} - N${amount}${dateStr}`;
        }).join('\n');

        return `Recent Transactions:\n\n${list}\n\nType /buy to make a new purchase!`;
      }
      return "Could not fetch transaction history.";
    } catch (error) {
      return "Service unavailable. Please try again later.";
    }
  }

  if (lowerMsg === '/buy' || lowerMsg === 'buy' || lowerMsg === 'buy data' || lowerMsg === 'data') {
    const user = await identifyUser(phoneNumber);
    if (!user) {
      return "You're not registered with TADA VTU.\n\nType /start to connect your account.";
    }
    
    // Check for smart default (last used number)
    const lastPhone = getUserPreference(phoneNumber, 'lastPurchasePhone');
    
    session.state = STATES.AWAITING_NETWORK;
    session.data = { type: 'data', user: user };
    
    let smartMsg = '';
    if (lastPhone && lastPhone !== phoneNumber) {
      smartMsg = `\n\nLast purchase was for: ${lastPhone}\nReply "same" to use same number`;
    }
    
    return `Data Purchase

Hello ${user.fullName}!
Balance: N${user.balance.toLocaleString()}

Choose your network:
${formatNetworkMenu()}${smartMsg}

Reply with number (1-4) or network name
Type /cancel to abort`;
  }

  if (lowerMsg === '/airtime' || lowerMsg === 'airtime') {
    const user = await identifyUser(phoneNumber);
    if (!user) {
      return "You're not registered with TADA VTU.\n\nType /start to connect your account.";
    }
    
    session.state = STATES.AWAITING_AIRTIME_AMOUNT;
    session.data = { type: 'airtime', user: user };
    
    return `Airtime Purchase\n\nHello ${user.fullName}!\nBalance: N${user.balance.toLocaleString()}\n\nHow much airtime do you want to buy?\n\nEnter amount (N50 - N50,000):`;
  }

  // State handlers continue...
  switch (session.state) {
    case STATES.AWAITING_NETWORK:
      let selectedNetwork;
      if (/^[1-4]$/.test(lowerMsg)) {
        const index = parseInt(lowerMsg) - 1;
        selectedNetwork = NETWORKS[index];
      } else {
        let match = NETWORKS.find(n => n.toLowerCase() === lowerMsg);
        
        if (!match) {
          match = NETWORKS.find(n => 
            n.toLowerCase().includes(lowerMsg) || 
            lowerMsg.includes(n.toLowerCase())
          );
        }
        
        if (!match) {
          const variations = {
            '9mobile': '9MOBILE',
            'nine mobile': '9MOBILE',
            'ninemobile': '9MOBILE',
            'etisalat': '9MOBILE',
            'mtn': 'MTN',
            'glo': 'GLO',
            'airtel': 'AIRTEL'
          };
          match = variations[lowerMsg];
        }
        
        if (match) selectedNetwork = match;
      }

      if (!selectedNetwork) {
        return `Invalid selection.\n\nChoose network:\n${formatNetworkMenu()}\n\nReply with number (1-4) or network name.`;
      }

      session.data.network = selectedNetwork;
      session.state = STATES.AWAITING_DATA_TYPE;

      return `${selectedNetwork} Data Plans

Choose your plan type:

${formatDataTypeMenu()}

Reply with number (1-8) or type name
Type "all" to see popular plans
Type "browse" to see ALL plans
Type /cancel to abort`;

    case STATES.AWAITING_DATA_TYPE:
      const selectedDataType = parseDataTypeSelection(lowerMsg);
      
      if (!selectedDataType) {
        return `Invalid selection.\n\nChoose data type:\n${formatDataTypeMenu()}\n\nReply with number (1-7) or type name.`;
      }

      const allPlans = await getDataPlans(session.data.network);
      if (allPlans.length === 0) {
        return `No data plans available for ${session.data.network}.\n\nPlease try another network.`;
      }

      const filteredPlans = categorizePlansByType(allPlans, selectedDataType);
      session.data.availablePlans = filteredPlans;
      session.data.dataType = selectedDataType;
      session.state = STATES.AWAITING_PLAN;

      const typeName = selectedDataType === 'all' ? 'Popular Plans' : 
                       selectedDataType === 'browse' ? 'All Available Plans' : 
                       DATA_TYPES[selectedDataType]?.name || 'Plans';

      return `${session.data.network} - ${typeName}

${formatPlanMenu(filteredPlans)}

Reply with plan number (1-${filteredPlans.length})
Type "back" to choose different type
Type /cancel to abort`;

    case STATES.AWAITING_PLAN:
      if (lowerMsg === 'back') {
        session.state = STATES.AWAITING_DATA_TYPE;
        return `${session.data.network} Data Plans

Choose your plan type:

${formatDataTypeMenu()}

Reply with number (1-8) or type name
Type "all" to see popular plans
Type "browse" to see ALL plans
Type /cancel to abort`;
      }

      const availablePlans = session.data.availablePlans || [];
      let selectedPlan;

      if (/^\d+$/.test(lowerMsg)) {
        const index = parseInt(lowerMsg) - 1;
        if (index >= 0 && index < availablePlans.length) {
          selectedPlan = availablePlans[index];
        }
      }

      if (!selectedPlan) {
        return `Invalid plan selection.\n\nChoose from:\n${formatPlanMenu(availablePlans)}\n\nReply with plan number (1-${availablePlans.length}).\nType "back" to choose different type`;
      }

      const planAmount = selectedPlan.price || selectedPlan.amount || selectedPlan.cost || 0;
      const planName = selectedPlan.name || selectedPlan.planName || selectedPlan.description || 'Data Plan';

      session.data.plan = selectedPlan;
      session.data.planAmount = planAmount;
      session.data.planName = planName;
      
      // If quick buy, skip to confirmation
      if (session.data.quickBuy && session.data.targetPhone) {
        session.state = STATES.AWAITING_CONFIRMATION;
        return `Purchase Summary:\n\nNetwork: ${session.data.network}\nPlan: ${planName}\nPrice: N${planAmount}\nPhone: ${session.data.targetPhone}\n\nReply "confirm" to proceed or "cancel" to abort.`;
      }
      
      session.state = STATES.AWAITING_PHONE;
      
      // Smart default for phone number
      const lastPhone = getUserPreference(session.phone, 'lastPurchasePhone');
      let phoneMsg = 'Enter the phone number to send data to:\n\nFormat: 09063546728';
      if (lastPhone) {
        phoneMsg = `Enter phone number or reply "same" for ${lastPhone}:`;
      }

      return `Selected: ${planName}\nPrice: N${planAmount}\n\n${phoneMsg}`;

    case STATES.AWAITING_PHONE:
      // Handle "same" for smart default
      if (lowerMsg === 'same') {
        const lastPhone = getUserPreference(session.phone, 'lastPurchasePhone');
        if (lastPhone) {
          session.data.targetPhone = lastPhone;
          session.state = STATES.AWAITING_CONFIRMATION;
          return `Purchase Summary:\n\nNetwork: ${session.data.network}\nPlan: ${session.data.planName}\nPrice: N${session.data.planAmount}\nPhone: ${lastPhone}\n\nReply "confirm" to proceed or "cancel" to abort.`;
        }
      }
      
      const phoneInput = lowerMsg.replace(/\D/g, '');
      
      if (!/^(0\d{10}|234\d{10}|\d{10})$/.test(phoneInput)) {
        return "Invalid phone number.\n\nUse format: 09063546728\n\nPlease try again:";
      }

      const normalizedTargetPhone = normalizePhoneNumber(phoneInput);
      session.data.targetPhone = normalizedTargetPhone;
      session.state = STATES.AWAITING_CONFIRMATION;
      
      // Save as last used phone
      saveUserPreference(session.phone, 'lastPurchasePhone', normalizedTargetPhone);

      return `Purchase Summary:\n\nNetwork: ${session.data.network}\nPlan: ${session.data.planName}\nPrice: N${session.data.planAmount}\nPhone: ${normalizedTargetPhone}\n\nReply "confirm" to proceed or "cancel" to abort.`;

    case STATES.AWAITING_CONFIRMATION:
      const confirmWords = ['confirm', 'yes', 'y', 'ok', 'okay', 'proceed', 'continue', '1'];
      const cancelWords = ['cancel', 'no', 'n', 'stop', 'abort', '0'];
      
      if (confirmWords.includes(lowerMsg)) {
        if (session.data.user.balance < session.data.planAmount) {
          sessions.delete(session.phone);
          return `Insufficient balance!

You have: N${session.data.user.balance.toLocaleString()}
Need: N${session.data.planAmount.toLocaleString()}

Fund your wallet at https://tadavtu.com
Type /buy to try again.`;
        }
        
        session.state = STATES.AWAITING_PIN;
        return `Enter your 4-digit transaction PIN to complete purchase:`;
      } else if (cancelWords.includes(lowerMsg)) {
        sessions.delete(session.phone);
        return "Purchase cancelled.\n\nType /buy to start a new purchase.";
      } else {
        return `Please choose an option:

YES or CONFIRM - to proceed
NO or CANCEL - to abort

Purchase Summary:
- Network: ${session.data.network}
- Plan: ${session.data.planName}  
- Price: N${session.data.planAmount.toLocaleString()}
- Phone: ${session.data.targetPhone}`;
      }

    case STATES.AWAITING_PIN:
      if (!/^\d{4}$/.test(lowerMsg)) {
        return "PIN must be exactly 4 digits.\n\nPlease enter your transaction PIN:";
      }

      try {
        const orderResponse = await makeRequest('/api/openclaw/orders/create', 'POST', {
          userId: session.data.user.userId,
          phone: session.data.targetPhone,
          network: session.data.network,
          planId: session.data.plan.id,
          planName: session.data.planName,
          amount: session.data.planAmount
        });

        if (!orderResponse.data || !orderResponse.data.success) {
          sessions.delete(session.phone);
          return `Order creation failed: ${orderResponse.data?.message || 'Unknown error'}\n\nPlease try again with /buy`;
        }

        const executeResponse = await makeRequest('/api/openclaw/orders/execute', 'POST', {
          orderId: orderResponse.data.orderId,
          pin: lowerMsg
        });

        sessions.delete(session.phone);

        if (executeResponse.data && executeResponse.data.success) {
          const reference = executeResponse.data.reference || 'N/A';
          return `Purchase Successful!\n\n${session.data.planName} ${session.data.network} data sent to ${session.data.targetPhone}\n\nReference: ${reference}\n\nThank you for using TADA VTU!`;
        } else {
          return `Purchase failed: ${executeResponse.data?.message || 'Unknown error'}\n\nYour wallet was not charged. Please try again with /buy`;
        }
      } catch (error) {
        sessions.delete(session.phone);
        return "An error occurred during purchase.\n\nPlease try again with /buy or contact support.";
      }

    case STATES.AWAITING_AIRTIME_AMOUNT:
      const amount = parseInt(lowerMsg);
      
      if (isNaN(amount) || amount < 50 || amount > 50000) {
        return "Invalid amount.\n\nEnter amount between N50 and N50,000:";
      }

      if (session.data.user.balance < amount) {
        sessions.delete(session.phone);
        return `Insufficient balance!\n\nYou have: N${session.data.user.balance}\nNeed: N${amount}\n\nPlease fund your wallet at https://tadavtu.com`;
      }

      session.data.amount = amount;
      session.state = STATES.AWAITING_AIRTIME_NETWORK;

      return `Airtime: N${amount}\n\nSelect network:\n${formatNetworkMenu()}\n\nReply with number (1-4) or network name.`;

    case STATES.AWAITING_AIRTIME_NETWORK:
      let airtimeNetwork;
      if (/^[1-4]$/.test(lowerMsg)) {
        const index = parseInt(lowerMsg) - 1;
        airtimeNetwork = NETWORKS[index];
      } else {
        const match = NETWORKS.find(n => n.toLowerCase() === lowerMsg);
        if (match) airtimeNetwork = match;
      }

      if (!airtimeNetwork) {
        return `Invalid selection.\n\nChoose network:\n${formatNetworkMenu()}\n\nReply with number (1-4) or network name.`;
      }

      session.data.network = airtimeNetwork;
      session.state = STATES.AWAITING_AIRTIME_PHONE;

      return `${airtimeNetwork} Airtime: N${session.data.amount}\n\nEnter the phone number:\n\nFormat: 09063546728`;

    case STATES.AWAITING_AIRTIME_PHONE:
      const airtimePhoneInput = lowerMsg.replace(/\D/g, '');
      
      if (!/^(0\d{10}|234\d{10}|\d{10})$/.test(airtimePhoneInput)) {
        return "Invalid phone number.\n\nUse format: 09063546728\n\nPlease try again:";
      }

      const normalizedAirtimePhone = normalizePhoneNumber(airtimePhoneInput);
      session.data.targetPhone = normalizedAirtimePhone;
      session.state = STATES.AWAITING_CONFIRMATION;

      return `Airtime Summary:\n\nNetwork: ${session.data.network}\nAmount: N${session.data.amount}\nPhone: ${normalizedAirtimePhone}\n\nReply "confirm" to proceed or "cancel" to abort.`;

    case STATES.AWAITING_EMAIL_CHECK:
      if (lowerMsg === 'new') {
        session.state = STATES.AWAITING_NEW_EMAIL;
        return `Great! Let's create your new account.

Please enter your email address:`;
      }

      if (!lowerMsg.includes('@') || !lowerMsg.includes('.')) {
        return `Please enter a valid email address, or type "new" to create an account.`;
      }

      const emailCheck = await checkUserByEmail(lowerMsg);
      
      if (emailCheck.found) {
        session.state = STATES.AWAITING_EXISTING_PIN;
        session.linkEmail = lowerMsg;
        session.userData = emailCheck.userData;
        
        return `Account found: ${emailCheck.name || 'User'}

To link this WhatsApp number to your account, please enter your PIN:

(If this isn't your account, type /cancel)`;
      } else {
        return `No account found with email: ${lowerMsg}

Would you like to:
1 - Try another email
2 - Create a new account

Reply with 1 or 2`;
      }

    case STATES.AWAITING_EXISTING_PIN:
    case STATES.AWAITING_PIN_FOR_LINK:
      if (!/^\d{4}$/.test(lowerMsg)) {
        return "PIN must be exactly 4 digits.\n\nPlease enter your TADA VTU PIN:";
      }

      const linkResult = await linkWhatsAppWithPin(phoneNumber, session.linkEmail, lowerMsg);
      
      if (linkResult.success) {
        session.authenticated = true;
        session.userData = linkResult.user;
        session.state = STATES.IDLE;
        
        return `WhatsApp linked successfully!

Welcome back, ${linkResult.user.fullName || 'Valued Customer'}!

Your balance: N${linkResult.user.balance?.toLocaleString() || '0'}

Type /buy to start purchasing or /help for all commands.`;
      } else {
        sessions.delete(session.phone);
        return `${linkResult.message}

Please try again with /start or contact support.`;
      }

    case STATES.AWAITING_NEW_EMAIL:
      sessions.delete(session.phone);
      return `Account creation is coming soon!

For now, please visit https://tadavtu.com to create your account, then return here and type /start to link it.

Thank you for your patience!`;

    default:
      return `Welcome to TADA VTU!

Available commands:
/start - Start your session
/help - Show all commands

Type /start to begin!`;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const message = args.join(' ');
  const phone = process.env.USER_PHONE || '09063546728';

  if (!message) {
    console.log('Usage: node stateful-vtu-enhanced.js <message>');
    console.log('Example: node stateful-vtu-enhanced.js "buy mtn 1gb 08012345678"');
    process.exit(1);
  }

  handleMessage(message, phone)
    .then(response => {
      console.log(response);
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

module.exports = { handleMessage };
