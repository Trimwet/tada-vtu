# Final Setup - You're Almost There! 🚀

## ✅ What's Done

- [x] Agent code created (`agent.ts`)
- [x] Files deployed to OpenClaw skills directory
- [x] API key found and set (`OPENCLAW_API_KEY`)
- [x] All backend API endpoints implemented

## 🔧 Final Steps

### 1. Deploy Backend to Production

Your backend needs to be live for OpenClaw to call it:

```powershell
cd tada-vtu
vercel --prod
```

This will deploy all your OpenClaw API endpoints to production.

### 2. Add API Key to Vercel

After deployment, add the environment variable to Vercel:

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com
2. Select your `tada-vtu` project
3. Go to Settings → Environment Variables
4. Add: `OPENCLAW_API_KEY` = `oc_tada_2024_secure_key_change_in_production`
5. Redeploy

**Option B: Via CLI**
```powershell
vercel env add OPENCLAW_API_KEY
# When prompted, enter: oc_tada_2024_secure_key_change_in_production
# Select: Production
vercel --prod
```

### 3. Test Backend Health

Once deployed, test the health endpoint:

```powershell
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

### 4. Test User Identification

```powershell
$headers = @{
    "Authorization" = "Bearer oc_tada_2024_secure_key_change_in_production"
    "Content-Type" = "application/json"
}
$body = '{"phoneNumber": "08012345678"}' | ConvertFrom-Json | ConvertTo-Json

Invoke-RestMethod -Uri "https://tadavtu.com/api/openclaw/user/identify" -Method Post -Headers $headers -Body $body
```

### 5. Restart OpenClaw Gateway

```bash
# Stop current gateway (Ctrl+C if running)
# Then start fresh:
openclaw gateway
```

### 6. Test the Agent

Send a message to Tada:

```
"What's my balance?"
"Buy 500 naira MTN airtime for 08012345678"
"Show me Airtel data plans"
```

## 🎯 Current Status

| Component | Status |
|-----------|--------|
| Agent Code | ✅ Complete |
| Files Deployed | ✅ Done |
| API Key Set | ✅ Done |
| Backend Deployed | ⏳ Pending |
| OpenClaw Gateway | ⏳ Needs restart |

## 🐛 Troubleshooting

### Backend Not Reachable

If the health check fails:
1. Verify deployment: `vercel ls`
2. Check logs: `vercel logs --follow`
3. Ensure OPENCLAW_API_KEY is in Vercel environment variables

### Authentication Errors

If you get 401 errors:
1. Verify API key matches in both places:
   - Local: `$env:OPENCLAW_API_KEY`
   - Vercel: Environment Variables
2. Redeploy after adding env var

### Agent Not Responding

1. Check OpenClaw logs: `openclaw logs`
2. Verify skill is loaded: Check OpenClaw dashboard
3. Restart gateway: `openclaw gateway`

## 📞 Quick Commands Reference

```powershell
# Set API key (run this in each new PowerShell session)
$env:OPENCLAW_API_KEY = "oc_tada_2024_secure_key_change_in_production"

# Deploy backend
cd tada-vtu
vercel --prod

# Test health
curl https://tadavtu.com/api/openclaw/health

# Restart OpenClaw
openclaw gateway

# View logs
openclaw logs
vercel logs --follow
```

## 🎉 Success Criteria

You'll know it's working when:
1. Health endpoint returns `{"status": "healthy"}`
2. User identification returns user data
3. Tada responds to "What's my balance?"
4. You can complete an airtime purchase

---

**Next Step**: Deploy your backend with `vercel --prod` and add the OPENCLAW_API_KEY to Vercel environment variables!
