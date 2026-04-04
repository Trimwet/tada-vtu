# tada-vtu

ADA VTU - A comprehensive VTU platform for airtime, data, cable TV, electricity, and betting services.

VTU Dashboard — recharge airtime/data, schedule recurring top-ups, and view usage analytics.

Status: Actively maintained

Highlights
- Purchase airtime & data for multiple networks
- Dashboard with transaction history and charts
- Recurring top-ups (cron-based scheduler)
- Admin panel for monitoring & refunds
- Webhooks for provider callbacks
- Payment integrations: Stripe / Paystack

Tech stack
- Backend: Node.js + Express + TypeScript (Bun-friendly where possible)
- Frontend: Next.js or React
- Mobile: Companion mobile app (React Native / Native iOS & Android)
- DB: PostgreSQL or MongoDB
- External: Payment gateways, VTU API integrations

Local setup
1. Clone:
   git clone https://github.com/Trimwet/tada-vtu.git
2. Setup env:
   cp .env.example .env
3. Install & run:
   npm install
   npm run dev

Environment variables
- VTU_API_KEY
- DATABASE_URL
- STRIPE_SECRET
- CRON_SCHEDULE (for recurring jobs)

Deployment
- Dockerfile included
- GitHub Actions to build & push images
- Recommended hosts: Vercel (frontend), Fly/Render (backend), or Heroku

Testing & monitoring
- Unit tests with Jest
- Health endpoint: /health
- Optional: Sentry for error tracking

License
MIT — see LICENSE