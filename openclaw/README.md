# TADA VTU Stateful Command System

A reliable, USSD-style WhatsApp bot for VTU services with no AI dependencies.

## 🎯 Features

- **Stateful Conversations** - USSD-like guided menus
- **Session Management** - Maintains user state across messages
- **Complete VTU Services** - Balance, data, airtime, history
- **Real-time API Integration** - Live data plans and pricing
- **No AI Required** - Pure command-driven interface

## 📱 Commands

- `/balance` - Check wallet balance
- `/buy` - Buy data (guided menu)
- `/airtime` - Buy airtime (guided menu)
- `/history` - View recent transactions
- `/help` - Show all commands
- `/cancel` - Cancel current operation

## 🚀 Usage

The system works exactly like USSD codes:

```
User: /buy
Bot: Select network: 1. MTN 2. GLO 3. AIRTEL 4. 9MOBILE

User: 1
Bot: MTN Data Plans: 1. 500MB - ₦500 2. 1GB - ₦1000 ...

User: 2
Bot: Enter phone number:

User: 09063546728
Bot: Purchase Summary: 1GB MTN - ₦1000 to 09063546728
     Reply "confirm" to proceed

User: confirm
Bot: Enter your 4-digit PIN:

User: 1234
Bot: ✅ Purchase successful! 1GB MTN data sent to 09063546728
```

## 🔧 Technical Details

- **File**: `stateful-vtu.js`
- **Session Storage**: In-memory (15-minute timeout)
- **API Integration**: Direct HTTPS calls to tadavtu.com
- **Phone Normalization**: Handles Nigerian number formats
- **Error Handling**: Comprehensive validation and user feedback

## 🎉 Benefits

- **100% Reliable** - No AI failures or rate limits
- **Fast Response** - Direct command processing
- **User Friendly** - Guided step-by-step flow
- **Production Ready** - Complete error handling and validation
- **Cost Effective** - No AI API costs

## 🧪 Testing

```bash
# Test balance check
node stateful-vtu.js "/balance"

# Test data purchase flow
node stateful-vtu.js "/buy"

# Test help
node stateful-vtu.js "/help"
```

## 📋 Integration

The system integrates with OpenClaw via the exec tool:

```
exec: node "C:\Users\MAFUYAI\.openclaw\skills\tadavtu-assistant\stateful-vtu.js" "[command]"
```

OpenClaw translates natural language to commands and executes the stateful system.