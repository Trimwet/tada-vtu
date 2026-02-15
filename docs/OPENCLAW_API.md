# OpenClaw API Integration

This document describes the OpenClaw API integration for TADA VTU, enabling conversational data purchases via WhatsApp and Telegram.

## Overview

The OpenClaw integration provides REST API endpoints that allow the OpenClaw AI agent to:
- Identify users by WhatsApp number
- Check wallet balances
- Retrieve data plan pricing
- Create and execute purchase orders
- Query transaction history

## Authentication

All OpenClaw API endpoints require authentication via API key.

### API Key Setup

1. **Generate a secure API key:**
   ```bash
   openssl rand -base64 32
   ```

2. **Add to environment variables:**
   ```bash
   OPENCLAW_API_KEY="your-secure-api-key-here"
   OPENCLAW_RATE_LIMIT_ENABLED="true"
   ```

3. **Include in requests:**
   ```
   Authorization: Bearer your-secure-api-key-here
   ```

### Testing Authentication

Test the health endpoint to verify authentication:

```bash
curl -H "Authorization: Bearer your-api-key" \
  https://tadavtu.com/api/openclaw/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

## Rate Limiting

Rate limits are enforced to prevent abuse:

- **General API calls:** 20 requests per minute per user
- **Purchase operations:** 5 purchases per 10 minutes per user

Rate limit responses include:
- HTTP 429 status code
- `resetIn` field indicating seconds until limit resets

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "message": "User-friendly error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `AUTH_MISSING` - No authentication credentials provided
- `AUTH_INVALID` - Invalid API key
- `USER_NOT_FOUND` - WhatsApp number not linked to account
- `INSUFFICIENT_BALANCE` - Wallet balance too low
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INVALID_PHONE` - Phone number format invalid
- `INVALID_NETWORK` - Network not supported
- `DUPLICATE_ORDER` - Identical order already exists

## API Endpoints

### Health Check
```
GET /api/openclaw/health
```

### User Identification
```
GET /api/openclaw/user/identify?whatsapp={phone}
```

### Balance Inquiry
```
GET /api/openclaw/user/balance?userId={id}
```

### Pricing Lookup
```
GET /api/openclaw/pricing?network={network}
```

### Order Creation
```
POST /api/openclaw/orders/create
```

### Order Execution
```
POST /api/openclaw/orders/execute
```

### Order Status
```
GET /api/openclaw/orders/:id/status?userId={id}
```

### Transaction History
```
GET /api/openclaw/transactions/recent?userId={id}&limit={n}
```

See the design document for detailed endpoint specifications.

## Security Best Practices

1. **API Key Management**
   - Never commit API keys to version control
   - Rotate keys every 90 days
   - Use different keys for development and production
   - Store keys in environment variables only

2. **Request Validation**
   - All inputs are validated before processing
   - Phone numbers are normalized and validated
   - Amounts are checked for positive values
   - Network and plan IDs are validated against known values

3. **Rate Limiting**
   - Enforced per user to prevent abuse
   - Logged for fraud detection
   - Configurable via environment variable

4. **Error Messages**
   - User-friendly messages without technical details
   - Detailed errors logged server-side only
   - No sensitive data in error responses

## Monitoring

Monitor these metrics for OpenClaw integration health:

- API response times
- Authentication failure rate
- Rate limit hit rate
- Order success/failure rates
- User registration conversion from WhatsApp

## Troubleshooting

### Authentication Failures

**Problem:** Getting 401 errors
**Solution:** 
- Verify `OPENCLAW_API_KEY` is set in environment
- Check Authorization header format: `Bearer <key>`
- Ensure key matches exactly (no extra spaces)

### Rate Limiting Issues

**Problem:** Getting 429 errors
**Solution:**
- Wait for rate limit window to reset
- Check if `OPENCLAW_RATE_LIMIT_ENABLED` is set to "false" for testing
- Review request patterns for optimization

### User Not Found

**Problem:** WhatsApp users not being identified
**Solution:**
- Verify user has registered on tadavtu.com
- Check phone number format (should be 11 digits starting with 0)
- Ensure phone number in database matches WhatsApp number

## Development

### Local Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test endpoints with curl or Postman:
   ```bash
   curl -H "Authorization: Bearer oc_tada_2024_secure_key_change_in_production" \
     http://localhost:3000/api/openclaw/health
   ```

### Adding New Endpoints

1. Create route file in `src/app/api/openclaw/`
2. Use `withOpenClawAuth` middleware for authentication
3. Use `openclawSuccess` and `openclawError` for consistent responses
4. Add rate limiting with `checkRateLimit`
5. Document in this file

## Production Deployment

1. Generate a strong production API key
2. Add to Vercel environment variables
3. Update OpenClaw agent configuration with production URL
4. Monitor logs for errors
5. Set up alerts for high error rates

## Support

For issues or questions:
- Email: support@tadavtu.com
- Check logs in Vercel dashboard
- Review error codes in this documentation
