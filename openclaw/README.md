# TADA VTU OpenClaw Integration

This directory contains the OpenClaw agent implementation for TADA VTU.

## Files

- `agent.ts` - Main agent implementation with conversation logic
- `SKILL.md` - OpenClaw skill manifest and documentation
- `README.md` - This file

## Installation for OpenClaw

### Option 1: Copy to OpenClaw Skills Directory

```bash
# Copy the entire openclaw directory to OpenClaw skills folder
cp -r openclaw ~/.openclaw/skills/tadavtu-assistant
```

### Option 2: Symlink (for development)

```bash
# Create a symlink for easier development
ln -s /path/to/tada-vtu/openclaw ~/.openclaw/skills/tadavtu-assistant
```

## Configuration

The agent requires these authentication parameters to be passed when initialized:

```typescript
import { OpenClawAgent, createAgentContext } from './agent';

// Initialize agent
const agent = new OpenClawAgent(
  'https://tadavtu.com', // Your production URL
  {
    userId: 'user-id-from-identify-endpoint',
    sessionId: 'session-id-from-identify-endpoint',
    signature: 'signature-from-identify-endpoint',
  }
);

// Create conversation context
const context = createAgentContext(userId, sessionId);

// Process user message
const response = await agent.processMessage('Buy ₦500 MTN airtime', context);
```

## Usage Flow

1. **User Identification**: Call `/api/openclaw/user/identify` to get auth tokens
2. **Create Context**: Initialize agent context with user session
3. **Process Messages**: Send user messages to agent.processMessage()
4. **Handle Responses**: Display agent responses to user
5. **Confirm Orders**: When requiresConfirmation=true, collect PIN and call agent.confirmOrder()

## API Endpoints Used

The agent calls these TADA VTU API endpoints:

- `GET /api/openclaw/user/balance` - Check wallet balance
- `GET /api/openclaw/transactions/recent` - Get transaction history
- `GET /api/openclaw/pricing?network={network}` - Get data plans
- `POST /api/openclaw/orders/create` - Create pending order
- `POST /api/openclaw/orders/execute` - Execute order with PIN

## Security

- All API calls include authentication headers (X-OpenClaw-User-ID, X-OpenClaw-Session-ID, X-OpenClaw-Signature)
- PIN is only sent during order execution
- No sensitive data is stored in conversation history
- All operations are validated by backend API

## Development

To modify the agent:

1. Edit `agent.ts` with your changes
2. Test locally with your backend API
3. Deploy updated version to OpenClaw skills directory
4. Restart OpenClaw gateway

## Testing

```typescript
// Example test conversation
const context = createAgentContext('test-user', 'test-session');

// Test balance check
let response = await agent.processMessage('What is my balance?', context);
console.log(response.message);

// Test airtime purchase
response = await agent.processMessage('Buy ₦500 MTN airtime for 08012345678', context);
console.log(response.message);

// Confirm with PIN
if (response.requiresConfirmation) {
  response = await agent.confirmOrder(context, '1234');
  console.log(response.message);
}
```

## Troubleshooting

### Agent not responding
- Check that SKILL.md is present in the skills directory
- Verify OpenClaw gateway is running
- Check OpenClaw logs for errors

### Authentication errors
- Verify user identification endpoint is working
- Check that auth tokens are being passed correctly
- Ensure backend API is accessible

### Order execution fails
- Verify user has sufficient balance
- Check that PIN is correct
- Review backend API logs for errors

## Support

For issues or questions:
- Email: support@tadavtu.com
- Documentation: https://tadavtu.com/docs
