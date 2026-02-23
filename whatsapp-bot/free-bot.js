const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Import your existing stateful system
const { handleMessage: handleStatefulMessage } = require('../openclaw/stateful-vtu.js');

// ============= ENHANCED LOGGING SYSTEM (NO EXTRA DEPENDENCIES) =============
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m'
};

class Logger {
    static timestamp() {
        return new Date().toLocaleString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    static info(message, data = null) {
        console.log(`${colors.blue}${colors.bright}[INFO]${colors.reset} ${colors.dim}${this.timestamp()}${colors.reset} | ${message}`);
        if (data) console.log(`  ${colors.dim}└─>${colors.reset}`, data);
    }

    static success(message, data = null) {
        console.log(`${colors.green}${colors.bright}[SUCCESS]${colors.reset} ${colors.dim}${this.timestamp()}${colors.reset} | ${message}`);
        if (data) console.log(`  ${colors.dim}└─>${colors.reset}`, data);
    }

    static warning(message, data = null) {
        console.log(`${colors.yellow}${colors.bright}[WARNING]${colors.reset} ${colors.dim}${this.timestamp()}${colors.reset} | ${message}`);
        if (data) console.log(`  ${colors.dim}└─>${colors.reset}`, data);
    }

    static error(message, error = null) {
        console.log(`${colors.red}${colors.bright}[ERROR]${colors.reset} ${colors.dim}${this.timestamp()}${colors.reset} | ${message}`);
        if (error) {
            console.log(`  ${colors.dim}└─> Error:${colors.reset}`, error.message);
            if (error.stack && process.env.NODE_ENV !== 'production') {
                console.log(`  ${colors.dim}└─> Stack:${colors.reset}`, error.stack.split('\n').slice(0, 3).join('\n      '));
            }
        }
    }

    static message(direction, phone, content, status = '') {
        const icon = direction === 'incoming' ? '📩' : '📤';
        const color = direction === 'incoming' ? colors.cyan : colors.magenta;
        const statusText = status ? ` ${colors.green}[${status}]${colors.reset}` : '';
        const truncated = content.length > 80 ? content.substring(0, 80) + '...' : content;
        
        console.log(`${color}${colors.bright}[MESSAGE]${colors.reset} ${colors.dim}${this.timestamp()}${colors.reset} | ${icon} ${direction.toUpperCase()}${statusText}`);
        console.log(`  ${colors.dim}├─ Phone:${colors.reset} ${phone}`);
        console.log(`  ${colors.dim}└─ Content:${colors.reset} "${truncated}"`);
    }

    static metric(name, value, unit = '') {
        console.log(`${colors.magenta}${colors.bright}[METRIC]${colors.reset} ${colors.dim}${this.timestamp()}${colors.reset} | ${colors.bright}${name}:${colors.reset} ${colors.green}${value}${colors.reset}${unit}`);
    }

    static session(action, phone, state = '') {
        const stateText = state ? ` ${colors.dim}→${colors.reset} ${colors.cyan}${state}${colors.reset}` : '';
        console.log(`${colors.white}${colors.bright}[SESSION]${colors.reset} ${colors.dim}${this.timestamp()}${colors.reset} | ${action} for ${phone}${stateText}`);
    }

    static divider(char = '=', length = 60) {
        console.log(colors.dim + char.repeat(length) + colors.reset);
    }

    static box(title) {
        this.divider();
        console.log(`${colors.bright}${title}${colors.reset}`);
        this.divider();
    }
}

// ============= METRICS TRACKING =============
const metrics = {
    startTime: Date.now(),
    messagesReceived: 0,
    messagesProcessed: 0,
    messagesFailed: 0,
    averageResponseTime: [],
    activeUsers: new Set(),
    sessionsByState: {},
    commandUsage: {}
};

function updateMetrics(action, data = {}) {
    switch (action) {
        case 'message_received':
            metrics.messagesReceived++;
            metrics.activeUsers.add(data.phone);
            break;
        case 'message_processed':
            metrics.messagesProcessed++;
            if (data.responseTime) {
                metrics.averageResponseTime.push(data.responseTime);
                if (metrics.averageResponseTime.length > 100) {
                    metrics.averageResponseTime.shift();
                }
            }
            if (data.command) {
                metrics.commandUsage[data.command] = (metrics.commandUsage[data.command] || 0) + 1;
            }
            break;
        case 'message_failed':
            metrics.messagesFailed++;
            break;
    }
}

function getAverageResponseTime() {
    if (metrics.averageResponseTime.length === 0) return 0;
    const sum = metrics.averageResponseTime.reduce((a, b) => a + b, 0);
    return Math.round(sum / metrics.averageResponseTime.length);
}

function getUptime() {
    const uptimeMs = Date.now() - metrics.startTime;
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}

function logHealthMetrics() {
    console.log('');
    Logger.box('📊 BOT HEALTH METRICS');
    Logger.metric('Uptime', getUptime());
    Logger.metric('Messages Received', metrics.messagesReceived);
    Logger.metric('Messages Processed', metrics.messagesProcessed);
    Logger.metric('Messages Failed', metrics.messagesFailed);
    Logger.metric('Active Users (24h)', metrics.activeUsers.size);
    Logger.metric('Avg Response Time', getAverageResponseTime(), 'ms');
    
    const successRate = metrics.messagesReceived > 0 
        ? Math.round((metrics.messagesProcessed / metrics.messagesReceived) * 100) 
        : 0;
    Logger.metric('Success Rate', successRate, '%');
    
    // Show top commands
    const topCommands = Object.entries(metrics.commandUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    if (topCommands.length > 0) {
        Logger.info('🔝 Top Commands:');
        topCommands.forEach(([cmd, count]) => {
            console.log(`  ${colors.dim}├─${colors.reset} ${cmd}: ${colors.green}${count}${colors.reset} uses`);
        });
    }
    
    Logger.divider();
    console.log('');
}

// Log metrics every 5 minutes
setInterval(logHealthMetrics, 5 * 60 * 1000);

// Log metrics every hour with more details
setInterval(() => {
    logHealthMetrics();
    Logger.info('💾 Memory Usage: ' + Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB');
    Logger.info('🔄 Resetting active users counter...');
    metrics.activeUsers.clear();
}, 60 * 60 * 1000);

// ============= PHONE NUMBER NORMALIZATION =============
function normalizeWhatsAppPhone(whatsappId) {
    let phone = whatsappId.replace('@c.us', '');
    
    if (phone.startsWith('234') && phone.length === 13) {
        const normalized = '0' + phone.substring(3);
        Logger.info(`📞 Normalized phone: ${phone} → ${normalized}`);
        return normalized;
    }
    
    if (phone.length === 10 && !phone.startsWith('0')) {
        const normalized = '0' + phone;
        Logger.info(`📞 Normalized phone: ${phone} → ${normalized}`);
        return normalized;
    }
    
    // Custom mappings for specific WhatsApp IDs
    const customMappings = {
        '62028370673687': '09063546728'
    };
    
    if (customMappings[phone]) {
        Logger.info(`🔄 Mapped WhatsApp ID: ${phone} → ${customMappings[phone]}`);
        return customMappings[phone];
    }
    
    return phone;
}

// Extract command from message for metrics
function extractCommand(message) {
    const lowerMsg = message.toLowerCase().trim();
    if (lowerMsg.startsWith('/')) {
        return lowerMsg.split(' ')[0];
    }
    const commands = ['buy', 'start', 'balance', 'history', 'airtime', 'help', 'cancel'];
    for (const cmd of commands) {
        if (lowerMsg.includes(cmd)) return cmd;
    }
    return 'other';
}

// ============= WHATSAPP CLIENT INITIALIZATION =============
console.log('\n');
Logger.box('🤖 TADA VTU WHATSAPP BOT');
Logger.info('📦 Loading configuration and dependencies...');
Logger.info('🔧 Initializing WhatsApp client...');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "tadavtu-enhanced-bot"
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

Logger.success('✅ Client configuration loaded');

// ============= EVENT HANDLERS =============

client.on('qr', (qr) => {
    console.log('\n');
    Logger.box('🔐 AUTHENTICATION REQUIRED');
    Logger.info('📱 Open WhatsApp on your phone');
    Logger.info('👉 Go to: Settings → Linked Devices → Link a Device');
    Logger.info('📸 Scan the QR code below:\n');
    
    qrcode.generate(qr, { small: true });
    
    console.log('');
    Logger.divider();
    Logger.warning('⏳ Waiting for QR code scan...');
    Logger.info('💡 This is a ONE-TIME setup - session will be saved');
    Logger.info('🔒 After scanning, bot will auto-reconnect on restart');
    Logger.divider();
    console.log('');
});

client.on('authenticated', () => {
    Logger.success('✅ WhatsApp authentication successful!');
    Logger.info('💾 Session credentials saved locally');
    Logger.info('🔄 Future startups will skip QR code scanning');
});

client.on('auth_failure', (error) => {
    Logger.error('❌ WhatsApp authentication failed', error);
    Logger.warning('🔄 Try these steps:');
    Logger.info('  1. Delete .wwebjs_auth folder');
    Logger.info('  2. Restart the bot');
    Logger.info('  3. Scan QR code again');
    process.exit(1);
});

client.on('ready', () => {
    console.log('\n');
    Logger.box('🚀 TADA VTU BOT IS NOW ONLINE');
    
    const clientInfo = client.info;
    if (clientInfo) {
        Logger.info(`📱 Connected as: ${colors.bright}${clientInfo.pushname || 'TADA VTU'}${colors.reset}`);
        Logger.info(`📞 WhatsApp Number: ${colors.bright}${clientInfo.wid.user}${colors.reset}`);
    }
    
    Logger.success('✅ Status: READY TO RECEIVE MESSAGES');
    Logger.info('🌐 Service Mode: FREE (No API costs)');
    Logger.info('🔧 Backend: Stateful command system active');
    Logger.info('💬 Users can now message this number for VTU');
    Logger.info('📊 Metrics tracking enabled');
    Logger.info('🔍 Monitoring console for activity...');
    
    Logger.divider();
    console.log('');
    
    // Show initial metrics
    setTimeout(() => {
        Logger.info(`💡 Bot ready! Type ${colors.bright}Ctrl+C${colors.reset} to stop gracefully\n`);
    }, 1000);
});

client.on('disconnected', (reason) => {
    Logger.warning('⚠️  WhatsApp client disconnected');
    Logger.info(`Reason: ${reason}`);
    Logger.info('🔄 Attempting automatic reconnection...');
});

client.on('change_state', (state) => {
    Logger.info(`🔄 Connection state: ${colors.cyan}${state}${colors.reset}`);
});

client.on('loading_screen', (percent, message) => {
    if (percent < 100) {
        process.stdout.write(`\r${colors.blue}[LOADING]${colors.reset} ${colors.dim}${message}${colors.reset} ${colors.green}${percent}%${colors.reset}`);
    } else {
        console.log(`\r${colors.blue}[LOADING]${colors.reset} ${colors.dim}${message}${colors.reset} ${colors.green}${percent}%${colors.reset}`);
    }
});

// Message handling with comprehensive logging
client.on('message', async (msg) => {
    const startTime = Date.now();
    
    // Filter out group messages
    if (msg.from.includes('@g.us')) {
        Logger.info(`📋 Skipped group message from: ${msg.from.split('@')[0]}`);
        return;
    }
    
    // Skip status updates silently
    if (msg.from.includes('status@broadcast')) {
        return;
    }

    const normalizedPhone = normalizeWhatsAppPhone(msg.from);
    const command = extractCommand(msg.body);
    
    // Log incoming message
    updateMetrics('message_received', { phone: normalizedPhone });
    Logger.message('incoming', normalizedPhone, msg.body);
    
    try {
        // Process message
        Logger.info(`⚙️  Processing command: ${colors.bright}${command}${colors.reset}`);
        const response = await handleStatefulMessage(msg.body, normalizedPhone);
        
        const responseTime = Date.now() - startTime;
        updateMetrics('message_processed', { responseTime, command });
        
        // Send reply
        await msg.reply(response);
        
        // Log success
        Logger.message('outgoing', normalizedPhone, response, 'DELIVERED');
        Logger.metric('⚡ Response time', responseTime, 'ms');
        
        if (responseTime < 500) {
            Logger.success(`✅ ${colors.green}Fast response${colors.reset} for ${normalizedPhone}`);
        } else if (responseTime < 2000) {
            Logger.success(`✅ Response sent for ${normalizedPhone}`);
        } else {
            Logger.warning(`⚠️  Slow response (${responseTime}ms) for ${normalizedPhone}`);
        }
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        updateMetrics('message_failed');
        
        Logger.error(`❌ Processing failed for ${normalizedPhone}`, error);
        Logger.metric('Failed after', responseTime, 'ms');
        
        // Attempt to notify user
        try {
            const errorResponse = '❌ Sorry, something went wrong. Please try again or type /help for assistance.';
            await msg.reply(errorResponse);
            Logger.info('📤 Error notification sent to user');
        } catch (replyError) {
            Logger.error('❌ Could not send error notification', replyError);
        }
    }
    
    console.log(''); // Spacing between message logs
});

// Message acknowledgment tracking
client.on('message_ack', (msg, ack) => {
    const ackStatus = ['ERROR', 'PENDING', 'SERVER', 'DEVICE', 'READ', 'PLAYED'];
    
    if (ack >= 2 && ack <= 3) { // Delivered to server or device
        Logger.info(`✓ Message ${ackStatus[ack]}: ${msg.id._serialized.substring(0, 20)}...`);
    } else if (ack === 4) { // Read by user
        Logger.success(`✓ Message READ by user`);
    }
});

// ============= GRACEFUL SHUTDOWN =============
process.on('SIGINT', async () => {
    console.log('\n');
    Logger.warning('⚠️  Shutdown signal received (Ctrl+C)');
    Logger.info('🛑 Initiating graceful shutdown...');
    
    // Show final metrics
    logHealthMetrics();
    
    Logger.info('💾 Saving session data...');
    Logger.info('🔌 Disconnecting WhatsApp client...');
    
    try {
        await client.destroy();
        Logger.success('✅ Client disconnected gracefully');
    } catch (error) {
        Logger.error('❌ Error during shutdown', error);
    }
    
    Logger.box('👋 TADA VTU BOT STOPPED');
    Logger.info('Total runtime: ' + getUptime());
    Logger.info('Messages processed: ' + metrics.messagesProcessed);
    Logger.info('Unique users served: ' + metrics.activeUsers.size);
    console.log('');
    
    process.exit(0);
});

// Error handlers
process.on('uncaughtException', (error) => {
    Logger.error('🚨 UNCAUGHT EXCEPTION - Bot may be unstable!', error);
    Logger.warning('🔄 Consider restarting the bot');
    Logger.warning('💡 If this persists, check your code for bugs');
});

process.on('unhandledRejection', (reason, promise) => {
    Logger.error('🚨 UNHANDLED PROMISE REJECTION');
    Logger.error('Reason: ' + reason);
    Logger.warning('🔍 Check your async/await error handling');
});

// ============= STARTUP SEQUENCE =============
console.log('\n');
Logger.box('🚀 STARTING TADA VTU BOT');
Logger.info('📋 System Information:');
Logger.info(`  ├─ Node.js: ${colors.green}${process.version}${colors.reset}`);
Logger.info(`  ├─ Platform: ${colors.green}${process.platform}${colors.reset}`);
Logger.info(`  ├─ Architecture: ${colors.green}${process.arch}${colors.reset}`);
Logger.info(`  └─ Memory: ${colors.green}${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB${colors.reset} used`);
Logger.info('');
Logger.warning('⚠️  IMPORTANT: Close WhatsApp Web in your browser');
Logger.info('💡 Using stateful-vtu.js command system');
Logger.info('🔐 Session data folder: .wwebjs_auth/');
Logger.divider();
console.log('');

client.initialize();
