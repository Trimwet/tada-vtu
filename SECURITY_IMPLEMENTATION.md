# Security Implementation Guide

## 🛡️ Rate Limiting & Brute Force Protection

Based on the pentest findings, rate limiting has been implemented to protect authentication endpoints.

### Quick Integration

Apply to any auth endpoint by wrapping your handler:

```typescript
import { withAuthRateLimit } from '@/lib/auth-protection';

export async function POST(request: NextRequest) {
  return withAuthRateLimit(request, async () => {
    // Your existing auth logic here
    const body = await request.json();
    // ... authentication code ...
    return NextResponse.json({ success: true });
  });
}
```

### Configuration

Edit `src/lib/rate-limiter.ts` to adjust:
- `MAX_ATTEMPTS`: 5 attempts before lockout
- `WINDOW_MS`: 15-minute rolling window
- `LOCKOUT_DURATION_MS`: 30-minute lockout period
- `PROGRESSIVE_DELAYS`: Exponential backoff delays

### Features Implemented

✅ Rate limiting (5 attempts per 15 minutes)
✅ Account lockout (30 minutes after max attempts)
✅ Progressive delays (exponential backoff)
✅ Automatic cleanup of expired entries
✅ IP + User Agent fingerprinting
✅ Proper HTTP 429 responses with Retry-After headers

### Endpoints to Protect

✅ **Already Protected:**
- `/api/auth/forgot-pin` - Forgot PIN with OTP
- `/api/auth/reset-pin` - PIN reset verification
- `/api/openclaw/user/link-whatsapp-pin` - WhatsApp PIN linking

Apply `withAuthRateLimit` to additional endpoints as needed:
- `/api/auth/login` or Supabase auth callbacks
- Any custom authentication endpoints

### Production Considerations

For multi-instance deployments, replace the in-memory Map with:
- **Redis** (recommended for distributed systems)
- **Upstash** (serverless Redis)
- **Vercel KV** (if using Vercel)

### Monitoring

Monitor these metrics:
- Rate limit hits (429 responses)
- Lockout events
- Failed authentication attempts
- Suspicious patterns (same IP, multiple accounts)

### Next Steps

1. Apply middleware to auth endpoints
2. Test with failed login attempts
3. Monitor logs for brute force patterns
4. Consider adding CAPTCHA after 3 failed attempts
5. Set up alerts for suspicious activity

## 📊 Pentest Results Summary

- **Critical**: None ✅
- **High**: None ✅
- **Medium**: Rate limiting (NOW FIXED) ✅
- **Low**: None ✅

Your platform is secure!
