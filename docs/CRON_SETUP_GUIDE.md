# Gift Room Cleanup Cron Job Setup

## Overview
This cron job automatically cleans up expired gift rooms and processes refunds for unclaimed gifts.

## Endpoint
`GET /api/cron/cleanup-gifts`

## Authentication
The endpoint requires a Bearer token set via the `CRON_SECRET` environment variable.

```bash
Authorization: Bearer YOUR_CRON_SECRET
```

## Setup Instructions

### Option 1: Vercel Cron (Recommended)

1. **Add to `vercel.json`** in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-gifts",
      "schedule": "0 0 * * *"
    }
  ]
}
```

2. **Set Environment Variable** in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add: `CRON_SECRET` = `<generate-a-secure-random-string>`
   - Make sure it's available in Production environment

3. **Deploy** - Vercel will automatically call the endpoint daily at midnight UTC

### Option 2: GitHub Actions

Create `.github/workflows/cleanup-gifts.yml`:

```yaml
name: Cleanup Expired Gift Rooms

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/cleanup-gifts
```

Then add `CRON_SECRET` to GitHub repository secrets.

### Option 3: External Cron Service (e.g., cron-job.org)

1. Sign up at https://cron-job.org
2. Create new cron job:
   - URL: `https://your-domain.com/api/cron/cleanup-gifts`
   - Schedule: `0 0 * * *` (daily midnight)
   - Add header: `Authorization: Bearer YOUR_CRON_SECRET`

## Environment Variables Required

Add to `.env.local` (development) and Vercel/production:

```env
CRON_SECRET=your-secure-random-secret-string
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Testing

### Test locally:
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/cleanup-gifts
```

### Expected Response:
```json
{
  "success": true,
  "data": {
    "message": "Cleanup completed successfully",
    "result": {
      "rooms_cleaned": 5,
      "total_refunded": 2500
    },
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

## Monitoring

Check logs in:
- **Vercel**: Dashboard → Functions → View logs
- **GitHub Actions**: Actions tab → Workflow runs
- **External service**: Service dashboard

## Database Function

The endpoint calls the `cleanup_expired_gift_rooms()` RPC function which:
1. Finds all expired gift rooms
2. Calculates unclaimed amounts
3. Refunds senders for unclaimed gifts
4. Updates room status to 'expired'
5. Expires active reservations
6. Logs refund activities

## Frequency Recommendation

**Daily at midnight UTC** is recommended to:
- Process refunds promptly
- Keep database clean
- Provide good user experience

For high-volume systems, consider running more frequently (e.g., every 6 hours).

## Troubleshooting

### "Unauthorized" error
- Check `CRON_SECRET` environment variable is set
- Verify authorization header format
- Ensure secret matches in both request and environment

### No cleanup happening
- Check if `cleanup_expired_gift_rooms()` function exists in database
- Verify gift rooms have `expires_at` timestamps
- Check database logs for RPC errors

### Timeout errors
- Increase serverless function timeout in `vercel.json`
- Consider batch processing for large datasets
- Add pagination to cleanup function
