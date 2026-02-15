# OpenClaw Agent Deployment Guide

## Quick Start

Your OpenClaw agent is ready to deploy! Follow these steps:

## Step 1: Verify Files

Make sure you have these files in `tada-vtu/openclaw/`:
- ✅ `agent.ts` - Main agent implementation
- ✅ `SKILL.md` - OpenClaw skill manifest
- ✅ `README.md` - Documentation
- ✅ `package.json` - Package metadata
- ✅ `DEPLOYMENT.md` - This file

## Step 2: Deploy to OpenClaw

### Windows (PowerShell)

```powershell
# Create OpenClaw skills directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.openclaw\skills"

# Copy the skill to OpenClaw
Copy-Item -Recurse -Force "tada-vtu\openclaw" "$env:USERPROFILE\.openclaw\skills\tadavtu-assistant"

# Verify installation
Get-ChildItem "$env:USERPROFILE\.openclaw\skills\tadavtu-assistant"
```

### Linux/Mac (Bash)

```bash
# Create OpenClaw skills directory if it doesn't exist
mkdir -p ~/.openclaw/skills

# Copy the skill to OpenClaw
cp -r tada-vtu/openclaw ~/.openclaw/skills/tadavtu-assistant

# Verify installation
ls -la ~/.openclaw/skills/tadavtu-assistant
```

## Step 3: Configure Backend URL

The agent is currently configured to use `https://tadavtu.com` as the base URL. If you need to change this:

1. Open `agent.ts`
2. Find the constructor where `baseUrl` is set
3. Update to your production URL

Or pass it dynamically when creating the agent:

```typescript
const agent = new OpenClawAgent(
  process.env.TADA_API_URL || 'https://tadavtu.com',
  authTokens
);
```

## Step 4: Test the Integration

### 4.1 Start OpenClaw Gateway

```bash
openclaw gateway
```

### 4.2 Test User Identification

First, verify the identify endpoint works:

```bash
curl -X POST https://tadavtu.com/api/openclaw/user/identify \
  -H "Authorization: Bearer YOUR_OPENCLAW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "08012345678"}'
```

Expected response:
```json
{
  "success": true,
  "userId": "uuid-here",
  "sessionId": "session-uuid",
  "signature": "signature-hash",
  "user": {
    "phone": "08012345678",
    "balance": 5000
  }
}
```

### 4.3 Test Agent Conversation

Create a test script `test-agent.ts`:

```typescript
import { OpenClawAgent, createAgentContext } from './agent';

async function testAgent() {
  // Initialize with test credentials
  const agent = new OpenClawAgent(
    'https://tadavtu.com',
    {
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      signature: 'test-signature',
    }
  );

  const context = createAgentContext('test-user-id', 'test-session-id');

  // Test 1: Balance check
  console.log('Test 1: Balance Check');
  let response = await agent.processMessage('What is my balance?', context);
  console.log(response.message);
  console.log('---\n');

  // Test 2: Airtime purchase
  console.log('Test 2: Airtime Purchase');
  response = await agent.processMessage('Buy ₦500 MTN airtime for 08012345678', context);
  console.log(response.message);
  console.log('---\n');

  // Test 3: Data plans
  console.log('Test 3: Data Plans');
  response = await agent.processMessage('Show me Airtel data plans for 08012345678', context);
  console.log(response.message);
  console.log('---\n');

  // Test 4: Help
  console.log('Test 4: Help');
  response = await agent.processMessage('help', context);
  console.log(response.message);
}

testAgent().catch(console.error);
```

Run the test:
```bash
npx tsx test-agent.ts
```

## Step 5: Production Deployment

### 5.1 Environment Variables

Set these in your production environment:

```bash
# Backend API URL
export TADA_API_URL="https://tadavtu.com"

# OpenClaw API Key (for backend authentication)
export OPENCLAW_API_KEY="your-secure-api-key-here"
```

### 5.2 Update Backend .env

Add to your `tada-vtu/.env.local`:

```env
# OpenClaw Integration
OPENCLAW_API_KEY=your-secure-api-key-here
```

### 5.3 Deploy Backend Changes

```bash
cd tada-vtu

# Commit OpenClaw API endpoints
git add src/app/api/openclaw/
git add openclaw/
git commit -m "Add OpenClaw integration"

# Deploy to Vercel
vercel --prod
```

## Step 6: Verify Production

### 6.1 Health Check

```bash
curl https://tadavtu.com/api/openclaw/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### 6.2 Test Full Flow

1. **Identify User**:
   ```bash
   curl -X POST https://tadavtu.com/api/openclaw/user/identify \
     -H "Authorization: Bearer $OPENCLAW_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "08012345678"}'
   ```

2. **Use returned tokens** to initialize agent

3. **Send test message** through OpenClaw

4. **Verify transaction** in TADA VTU dashboard

## Troubleshooting

### Agent Not Found

```bash
# Check if skill is installed
ls ~/.openclaw/skills/tadavtu-assistant

# Check OpenClaw logs
openclaw logs
```

### Authentication Errors

- Verify `OPENCLAW_API_KEY` is set correctly
- Check that backend endpoints are accessible
- Ensure user identification returns valid tokens

### Order Execution Fails

- Check user has sufficient balance
- Verify PIN is correct (4-6 digits)
- Review backend logs for detailed errors

### Network Issues

- Verify backend URL is correct
- Check firewall/security group settings
- Test API endpoints directly with curl

## Monitoring

### Backend Logs

```bash
# View Vercel logs
vercel logs --follow

# Filter OpenClaw requests
vercel logs | grep openclaw
```

### Agent Logs

OpenClaw logs are typically in:
- Windows: `%USERPROFILE%\.openclaw\logs`
- Linux/Mac: `~/.openclaw/logs`

## Security Checklist

- [ ] `OPENCLAW_API_KEY` is strong and unique
- [ ] API key is stored securely (not in code)
- [ ] Backend validates all requests
- [ ] Rate limiting is enabled
- [ ] User sessions expire appropriately
- [ ] PINs are never logged
- [ ] HTTPS is enforced

## Next Steps

1. ✅ Deploy agent to OpenClaw
2. ✅ Test with real user accounts
3. ✅ Monitor for errors
4. ✅ Gather user feedback
5. ✅ Iterate and improve

## Support

- Documentation: https://tadavtu.com/docs
- Email: support@tadavtu.com
- GitHub: [Your repo URL]

---

**Congratulations!** Your OpenClaw agent is ready for production. 🎉
