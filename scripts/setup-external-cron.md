# Setup External Cron Service (Free Alternative)

Since Vercel Hobby limits cron jobs, use a free external service:

## Option 1: cron-job.org (Recommended)

1. **Go to:** https://cron-job.org/en/
2. **Sign up** for free account
3. **Create new cron job:**
   - **Title:** TADA VTU Transfer Polling
   - **URL:** https://www.tadavtu.com/api/cron/process-transfers
   - **Schedule:** Every 2 minutes
   - **Method:** GET
4. **Enable the job**

## Option 2: UptimeRobot (Free)

1. **Go to:** https://uptimerobot.com/
2. **Sign up** for free account
3. **Add Monitor:**
   - **Type:** HTTP(s)
   - **URL:** https://www.tadavtu.com/api/cron/process-transfers
   - **Interval:** 5 minutes (minimum free)
4. **Create monitor**

## Option 3: GitHub Actions (Free)

Create `.github/workflows/polling.yml`:

```yaml
name: Transfer Polling
on:
  schedule:
    - cron: '*/2 * * * *'  # Every 2 minutes
  workflow_dispatch:

jobs:
  poll:
    runs-on: ubuntu-latest
    steps:
      - name: Call polling endpoint
        run: |
          curl -X GET https://www.tadavtu.com/api/cron/process-transfers
```

## Benefits:
- ✅ **Free** - No upgrade needed
- ✅ **2-minute intervals** - Fast processing
- ✅ **Reliable** - External services are dedicated to cron jobs
- ✅ **No Vercel limits** - Bypasses Hobby plan restrictions

## Recommendation:
Use **cron-job.org** - it's the simplest and most reliable option.