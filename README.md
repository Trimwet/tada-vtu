# 🇳🇬 TADA VTU - Nigerian Virtual Top-Up Platform

> Fast, reliable mobile recharge and bill payment services for Nigeria

## 🚀 Quick Start

```bash
# Clone and setup
git clone <your-repo>
cd tada-vtu
npm install

# Environment setup
cp .env.example .env.local
# Add your API keys (Supabase, Flutterwave, etc.)

# Development
npm run dev
```

## 📚 Documentation

- [🏗️ Architecture Overview](./docs/architecture-diagram.md)
- [🎯 System Design](./docs/system-design.md) 
- [🔧 Technical Specifications](./docs/technical-specifications.md)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Payments**: Flutterwave
- **VTU Provider**: Inlomax
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## 🔑 Core Features

- ✅ Airtime & Data Top-up (MTN, Airtel, Glo, 9mobile)
- ✅ Bill Payments (Electricity, Cable TV)
- ✅ Gift Rooms (Send airtime to multiple people)
- ✅ Wallet System with Bank Transfer
- ✅ Referral Program (₦100 per referral)
- ✅ Real-time Notifications

## 🏃‍♂️ Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run type-check   # Check TypeScript errors
npm run lint         # Run ESLint
npm run errors       # Show all errors at once
```

## 🔐 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Flutterwave
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_PUBLIC_KEY=

# VTU Provider
INLOMAX_API_KEY=

# AI Features
GROQ_API_KEY=
```

## 📊 System Status

- **Uptime**: 99.9%+ (Vercel)
- **Database**: Supabase (99.95% SLA)
- **Payments**: Flutterwave (Enterprise)
- **VTU**: Inlomax (Primary) + SMEPlug (Backup)

## 🚨 Support

- **Issues**: Create GitHub issue
- **Email**: support@tadavtu.com
- **WhatsApp**: +234-XXX-XXXX-XXX

---

Built with ❤️ for Nigeria 🇳🇬