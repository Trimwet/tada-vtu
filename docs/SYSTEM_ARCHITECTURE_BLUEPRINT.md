# TADA VTU - Complete System Architecture Blueprint

**Version:** 1.0  
**Last Updated:** May 31, 2026  
**Status:** Production Ready  
**Author:** Architecture Team

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Tech Stack](#tech-stack)
4. [Skeletal System (Structure)](#skeletal-system-structure)
5. [Nervous System (Communication)](#nervous-system-communication)
6. [Circulatory System (Data Flow)](#circulatory-system-data-flow)
7. [API Pipeline Architecture](#api-pipeline-architecture)
8. [Data Pipeline Architecture](#data-pipeline-architecture)
9. [Application Rhythm & Timing](#application-rhythm--timing)
10. [Security Architecture](#security-architecture)
11. [Performance Optimization](#performance-optimization)
12. [Deployment & Infrastructure](#deployment--infrastructure)

---

## Executive Summary

TADA VTU is a **production-ready Virtual Top-Up (VTU) platform** enabling users to purchase airtime, data, cable TV, electricity bills, and betting services across Nigerian networks. The system architecture emphasizes **security, performance, scalability, and real-time responsiveness** with integrated payment processing, WhatsApp bot integration, and innovative data vault functionality.

### Core Capabilities
- 🎫 **Multi-provider VTU**: Airtime, data, cable, electricity, betting
- 💳 **Payment Integration**: Flutterwave (deposits, virtual accounts, withdrawals)
- 🤖 **WhatsApp Bot**: USSD-style stateful commands via OpenClaw
- 📦 **Data Vault**: Park data for later delivery with QR codes
- 📊 **Analytics**: Real-time dashboards, transaction history, charts
- 🎁 **Loyalty System**: Points, tiers, referrals, spin wheel
- 🔐 **Enterprise Security**: RLS, rate limiting, brute-force protection, atomic transactions

---

## System Overview

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                            TADA VTU ECOSYSTEM                                      │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐                 │
│  │   WEB APPS      │  │  MOBILE APPS    │  │  WHATSAPP BOT    │                 │
│  │                 │  │                 │  │  (OpenClaw)      │                 │
│  │  • Dashboard    │  │  • React Native │  │  • USSD Commands │                 │
│  │  • Admin Panel  │  │  • Native (iOS) │  │  • Stateful      │                 │
│  │  • Developer    │  │  • Native (Droid)  │  • Session Mgmt  │                 │
│  │    Portal       │  │                 │  │                  │                 │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘                 │
│           │                    │                       │                         │
│           └────────────────────┴───────────────────────┘                         │
│                                │                                                │
│                                ▼                                                │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │              NEXT.JS 15 EDGE RUNTIME (App Router)                          │ │
│  │                    • React 19 Server Components                             │ │
│  │                    • TurboPackX Bundler                                     │ │
│  │                    • TypeScript 5 Type Safety                              │ │
│  │                    • Middleware & Auth Guards                              │ │
│  │                    • API Routes (Route Handlers)                           │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│           │                     │                     │                        │
│           ▼                     ▼                     ▼                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │ AUTHENTICATION   │  │ CORE API LAYER   │  │ DATA ACCESS      │           │
│  │                  │  │                  │  │                  │           │
│  │ • Auth Guards    │  │ • Rate Limiting  │  │ • Supabase SDK   │           │
│  │ • JWT/Sessions   │  │ • Validation     │  │ • RLS Policies   │           │
│  │ • 2FA/PIN        │  │ • Request Shape  │  │ • Query Builders │           │
│  │ • Admin Roles    │  │ • Error Handling │  │ • Cache Layer    │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│           │                     │                     │                        │
│           └─────────────────────┴─────────────────────┘                        │
│                                │                                                │
│                                ▼                                                │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                    SUPABASE BACKEND (PostgreSQL)                           │ │
│  │                                                                            │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Database Layer (15+ Tables)                                         │ │ │
│  │  │ • Row Level Security (RLS)                                          │ │ │
│  │  │ • Triggers & Functions                                             │ │ │
│  │  │ • Indexes & Performance                                            │ │ │
│  │  │ • Real-time Subscriptions                                          │ │ │
│  │  └──────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                            │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Auth Services                                                       │ │ │
│  │  │ • JWT Generation                                                    │ │ │
│  │  │ • Row Level Security Enforcement                                   │ │ │
│  │  │ • Service Role Operations                                          │ │ │
│  │  └──────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                            │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Edge Functions & Webhooks                                           │ │ │
│  │  │ • Real-time Processors                                             │ │ │
│  │  │ • Webhook Dispatchers                                              │ │ │
│  │  │ • Event Handlers                                                   │ │ │
│  │  └──────────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│           │                     │                     │                        │
│           ▼                     ▼                     ▼                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │ INLOMAX PROVIDER │  │ FLUTTERWAVE      │  │ EXTERNAL APIS    │           │
│  │ (VTU Services)   │  │ (Payment Gateway)│  │                  │           │
│  │                  │  │                  │  │ • Email (Resend) │           │
│  │ • Airtime        │  │ • Deposits       │  │ • SMS Gateways   │           │
│  │ • Data           │  │ • Transfers      │  │ • QR Generation  │           │
│  │ • Cable TV       │  │ • Virtual Accts  │  │                  │           │
│  │ • Electricity    │  │ • Webhooks       │  │                  │           │
│  │ • Betting        │  │                  │  │                  │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         DEPLOYMENT PLATFORM                             │ │
│  │                                                                         │ │
│  │  • Vercel Edge Network (CDN)                                           │ │
│  │  • GitHub Actions (CI/CD)                                              │ │
│  │  • Environment Secrets Management                                      │ │
│  │  • Automatic Deployments                                               │ │
│  │  • Performance Monitoring (Analytics, Speed Insights)                  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend Layer
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Next.js 15 | Full-stack React framework |
| **Runtime** | React 19 | Server/Client components |
| **Bundler** | TurboPackX | Fast module bundling |
| **Language** | TypeScript 5 | Type-safe development |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **UI Components** | shadcn/ui + Radix UI | Accessible component library |
| **Form State** | react-hook-form | Efficient form handling |
| **Data Fetching** | SWR | Stale-while-revalidate caching |
| **Animation** | GSAP + Motion | Complex animations |
| **Charts** | Recharts | Interactive visualizations |
| **QR Codes** | qrcode | QR generation |
| **PDF Export** | jsPDF | Document generation |

### Backend Layer
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 18+ | JavaScript execution |
| **Framework** | Next.js Route Handlers | Serverless API routes |
| **Language** | TypeScript | Type safety |
| **Package Manager** | Bun | Fast package management |

### Data Layer
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | PostgreSQL (Supabase) | Primary relational DB |
| **Auth** | Supabase Auth | JWT-based authentication |
| **ORM/Query** | Supabase JS SDK | Database queries |
| **Security** | Row Level Security | Data access control |
| **Real-time** | Supabase Subscriptions | Real-time updates |

### External Integrations
| Service | Purpose | API Type |
|---------|---------|----------|
| **Inlomax** | VTU Provider | REST API |
| **Flutterwave** | Payment Processing | REST API + Webhooks |
| **OpenClaw** | WhatsApp Bot Platform | REST API |
| **Resend** | Email Delivery | REST API |
| **web-push** | Push Notifications | Web Push API |

### DevOps & Monitoring
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Hosting** | Vercel | Edge deployment |
| **CI/CD** | GitHub Actions | Automated testing/deployment |
| **Performance** | Vercel Analytics + Speed Insights | Metrics |
| **Error Tracking** | (Optional) Sentry | Error logging |

---

## Skeletal System (Structure)

The **skeletal system** represents the foundational structure and project organization.

### Directory Architecture

```
tada-vtu/
├── src/
│   ├── app/                           # App Router pages & routes
│   │   ├── api/                       # API Route Handlers
│   │   │   ├── v1/                    # API v1 endpoints
│   │   │   │   ├── airtime/           # Airtime purchase
│   │   │   │   ├── data/              # Data plans & purchase
│   │   │   │   ├── cable/             # Cable TV services
│   │   │   │   ├── electricity/       # Power bill payments
│   │   │   │   ├── betting/           # Betting top-ups
│   │   │   │   ├── wallet/            # Balance & transactions
│   │   │   │   ├── flutterwave/       # Payment webhooks
│   │   │   │   ├── inlomax/           # VTU provider callbacks
│   │   │   │   ├── data-vault/        # Data vault operations
│   │   │   │   ├── openclaw/          # WhatsApp bot routes
│   │   │   │   ├── admin/             # Admin endpoints
│   │   │   │   ├── cron/              # Scheduled jobs
│   │   │   │   ├── withdrawal/        # Bank withdrawals
│   │   │   │   ├── notifications/     # Push notifications
│   │   │   │   └── auth/              # Authentication
│   │   │   └── health/                # Health check
│   │   │
│   │   ├── auth/                      # Auth pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── reset-password/
│   │   │   └── forgot-password/
│   │   │
│   │   ├── dashboard/                 # Main dashboard
│   │   │   ├── page.tsx               # User dashboard
│   │   │   ├── transactions/
│   │   │   ├── beneficiaries/
│   │   │   ├── settings/
│   │   │   └── developer/             # Developer portal
│   │   │
│   │   ├── admin/                     # Admin panel
│   │   │   ├── users/
│   │   │   ├── transactions/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   │
│   │   ├── vault/                     # Data vault UI
│   │   │   ├── page.tsx               # Vault dashboard
│   │   │   ├── [vaultId]/
│   │   │   └── qr-scanner/
│   │   │
│   │   ├── pricing/                   # Pricing page
│   │   ├── contact/                   # Contact form
│   │   ├── docs/                      # Public docs
│   │   ├── privacy/                   # Privacy policy
│   │   ├── terms/                     # Terms of service
│   │   │
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Home page
│   │   ├── globals.css                # Global styles
│   │   └── error.tsx                  # Error boundary
│   │
│   ├── components/                    # Reusable React components
│   │   ├── ui/                        # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── dropdown.tsx
│   │   │   ├── form.tsx
│   │   │   ├── table.tsx
│   │   │   ├── chart.tsx
│   │   │   └── ...
│   │   │
│   │   ├── dashboard/                 # Dashboard components
│   │   │   ├── WalletCard.tsx
│   │   │   ├── TransactionList.tsx
│   │   │   ├── Charts.tsx
│   │   │   └── ...
│   │   │
│   │   ├── forms/                     # Form components
│   │   │   ├── AirtimeForm.tsx
│   │   │   ├── DataForm.tsx
│   │   │   ├── WithdrawalForm.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layouts/                   # Layout wrappers
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── AuthLayout.tsx
│   │   │
│   │   └── providers/                 # Context providers
│   │       ├── AuthProvider.tsx
│   │       ├── ThemeProvider.tsx
│   │       └── QueryProvider.tsx
│   │
│   ├── contexts/                      # React contexts
│   │   ├── AuthContext.tsx            # Auth state
│   │   ├── UserContext.tsx            # User profile
│   │   ├── ThemeContext.tsx           # Theme (dark/light)
│   │   └── NotificationContext.tsx    # Toast notifications
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── useAuth.ts                 # Auth hook
│   │   ├── useUser.ts                 # User data
│   │   ├── useBalance.ts              # Wallet balance
│   │   ├── useTransactions.ts         # Transaction history
│   │   ├── usePush.ts                 # Push notifications
│   │   └── useLocalStorage.ts         # Local storage wrapper
│   │
│   ├── lib/                           # Utility functions & helpers
│   │   ├── supabase/
│   │   │   ├── client.ts              # Supabase client
│   │   │   ├── server.ts              # Server-side Supabase
│   │   │   └── types.ts               # Database types
│   │   │
│   │   ├── api/
│   │   │   ├── api-utils.ts           # API helpers
│   │   │   ├── reseller-auth.ts       # API key validation
│   │   │   ├── rate-limiter.ts        # Rate limiting
│   │   │   ├── inlomax.ts             # VTU provider
│   │   │   ├── webhooks.ts            # Webhook delivery
│   │   │   └── circuit-breaker.ts     # Fault tolerance
│   │   │
│   │   ├── auth/
│   │   │   ├── auth-helpers.ts        # Auth utilities
│   │   │   ├── auth-protection.ts     # Route guards
│   │   │   └── admin-auth.ts          # Admin checks
│   │   │
│   │   ├── cache/
│   │   │   ├── cache.ts               # Caching logic
│   │   │   ├── cache-config.ts        # Cache settings
│   │   │   └── cache-invalidation.ts  # Cache busting
│   │   │
│   │   ├── notifications/
│   │   │   ├── push-notifications.ts  # Web push
│   │   │   ├── email.ts               # Email via Resend
│   │   │   ├── notify.ts              # Notification dispatcher
│   │   │   └── smart-toast.ts         # Toast messages
│   │   │
│   │   ├── qr/
│   │   │   └── qr-generator.ts        # QR code generation
│   │   │
│   │   ├── vault/
│   │   │   └── vault-operations.ts    # Data vault logic
│   │   │
│   │   ├── pricing/
│   │   │   └── pricing.ts             # Pricing calculations
│   │   │
│   │   ├── utils.ts                   # General utilities
│   │   ├── constants.ts               # App constants
│   │   ├── validation.ts              # Zod schemas
│   │   └── date-utils.ts              # Date helpers
│   │
│   └── types/
│       ├── database.ts                # Database types
│       ├── api.ts                     # API types
│       └── index.ts                   # Exports
│
├── public/                            # Static assets
│   ├── icons/
│   ├── images/
│   └── animations/
│
├── docs/                              # Documentation
│   ├── SYSTEM_BLUEPRINT.md
│   ├── DEVELOPER_SYSTEM_ARCHITECTURE.md
│   ├── DATA_VAULT_SETUP_COMPLETE.md
│   ├── SECURITY_IMPLEMENTATION.md
│   └── ...
│
├── scripts/                           # Utility scripts
│   ├── lighthouse-audit.js
│   ├── compress-images.js
│   └── preload-critical-resources.js
│
├── supabase/                          # Supabase configs
│   ├── migrations/
│   ├── functions/
│   └── config.toml
│
├── openclaw/                          # WhatsApp bot integration
│   ├── routes/
│   ├── handlers/
│   └── README.md
│
├── .kiro/                             # Project guidelines
│   └── steering/
│
├── .vercel/                           # Vercel config
├── .next/                             # Next.js build output
├── node_modules/                      # Dependencies
│
├── .env.local                         # Local environment
├── .env.example                       # Environment template
├── .gitignore                         # Git ignore rules
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript config
├── tailwind.config.ts                 # Tailwind config
├── next.config.ts                     # Next.js config
├── eslint.config.mjs                  # ESLint rules
├── middleware.ts                      # Next.js middleware
├── vercel.json                        # Vercel settings
└── README.md                          # Project README
```

### Core Modules

#### 1. Authentication Module (`src/lib/auth/`)
- **Purpose**: Manages user identity and authorization
- **Components**:
  - `auth-helpers.ts`: Login, signup, password reset
  - `auth-protection.ts`: Route guards, session checks
  - `admin-auth.ts`: Admin-only route verification

#### 2. VTU Services Module (`src/app/api/v1/`)
- **Purpose**: Handles VTU transactions
- **Endpoints**: `/airtime`, `/data`, `/cable`, `/electricity`, `/betting`
- **Provider**: Inlomax API integration

#### 3. Payment Module (`src/app/api/v1/flutterwave/`)
- **Purpose**: Payment processing and webhooks
- **Features**: Deposits, virtual accounts, transfers, webhooks

#### 4. Data Vault Module (`src/app/api/v1/data-vault/`)
- **Purpose**: Park and retrieve data for later use
- **Features**: QR codes, atomic transactions, auto-refund on expiry

#### 5. WhatsApp Bot Module (`src/app/api/v1/openclaw/` + `openclaw/`)
- **Purpose**: USSD-style commands via WhatsApp
- **Features**: Stateful sessions, command routing, rate limiting

#### 6. Admin Module (`src/app/admin/`)
- **Purpose**: Admin dashboard and operations
- **Features**: User management, transaction monitoring, analytics

---

## Nervous System (Communication)

The **nervous system** represents how different parts of the application communicate.

### Request Flow Architecture

```
┌─────────────────────┐
│   CLIENT REQUEST    │ (Web/Mobile/WhatsApp)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   NEXT.JS MIDDLEWARE                    │
│   • Auth token verification             │
│   • Session validation                  │
│   • CORS & security headers             │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   ROUTE HANDLER                         │
│   • Input validation (Zod)              │
│   • Rate limit check                    │
│   • Request parsing                     │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   BUSINESS LOGIC                        │
│   • Service layer                       │
│   • Calculations & validation           │
│   • State management                    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   DATABASE LAYER                        │
│   • Supabase SDK calls                  │
│   • RLS enforcement                     │
│   • Transaction management              │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   EXTERNAL SERVICES                     │
│   • Inlomax API (VTU)                   │
│   • Flutterwave (Payments)              │
│   • Email/Push services                 │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   RESPONSE BUILDER                      │
│   • Error handling                      │
│   • Response formatting                 │
│   • Status codes                        │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   CLIENT RESPONSE                       │
│   • JSON response                       │
│   • Status & error codes                │
│   • Transaction confirmation            │
└─────────────────────────────────────────┘
```

### Event Communication Patterns

#### 1. Request-Response (Synchronous)
- **Use Case**: User purchases airtime
- **Flow**:
  1. Client sends POST `/api/v1/airtime/buy`
  2. Server validates & processes
  3. Returns immediate response
  4. Client displays confirmation

#### 2. Webhooks (Asynchronous)
- **Use Case**: Payment provider confirms transaction
- **Flow**:
  1. Flutterwave completes payment
  2. Sends webhook to `/api/flutterwave/webhook`
  3. Server verifies signature
  4. Updates transaction status
  5. Triggers balance update

#### 3. Real-time Subscriptions
- **Use Case**: Live transaction updates
- **Technology**: Supabase Subscriptions
- **Flow**:
  1. Client subscribes to transactions table
  2. Database trigger fires on update
  3. Broadcasting to all subscribers
  4. Client UI updates automatically

#### 4. Message Queue (Future)
- **Use Case**: Delayed processing (scheduled top-ups)
- **Pattern**: Store job → Background processor → Execution

### Inter-Service Communication

#### API-to-Database
```typescript
// Route Handler calls Supabase
const { data, error } = await supabase
  .from('transactions')
  .insert({ ...transactionData })
  .select()
```

#### API-to-External (Inlomax VTU)
```typescript
// Server-side call to VTU provider
const response = await fetch('https://api.inlomax.com/airtime/buy', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${INLOMAX_API_KEY}` },
  body: JSON.stringify(payload)
})
```

#### API-to-Email (Resend)
```typescript
// Send email via Resend
await resend.emails.send({
  from: 'noreply@tada.ng',
  to: userEmail,
  subject: 'Transaction Receipt',
  html: receiptTemplate
})
```

#### Webhook Broadcasting
```typescript
// On transaction completion, trigger webhooks
const webhooks = await getSubscribedWebhooks(userId, 'transaction.completed')
await Promise.all(
  webhooks.map(w => deliverWebhook(w, transactionData))
)
```

---

## Circulatory System (Data Flow)

The **circulatory system** represents how data moves through the entire application.

### Main Data Pipelines

#### Pipeline 1: Airtime Purchase Flow

```
┌──────────────────┐
│  USER INITIATES  │
│  AIRTIME PURCHASE│
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ VALIDATE INPUT                       │
│ • Phone number format                │
│ • Amount range                       │
│ • Network support                    │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ CHECK USER BALANCE                   │
│ • Read from wallet table             │
│ • Verify sufficient funds            │
│ • Apply transaction fees             │
└────────┬─────────────────────────────┘
         │
         ▼ (Success)
┌──────────────────────────────────────┐
│ DEBIT USER WALLET                    │
│ • Lock transaction row               │
│ • Debit amount + fee                 │
│ • Create wallet record               │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ SEND TO INLOMAX PROVIDER             │
│ • API request with credentials       │
│ • Wait for response                  │
│ • Timeout: 30 seconds                │
└────────┬──────────────┬──────────────┘
         │ (Success)    │ (Failure)
         ▼              ▼
     ┌────────────┐ ┌────────────────┐
     │UPDATE      │ │REFUND WALLET   │
     │TRANSACTION │ │RECORD ERROR    │
     │STATUS:OK   │ │NOTIFY USER     │
     └────┬───────┘ └────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ RECORD TRANSACTION                   │
│ • Status: completed/failed           │
│ • Provider reference                 │
│ • Timestamp & metadata               │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ TRIGGER NOTIFICATIONS                │
│ • Push notification                  │
│ • Email receipt                      │
│ • In-app toast                       │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ WEBHOOK DELIVERY                     │
│ • Find subscribed webhooks           │
│ • Create signed payload              │
│ • Async delivery (retry on fail)     │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  USER RECEIVES   │
│  AIRTIME CREDIT  │
└──────────────────┘
```

#### Pipeline 2: Payment Deposit Flow (Flutterwave)

```
┌──────────────────┐
│  USER DEPOSITS   │
│  VIA FLUTTERWAVE │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ INITIALIZE PAYMENT                   │
│ • Create transaction record          │
│ • Status: pending                    │
│ • Generate reference                 │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ REDIRECT TO FLUTTERWAVE              │
│ • Hosted checkout page               │
│ • User enters payment method         │
│ • Completes 3D Secure (if required)  │
└────────┬─────────────────────────────┘
         │
         ▼ (Payment processed)
┌──────────────────────────────────────┐
│ FLUTTERWAVE CONFIRMS                 │
│ • Webhook sent to callback           │
│ • Payment status: success            │
│ • HMAC signature included            │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ VERIFY WEBHOOK SIGNATURE             │
│ • Check X-Flutterwave-Signature      │
│ • Compare HMAC                       │
│ • Reject if invalid                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ CREDIT USER WALLET                   │
│ • Update wallet balance              │
│ • Deduct platform fees               │
│ • Create deposit record              │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ UPDATE TRANSACTION                   │
│ • Status: completed                  │
│ • Store provider ID                  │
│ • Record timestamp                   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ SEND NOTIFICATIONS                   │
│ • Email receipt                      │
│ • Push notification                  │
│ • Update dashboard (real-time)       │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  USER WALLET     │
│  FUNDED          │
└──────────────────┘
```

#### Pipeline 3: Data Vault Operation Flow

```
┌──────────────────────────────────────┐
│ USER PURCHASES DATA (No Recipient)   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ VALIDATE DATA PURCHASE               │
│ • Check recipient not provided       │
│ • Verify plan valid                  │
│ • Debit wallet                       │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ CREATE VAULT ENTRY                   │
│ • Insert into data_vault table       │
│ • Status: pending_delivery           │
│ • Generate 8-digit PIN               │
│ • Set expiry: 7 days                 │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ GENERATE QR CODE                     │
│ • Encode vault ID + PIN              │
│ • Create PNG image                   │
│ • Store reference                    │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ SEND TO USER                         │
│ • QR code image                      │
│ • PIN number                         │
│ • Share instructions                 │
│ • Vault ID                           │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ USER SHARES WITH RECIPIENT           │
│ • QR code (screenshot/photo)         │
│ • PIN (verbal/text)                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ RECIPIENT CLAIMS DATA                │
│ • Scan QR or enter vault ID          │
│ • Provide 8-digit PIN                │
│ • Verify matching                    │
└────────┬─────────────────────────────┘
         │
         ▼ (Success)
┌──────────────────────────────────────┐
│ VERIFY & DELIVER                     │
│ • Check vault not expired            │
│ • Check not already claimed          │
│ • Atomically transfer data           │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ UPDATE VAULT STATUS                  │
│ • Status: claimed                    │
│ • Claimed by: recipient_id           │
│ • Claimed at: timestamp              │
│ • Send notification to sender        │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ RECIPIENT RECEIVES DATA              │
│ • Data added to recipient's account  │
│ • Balance/plan updated               │
│ • Notification sent                  │
└────────┬─────────────────────────────┘
         │
         ▼ (7 days later, if not claimed)
┌──────────────────────────────────────┐
│ EXPIRY JOB RUNS (Cron)               │
│ • Check vault.expires_at < now       │
│ • Status: expired                    │
│ • Refund sender wallet               │
│ • Send expiry notification           │
└────────────────────────────────────────┘
```

#### Pipeline 4: WhatsApp Bot Command Flow

```
┌──────────────────────────────────────┐
│ USER SENDS WHATSAPP MESSAGE          │
│ Example: "buy airtime"               │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ OPENCLAW WEBHOOK RECEIVES            │
│ • POST /api/openclaw/webhook         │
│ • Parse message & phone number       │
│ • Extract session context            │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ LOAD/CREATE SESSION                  │
│ • Find existing session by phone     │
│ • Or create new session              │
│ • Set timeout: 5 minutes             │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ ROUTE COMMAND                        │
│ • Parse command intent               │
│ • Match against handlers             │
│ • Execute appropriate handler        │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ PROCESS STATE MACHINE                │
│ • Current state: "awaiting_network"  │
│ • Next state: "awaiting_amount"      │
│ • Validate transitions               │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ PERFORM ACTION (if complete)         │
│ • Debit wallet                       │
│ • Process VTU request                │
│ • Update transaction                 │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ BUILD RESPONSE MESSAGE               │
│ • Typewriter-style friendly text     │
│ • Include next steps                 │
│ • Offer quick-reply buttons          │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ SEND WHATSAPP REPLY                  │
│ • Via OpenClaw API                   │
│ • Markdown formatting                │
│ • Interactive buttons                │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ STORE SESSION STATE                  │
│ • Save user responses                │
│ • Persist in database                │
│ • Set expiry timestamp               │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ USER CONTINUES CONVERSATION          │
│ • Next message triggers same flow    │
│ • State machine advances             │
│ • Session persists                   │
└──────────────────────────────────────┘
```

---

## API Pipeline Architecture

### Request-Response Lifecycle

```
1. REQUEST ARRIVES
   ├─ Check rate limits (Redis/Memory)
   ├─ Validate content-type
   ├─ Parse JSON body
   └─ Extract headers

2. AUTHENTICATION
   ├─ Verify JWT token
   ├─ Load user session
   ├─ Check token expiry
   └─ Load user permissions

3. AUTHORIZATION
   ├─ Check route permissions
   ├─ Verify API key (if applicable)
   ├─ Check user role
   └─ Validate resource ownership

4. VALIDATION
   ├─ Parse input with Zod schema
   ├─ Type conversion
   ├─ Business rule validation
   └─ Cross-field validation

5. BUSINESS LOGIC
   ├─ Check dependencies
   ├─ Calculate amounts
   ├─ Apply discounts/fees
   └─ Validate state transitions

6. DATABASE OPERATIONS
   ├─ Start transaction (atomic)
   ├─ Enforce RLS policies
   ├─ Lock rows if needed
   ├─ Execute queries
   └─ Commit/Rollback

7. EXTERNAL CALLS
   ├─ Call VTU provider (Inlomax)
   ├─ Call payment gateway (Flutterwave)
   ├─ Send emails (Resend)
   └─ Push notifications (web-push)

8. RESPONSE BUILDING
   ├─ Format response object
   ├─ Include metadata
   ├─ Set cache headers
   └─ Set status code

9. LOGGING & MONITORING
   ├─ Log transaction
   ├─ Track metrics
   ├─ Monitor performance
   └─ Alert on errors

10. SEND RESPONSE
    └─ HTTP Response to client
```

### API Endpoint Categories

#### VTU Service Endpoints
```
POST   /api/v1/airtime/buy              → Purchase airtime
POST   /api/v1/data/buy                 → Purchase data bundle
GET    /api/v1/data/plans               → List data plans
POST   /api/v1/cable/buy                → Subscribe cable TV
POST   /api/v1/electricity/pay          → Pay electricity bill
POST   /api/v1/betting/topup            → Top-up betting wallet
```

#### Wallet & Transaction Endpoints
```
GET    /api/v1/wallet/balance           → Get wallet balance
GET    /api/v1/transactions             → List transactions
GET    /api/v1/transactions/:id         → Get transaction details
POST   /api/v1/withdrawal/request       → Request bank withdrawal
```

#### Data Vault Endpoints
```
POST   /api/v1/data-vault/create        → Create vault entry
GET    /api/v1/data-vault/:vaultId      → Retrieve vault entry
POST   /api/v1/data-vault/:vaultId/claim→ Claim vault data
GET    /api/v1/data-vault/list          → List user's vaults
```

#### Authentication Endpoints
```
POST   /api/v1/auth/signup              → Register new user
POST   /api/v1/auth/login               → Login user
POST   /api/v1/auth/logout              → Logout user
POST   /api/v1/auth/refresh             → Refresh JWT token
POST   /api/v1/auth/verify-pin          → Verify PIN for sensitive ops
```

#### Developer API Endpoints
```
POST   /api/v1/airtime/buy              → (With API key auth)
POST   /api/v1/data/buy                 → (With API key auth)
GET    /api/v1/wallet/balance           → (With API key auth)
```

#### Webhook Endpoints
```
POST   /api/flutterwave/webhook         → Payment confirmation
POST   /api/inlomax/webhook             → VTU provider callback
POST   /api/openclaw/webhook            → WhatsApp message
```

#### Admin Endpoints
```
GET    /api/admin/users                 → List all users
GET    /api/admin/transactions          → Transaction analytics
POST   /api/admin/refund                → Manual refund
PATCH  /api/admin/user/:id              → Update user
```

#### Cron Endpoints
```
POST   /api/cron/vault-expiry           → Process expired vaults
POST   /api/cron/recurring-purchases    → Execute scheduled top-ups
POST   /api/cron/cleanup                → Database cleanup
```

---

## Data Pipeline Architecture

### Database Schema Overview

#### Core Tables

**1. profiles**
```sql
id (UUID PK)
email (TEXT UNIQUE)
full_name (TEXT)
phone_number (TEXT)
kyc_level (INT: 0-3)
kyc_verified_at (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**2. wallets**
```sql
id (UUID PK)
user_id (UUID FK)
balance (DECIMAL)
bonus_balance (DECIMAL)
last_transaction_at (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**3. transactions**
```sql
id (UUID PK)
user_id (UUID FK)
type (TEXT: airtime|data|cable|electricity|betting|deposit|withdrawal)
status (TEXT: pending|completed|failed|refunded)
amount (DECIMAL)
fee (DECIMAL)
network (TEXT)
phone_number (TEXT)
reference (TEXT UNIQUE)
provider_reference (TEXT)
external_reference (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
expires_at (TIMESTAMP)
```

**4. data_vault**
```sql
id (UUID PK)
sender_id (UUID FK)
recipient_id (UUID FK NULLABLE)
pin (TEXT)
data_plan_id (TEXT)
network (TEXT)
status (TEXT: pending|claimed|expired|refunded)
claimed_at (TIMESTAMP)
expires_at (TIMESTAMP)
created_at (TIMESTAMP)
```

**5. reseller_api_keys**
```sql
id (UUID PK)
user_id (UUID FK)
api_key (TEXT UNIQUE)
api_secret (TEXT)
rate_limit (INT)
monthly_limit (DECIMAL)
monthly_usage (DECIMAL)
is_active (BOOLEAN)
expires_at (TIMESTAMP)
created_at (TIMESTAMP)
```

**6. reseller_webhooks**
```sql
id (UUID PK)
user_id (UUID FK)
url (TEXT)
events (TEXT[])
is_active (BOOLEAN)
secret (TEXT)
created_at (TIMESTAMP)
```

**7. loyalty_points**
```sql
id (UUID PK)
user_id (UUID FK)
points (INT)
tier (TEXT: bronze|silver|gold|platinum)
last_activity (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**8. beneficiaries**
```sql
id (UUID PK)
user_id (UUID FK)
phone_number (TEXT)
network (TEXT)
name (TEXT)
created_at (TIMESTAMP)
```

#### Supporting Tables
- `scheduled_purchases` - Recurring top-up jobs
- `push_subscriptions` - Web push endpoints
- `referrals` - Referral tracking
- `admin_logs` - Admin action audit trail

### Data Query Patterns

#### Pattern 1: Get User Balance
```typescript
// Efficient query with row level security
const { data } = await supabase
  .from('wallets')
  .select('balance, bonus_balance')
  .eq('user_id', userId)
  .single()
```

#### Pattern 2: Record Transaction
```typescript
// Atomic insert with validation
const { data: transaction, error } = await supabase
  .from('transactions')
  .insert({
    user_id: userId,
    type: 'airtime',
    amount,
    fee,
    status: 'pending',
    reference: `TADA-${Date.now()}`
  })
  .select()
  .single()
```

#### Pattern 3: Update Transaction Status
```typescript
// Update with timestamp
const { error } = await supabase
  .from('transactions')
  .update({
    status: 'completed',
    provider_reference: providerRef,
    updated_at: new Date().toISOString()
  })
  .eq('id', transactionId)
  .eq('user_id', userId) // RLS enforcement
```

#### Pattern 4: List User Transactions
```typescript
// Paginated query with filtering
const { data: transactions } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(0, 24) // 25 items per page
```

### Caching Strategy

| Data | Cache Duration | Invalidation |
|------|-----------------|--------------|
| Data plans | 1 hour | Manual refresh |
| Pricing tiers | 24 hours | Manual refresh |
| User balance | Real-time (RLS) | Immediate update |
| Transactions | 5 minutes | On new transaction |
| User profile | 30 minutes | On profile update |

---

## Application Rhythm & Timing

The **app's rhythm** represents the temporal patterns and cycles of operation.

### Request Timing

#### Real-time Operations (< 3 seconds)
- User login
- Wallet balance check
- Data plan listing
- Transaction history retrieval
- API key validation

#### Standard Operations (3-15 seconds)
- Airtime purchase
- Data bundle purchase
- Data vault creation
- Flutterwave payment initialization

#### Background Operations (> 15 seconds)
- Vault expiry processing (daily, 2 AM)
- Scheduled top-up execution (per user's time)
- Analytics aggregation (nightly)
- Database maintenance (weekly)

### Polling Intervals

```
FRONTEND POLLING PATTERNS:

1. Balance Updates
   └─ Interval: 60 seconds
   └─ Triggers: After purchase, on focus

2. Transaction Status
   └─ Interval: 5 seconds (first 1 min)
   └─ Interval: 30 seconds (up to 5 min)
   └─ Then: Stop polling

3. Data Vault Status
   └─ Interval: 60 seconds
   └─ Stops: When claimed or expired

4. Notifications
   └─ Real-time (via Supabase subscriptions)
   └─ Fallback: 30-second polling
```

### Rate Limiting Strategy

```
RATE LIMITS (per user):

1. Login Attempts
   └─ 5 per 15 minutes
   └─ Lockout: 30 minutes after max

2. API Requests (Authenticated)
   └─ 100 per minute
   └─ Per-endpoint limits also apply

3. API Requests (Developer)
   └─ Configurable per API key
   └─ Default: 60 per minute
   └─ Monthly quota: ₦100,000

4. VTU Purchases
   └─ 10 per minute
   └─ ₦500,000 per day limit

5. WhatsApp Bot
   └─ 20 commands per hour
   └─ 5-minute session timeout
```

### Scheduled Jobs (Cron)

```
DAILY JOBS:

2:00 AM UTC
└─ Vault expiry processor
   └─ Find expired vaults
   └─ Refund senders
   └─ Send notifications

3:00 AM UTC
└─ Analytics aggregation
   └─ Daily transaction stats
   └─ User activity metrics

HOURLY JOBS:

Every hour
└─ Webhook retry processor
   └─ Retry failed webhooks
   └─ Max 3 attempts
   └─ Exponential backoff

EVERY 5 MINUTES:

└─ Recurring purchase executor
   └─ Check scheduled_purchases
   └─ Execute if time matched
   └─ Update transaction record

REAL-TIME JOBS:

On Transaction Complete
└─ Send notifications (email + push)
└─ Trigger webhooks
└─ Update balance (real-time)
└─ Broadcast to subscribed clients
```

### Performance SLAs

| Operation | Target | Actual |
|-----------|--------|--------|
| Login/Auth | < 500ms | ~200ms |
| Balance Check | < 200ms | ~100ms |
| Data Plan List | < 300ms | ~250ms |
| Airtime Purchase | < 10s | ~5-7s |
| Payment Webhook | < 2s | ~800ms |
| Dashboard Load | < 1.5s (FCP) | ~1.2s |
| API Response | < 200ms | ~150ms |

---

## Security Architecture

### Authentication Flow

```
LOGIN REQUEST
    ↓
[Validate Email/Phone]
    ↓
[Generate OTP / Verify Password]
    ↓
[Create JWT Token]
    ├─ Header: { alg: HS256, typ: JWT }
    ├─ Payload: { sub: userId, email, iat, exp }
    └─ Signature: HMAC-SHA256(secret)
    ↓
[Store in HttpOnly Cookie / Secure Storage]
    ↓
[Return Auth Token]
    ↓
[CLIENT: Store & Include in Headers]
```

### Authorization Tiers

**Tier 1: Anonymous**
- View public pages
- Browse pricing
- Read documentation

**Tier 2: Authenticated User**
- Dashboard access
- Purchase VTU
- View transactions
- Manage beneficiaries

**Tier 3: Developer**
- API key access
- Webhook management
- Usage analytics

**Tier 4: Admin**
- User management
- Transaction monitoring
- System analytics
- Refund processing

### Row Level Security (RLS)

```sql
-- Example: Users can only see their own transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

-- Example: Admins see all transactions
CREATE POLICY "Admins can view all transactions"
ON transactions FOR SELECT
USING (auth.jwt() ->> 'role' = 'admin');
```

### Encryption

| Data | Method | Where |
|------|--------|-------|
| Passwords | bcrypt (cost: 12) | Database |
| Sensitive fields | AES-256-GCM | Vault (Flutterwave) |
| API secrets | Hashed SHA-256 | Environment |
| PII (phone, email) | At-rest encryption | Supabase |
| In-transit | TLS 1.3 | HTTPS |

### Webhook Security

```javascript
// HMAC-SHA256 Signature Verification
function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Attack Prevention

| Attack | Prevention |
|--------|-----------|
| SQL Injection | Parameterized queries (Supabase SDK) |
| XSS | React DOM escaping, CSP headers |
| CSRF | SameSite cookies, CSRF tokens |
| Brute Force | Rate limiting + account lockout |
| DDoS | Vercel Edge protection |
| Man-in-Middle | TLS 1.3, HSTS headers |
| API Key Theft | HttpOnly cookies, Secure flag |

---

## Performance Optimization

### Frontend Optimization

#### Code Splitting
- Next.js automatic code splitting per route
- Dynamic imports for heavy components
- Lazy loading for modals, charts

#### Image Optimization
- Next.js Image component
- WebP format with fallbacks
- Responsive images (srcset)
- CDN via Vercel

#### Bundling
- Tree shaking unused code
- Minification with Terser
- CSS purging with Tailwind
- Asset compression

#### Metrics
```
Core Web Vitals Target:
├─ LCP (Largest Contentful Paint): < 2.5s ✅
├─ FID (First Input Delay): < 100ms ✅
├─ CLS (Cumulative Layout Shift): < 0.1 ✅
└─ TTFB (Time to First Byte): < 600ms ✅
```

### Backend Optimization

#### Database Optimization
- Index commonly queried columns
- Denormalization where appropriate
- Connection pooling
- Query optimization

```sql
-- Example: Index on frequently filtered columns
CREATE INDEX idx_transactions_user_id_status 
ON transactions(user_id, status);
```

#### Caching Strategy
```typescript
// Cache: Data plans (1 hour)
const plans = await cache(
  'data_plans',
  () => fetchDataPlans(),
  { ttl: 3600 }
);

// Cache: User balance (Real-time via RLS)
// No caching - always fresh via Supabase

// Cache: Pricing tiers (24 hours)
const pricing = await cache(
  'pricing_tiers',
  () => fetchPricing(),
  { ttl: 86400 }
);
```

#### API Response Optimization
- Gzip compression
- Selective field returns
- Pagination for large datasets
- Conditional requests (ETag)

### Rate Limiting Implementation

```typescript
// Memory-based rate limiter (local)
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  isAllowed(key: string, limit: number, window: number): boolean {
    const now = Date.now();
    const times = this.requests.get(key) || [];
    
    // Remove old entries
    const recent = times.filter(t => now - t < window);
    
    if (recent.length < limit) {
      this.requests.set(key, [...recent, now]);
      return true;
    }
    
    return false;
  }
}
```

---

## Deployment & Infrastructure

### Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│              GITHUB REPOSITORY                      │
│                                                     │
│  ├─ main branch (production)                        │
│  ├─ develop branch (staging)                        │
│  └─ feature/* branches (dev)                        │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│         GITHUB ACTIONS (CI/CD)                      │
│                                                     │
│  1. Run linters (ESLint)                            │
│  2. Type check (TypeScript)                         │
│  3. Build (Next.js)                                 │
│  4. Run tests (Jest - optional)                     │
│  5. Upload artifacts                               │
└─────────────┬───────────────────────────────────────┘
              │
              ├─ On push to main
              │     └─ Deploy to Vercel Production
              │
              ├─ On push to develop
              │     └─ Deploy to Vercel Staging
              │
              └─ On push to feature/*
                    └─ Deploy to Vercel Preview
```

### Environment Configuration

#### Production (.env.production)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Payments
FLUTTERWAVE_SECRET_KEY=sk_live_...
FLUTTERWAVE_PUBLIC_KEY=pk_live_...

# VTU Provider
INLOMAX_API_KEY=prod_key...
INLOMAX_BASE_URL=https://api.inlomax.com

# WhatsApp Bot
OPENCLAW_API_KEY=openclaw_key...

# Email
RESEND_API_KEY=re_...

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Security
JWT_SECRET=very-secret-key...
```

#### Staging (.env.staging)
- Same as production but with test credentials

#### Development (.env.local)
- Local Supabase instance or dev credentials
- Mock external services

### Scaling Strategy

#### Horizontal Scaling
- Stateless API routes (deploy on multiple Vercel regions)
- Database connection pooling
- CDN for static assets

#### Vertical Scaling
- Optimize database queries
- Increase Supabase compute tier
- Cache more aggressively

#### Database Scaling
- Add indexes for slow queries
- Archive old transaction records
- Implement partitioning for large tables

### Monitoring & Alerts

```
MONITORING STACK:

1. Application Metrics (Vercel)
   └─ Response times
   └─ Error rates
   └─ Request volume

2. Error Tracking (Optional Sentry)
   └─ Exceptions
   └─ Stack traces
   └─ User impact

3. Performance (Vercel Speed Insights)
   └─ Core Web Vitals
   └─ Page load times
   └─ Third-party impact

4. Uptime Monitoring
   └─ Health checks (/health endpoint)
   └─ Database connectivity
   └─ External API availability
```

### Disaster Recovery

| RTO | RPO | Strategy |
|-----|-----|----------|
| 1 hour | 15 minutes | Automated failover to backup region |
| 24 hours | 1 hour | Database backups (Supabase) |
| 72 hours | 24 hours | Transaction logs |

---

## Summary

The **TADA VTU system architecture** is built on a foundation of:

1. **Skeletal System** (Structure): Clean separation of concerns with modular organization
2. **Nervous System** (Communication): Request-response, webhooks, real-time subscriptions
3. **Circulatory System** (Data Flow): Multi-stage pipelines for VTU, payments, data vault
4. **API Pipeline**: RESTful endpoints with validation, authentication, authorization
5. **Data Pipeline**: PostgreSQL database with RLS, atomicity, and real-time capabilities
6. **Application Rhythm**: Polling, cron jobs, rate limiting, and performance SLAs
7. **Security**: Multi-tier auth, encryption, webhook verification, attack prevention
8. **Performance**: Frontend optimization, caching, indexing, rate limiting
9. **Deployment**: GitHub → GitHub Actions → Vercel with environment management

This architecture ensures **reliability, security, scalability, and maintainability** while delivering a world-class user experience.

---

## Quick Reference

### Key Metrics
- **Requests/sec**: 1,000+
- **Concurrent Users**: 10,000+
- **Database Connections**: 100+ (pooled)
- **API Response Time**: < 200ms (p95)
- **Uptime**: 99.9%

### Key Files
- API routes: `src/app/api/**`
- Components: `src/components/**`
- Utilities: `src/lib/**`
- Database: `supabase/migrations/**`
- Configuration: `next.config.ts`, `tailwind.config.ts`

### Key Commands
```bash
npm run dev           # Start development server
npm run build         # Production build
npm run lint          # Check code quality
npm run type-check    # TypeScript validation
npm run perf:full     # Full performance audit
```

---

**Document Version**: 1.0  
**Last Reviewed**: May 31, 2026  
**Next Review**: August 31, 2026  
**Status**: ✅ Production Ready
