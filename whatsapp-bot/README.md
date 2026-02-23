# TADA VTU WhatsApp Bot

A simple, reliable WhatsApp bot for TADA VTU services using `whatsapp-web.js` - no AI complexity, just pure JavaScript logic.

## 🎯 Why This Approach?

- **No AI Dependencies**: Zero API costs, no rate limits, 100% reliable
- **Direct Control**: Pure JavaScript if/else logic, no "black box" AI
- **USSD-like Experience**: Familiar menu-driven interface for Nigerian users
- **Stateful Conversations**: Maintains user context throughout purchase flow
- **Production Ready**: Comprehensive error handling and session management

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   cd tada-vtu/whatsapp-bot
   npm install
   ```

2. **Configure Environment**
   - Copy `.env` and update API credentials if needed
   - Default configuration works with your existing TADA VTU API

3. **Start the Bot**
   ```bash
   npm start
   ```

4. **Scan QR Code**
   - QR code will appear in terminal
   - Scan with WhatsApp on your phone
   - Bot will be ready in seconds!

## 📱 User Commands

### Direct Commands
- `/balance` - Check wallet balance
- `/buy` - Purchase data bundles  
- `/airtime` - Buy airtime top-up
- `/history` - View recent transactions
- `/help` - Show all commands
- `/cancel` - Cancel current operation

### Natural Language
Users can also type naturally:
- "check my balance"
- "buy data"
- "buy airtime"
- "show my transactions"

## 🔄 User Flow Example

```
User: "buy data"
Bot: 📶 Data Purchase
     Hello John! 👋
     Balance: ₦5,000
     
     Select network:
     1️⃣ MTN
     2️⃣ GLO
     3️⃣ AIRTEL
     4️⃣ 9MOBILE

User: "1"
Bot: 📶 MTN Data Plans:
     1️⃣ 500MB - ₦500 (30 days)
     2️⃣ 1GB - ₦1000 (30 days)
     3️⃣ 2GB - ₦2000 (30 days)

User: "2"
Bot: 📶 Selected: 1GB
     Price: ₦1000
     
     Enter phone number:
     Format: 09063546728

User: "09063546728"
Bot: 📋 Purchase Summary:
     Network: MTN
     Plan: 1GB
     Price: ₦1000
     Phone: 09063546728
     
     Reply "confirm" to proceed

User: "confirm"
Bot: 🔐 Enter your 4-digit PIN:

User: "1234"
Bot: ✅ Purchase Successful! 🎉
     1GB MTN data sent to 09063546728
     Reference: TADA-123456
```

## 🛠 Technical Features

### Session Management
- **In-memory storage** (upgrade to Redis for production scaling)
- **15-minute timeout** with automatic cleanup
- **State tracking** maintains user position in conversation flow

### Error Handling
- **Graceful fallbacks** for API failures
- **User-friendly messages** for all error scenarios
- **Automatic session recovery** after timeouts

### Phone Number Handling
- **Automatic normalization** from WhatsApp international format
- **Nigerian format validation** (0801234567)
- **User identification** via linked WhatsApp numbers

### API Integration
- **All existing TADA VTU endpoints** work seamlessly
- **Bearer token authentication** 
- **Real-time data plans** and pricing
- **Transaction processing** with PIN validation

## 🔧 Configuration

### Environment Variables
```bash
TADA_API_BASE_URL=https://www.tadavtu.com
TADA_API_TOKEN=oc_tada_2024_secure_key_change_in_production
SESSION_TIMEOUT=900000  # 15 minutes
```

### Production Considerations
1. **Session Storage**: Replace Map with Redis for scaling
2. **Process Management**: Use PM2 for auto-restart
3. **Monitoring**: Add logging and health checks
4. **Security**: Rotate API tokens regularly

## 📊 Comparison with OpenClaw

| Feature | OpenClaw | whatsapp-web.js |
|---------|----------|-----------------|
| **Complexity** | High (AI + Config) | Low (Pure JS) |
| **Reliability** | AI can be unpredictable | 100% deterministic |
| **Cost** | AI API costs | Completely free |
| **Setup Time** | Hours (config, prompts) | Minutes (npm install) |
| **Maintenance** | Complex debugging | Simple JavaScript |
| **Performance** | AI processing delays | Instant responses |

## 🎉 Benefits

- **Instant Setup**: Working bot in under 5 minutes
- **Zero Costs**: No AI API fees or third-party services
- **Full Control**: Every response is predictable
- **Easy Debugging**: Standard JavaScript error handling
- **Scalable**: Add new features with simple code changes

## 🚀 Next Steps

1. **Test the bot** with your existing TADA VTU account
2. **Add features** like bill payments, betting top-ups
3. **Scale up** with Redis and PM2 for production
4. **Monitor usage** with logging and analytics

The bot is production-ready and provides the same functionality as your OpenClaw system, but with much simpler, more reliable architecture! 🎯