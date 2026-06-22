# System Design & Architecture

## 1. Overview

**Project:** TADA VTU
**Framework:** Next.js with the App Router
**Primary backend:** Supabase (Postgres + Auth + Row Level Security)
**Hosting target:** Next.js route handlers, likely deployed on Vercel

This document describes the verified architecture of the app, including frontend-to-backend communication, backend services, data flow, database design, and the core "skeletal and circulatory" system.

---

## 2. Frontend Architecture

### 2.1 Structure
- App entry: `src/app/layout.tsx`
- Root page: `src/app/page.tsx`
- Error boundary: `src/app/error.tsx`
- Route structure: filesystem-based routing in `src/app/`
- Middleware: `middleware.ts`

### 2.2 Framework
- Next.js App Router
- Server components by default
- Client components used where interactive UI or browser-only APIs are required
- `src/components/` contains reusable UI components such as QR modals, widgets, forms, and data vault cards

### 2.3 Key Frontend Modules
- `src/hooks/useAuth.ts`
- `src/hooks/useDataVault.ts`
- `src/hooks/useDataPlans.ts`
- `src/hooks/useContacts.ts`
- `src/hooks/use-flutterwave.ts`
- `src/hooks/useRealtimeNotifications.ts`

### 2.4 API communication
- Fetch / SWR patterns: `src/lib/swr-fetcher.ts`
- Internal APIs hosted by Next route handlers under `src/app/api`
- Supabase client usage in browser: `src/lib/supabase/client.ts`

---

## 3. Backend Architecture

### 3.1 API layer
All server-side business logic runs in Next route handlers under `src/app/api/`.

Key route folders:
- `src/app/api/flutterwave/`
- `src/app/api/inlomax/`
- `src/app/api/data-vault/`
- `src/app/api/contacts/`
- `src/app/api/notifications/`
- `src/app/api/push/subscribe/`
- `src/app/api/cron/`
- `src/app/api/openclaw/`
- `src/app/api/admin/`

### 3.2 Integration layer
Service wrappers are centralized in `src/lib/api/` and related libs:
- `src/lib/api/flutterwave.ts`
- `src/lib/api/inlomax.ts`
- `src/lib/openclaw-utils.ts`
- `src/lib/api/deposit-processor.ts`
- `src/lib/push-notifications.ts`
- `src/lib/email.ts`
- `src/lib/webhook-security.ts`

### 3.3 Auth & session
- Supabase auth is the primary authentication provider
- Session middleware is implemented in `src/lib/supabase/middleware.ts`
- Admin auth is handled separately via `src/lib/admin-auth.ts`
- OpenClaw auth wrapper: `src/lib/openclaw-auth.ts`

### 3.4 Configuration & deployment
- `next.config.ts` configures Next.js behavior
- `vercel.json` defines cron job schedules and deployment routes
- `package.json` includes build, dev, lint, and production commands

---

## 4. Database Architecture

### 4.1 Primary tables (from `supabase/schema.sql`)
- `public.profiles`
- `public.transactions`
- `public.wallet_transactions`
- `public.beneficiaries`
- `public.notifications`
- `public.admins`
- `public.data_vault`

### 4.2 Key columns
- `profiles.balance`
- `transactions.type`, `status`, `reference`, `response_data`
- `wallet_transactions.balance_before`, `balance_after`
- `data_vault.status`, `expires_at`, `delivery_reference`

### 4.3 Supabase Row Level Security
Verified RLS policies exist for user-owned access in tables:
- `profiles`
- `transactions`
- `wallet_transactions`
- `beneficiaries`
- `notifications`
- `data_vault`

### 4.4 Core stored procedures / RPCs
From `supabase/schema.sql`:
- `public.handle_new_user()` — auto-creates a profile when a new auth user signs up
- `public.update_user_balance(...)` — updates profile balance and creates wallet transaction records atomically
- `public.park_data_vault(...)` — deducts balance and creates a data vault record in one atomic operation
- `public.process_expired_vault_items()` — expires old vault entries, refunds balances, creates wallet transactions, and notifies users

---

## 5. Frontend-to-Backend Communication

### 5.1 Verified flows

#### Data Vault
- Client hook: `src/hooks/useDataVault.ts`
- API endpoint: `src/app/api/data-vault/park/route.ts`
- Backend RPC: `public.park_data_vault(...)`

#### QR generation / redemption
- API endpoints:
  - `src/app/api/data-vault/generate-qr/route.ts`
  - `src/app/api/data-vault/redeem-qr/route.ts`
  - `src/app/api/data-vault/receipt/[vaultId]/route.ts`

#### Payments
- Client hook: `src/hooks/use-flutterwave.ts`
- API endpoints:
  - `src/app/api/flutterwave/initiate/route.ts`
  - `src/app/api/flutterwave/verify/route.ts`
  - `src/app/api/flutterwave/webhook/route.ts`
- External helper: `src/lib/api/flutterwave.ts`

#### Contacts & notifications
- Contacts API: `src/app/api/contacts/route.ts`
- Notifications API: `src/app/api/notifications/route.ts`
- Push subscribe API: `src/app/api/push/subscribe/route.ts`

---

## 6. External Integrations & Webhooks

### 6.1 Flutterwave
- Initiation and verification endpoints in `src/app/api/flutterwave`
- Webhook handling in `src/app/api/flutterwave/webhook/route.ts`
- Signature validation in `src/lib/webhook-security.ts`

### 6.2 Inlomax
- Webhook endpoint: `src/app/api/inlomax/webhook/route.ts`
- API helper: `src/lib/api/inlomax.ts`

### 6.3 OpenClaw
- OpenClaw API routes in `src/app/api/openclaw`
- Auth wrapper: `src/lib/openclaw-auth.ts`
- Utility layer: `src/lib/openclaw-utils.ts`

### 6.4 Push & email
- Push helper: `src/lib/push-notifications.ts`
- Email helper: `src/lib/email.ts`
- Subscription endpoint: `src/app/api/push/subscribe/route.ts`

---

## 7. Background Jobs and Cron

### 7.1 Scheduled cron routes
- `src/app/api/cron/process-vault-expiry/route.ts`
- `src/app/api/cron/verify-payments/route.ts`
- `src/app/api/cron/process-transfers/route.ts`
- `src/app/api/cron/process-pending-transactions/route.ts`

### 7.2 Vercel cron configuration
- `vercel.json` defines schedule rules that invoke internal API routes
- These routes run periodic jobs such as expiration processing and transaction reconciliation

### 7.3 Asynchronous lifecycle
- External provider webhooks can update state outside direct user requests
- Cron jobs enforce expiry and refunds
- Stored procedures manage atomic balance logic and refund processing

---

## 8. Data Flow Pipeline

### 8.1 Standard request flow
1. Browser sends request to a Next.js frontend page or component
2. UI hook or action calls an internal API route under `src/app/api`
3. Route handler executes business logic
4. Handler reads/writes Supabase database or calls external provider
5. Response returns to client

### 8.2 Transactional data flow: Park Data Vault
1. User triggers a vault park action in the frontend
2. Frontend calls `POST /api/data-vault/park`
3. Route handler creates a transaction record and calls `public.park_data_vault(...)`
4. RPC locks the user profile, checks/updates balance, inserts a `data_vault` row, returns result
5. Client updates UI with new balance and vault state

### 8.3 Payment flow: Flutterwave deposit
1. Frontend calls `POST /api/flutterwave/initiate`
2. Backend creates Flutterwave payment request via `src/lib/api/flutterwave.ts`
3. External provider sends webhook to `/api/flutterwave/webhook`
4. Webhook handler validates signature and updates transaction status
5. `public.update_user_balance(...)` is called to adjust user balance atomically

### 8.4 Expiry/refund flow
1. Cron invokes `/api/cron/process-vault-expiry`
2. Handler calls `public.process_expired_vault_items()`
3. Procedure expires vault rows, refunds user balances, records wallet transactions, and inserts notifications

---

## 9. System Blueprint

### 9.1 Logical layers
- **Presentation layer**: Next.js pages/components in `src/app` and `src/components`
- **Client logic**: hooks in `src/hooks`
- **API layer**: route handlers under `src/app/api`
- **Service/integration layer**: `src/lib/api/*`, `src/lib/openclaw-utils.ts`
- **Data layer**: Supabase tables, functions, RLS policies in `supabase/schema.sql`
- **Infrastructure layer**: Next runtime, Vercel cron, deployment config

### 9.2 Mermaid flow diagram
```mermaid
flowchart LR
  Browser[Browser / Mobile]
  subgraph Frontend
    Browser -->|fetch/SWR| Next[Next.js App]
  end
  subgraph Backend
    Next -->|HTTP /api/*| API[Route Handlers]
    API -->|Supabase Client| DB[Supabase / Postgres]
    API -->|External API calls| Ext[Flutterwave / Inlomax / OpenClaw / Resend / Push]
    Cron[Cron (Vercel)] -->|invoke| API
    Webhook[External Webhooks] -->|POST| API
    DB -->|RPCs| RPC[park_data_vault / update_user_balance / process_expired_vault_items]
  end
  Browser -->|Realtime| DB
  Ext -->|webhook| API
```

---

## 10. Skeletal System

The skeletal system describes the core modules and the structure that holds the application together.

### 10.1 Core modules
- `src/app` — route definitions, page rendering, server layouts
- `src/components` — reusable UI components
- `src/hooks` — client behaviour, data fetching, and event wiring
- `src/app/api` — business endpoints
- `src/lib/supabase` — shared Supabase client/server logic
- `src/lib/api` — external service wrappers
- `supabase/schema.sql` — database schema and stored procedures

### 10.2 Responsibilities
- Presentation: UI rendering and interactions
- Authentication: user session and access control
- Business logic: API route handlers and service wrappers
- Persistence: Postgres data storage, RLS, and stored procedures
- Integration: external payment and telecom services
- Scheduling: cron and webhook-driven async jobs

---

## 11. Circulatory System

The circulatory system describes how data flows through the app and how state changes propagate.

### 11.1 Synchronous circulation
- UI → API routes → Supabase → response → UI
- Hooks and fetchers create the main synchronous data movement path
- Supabase auth sessions travel with browser requests and middleware

### 11.2 Asynchronous circulation
- External webhooks inject events into the system
- Cron triggers perform scheduled state cleanup and expiry handling
- Stored procedures execute atomic operations in the database
- Notifications and push messages are created asynchronously after state changes

### 11.3 Data movement channels
- HTTP: frontend → backend route handlers
- Database RPCs: backend → Supabase stored procedures
- External HTTP: backend → payment/telecom providers
- Webhooks: external providers → backend
- Cron: scheduler → backend API

---

## 12. Verified Facts

- The app is Next.js with app router and server components.
- Supabase is the central data backend with RLS and stored procedures.
- `public.park_data_vault(...)` is a verified atomic wallet/vault operation.
- `public.update_user_balance(...)` is the verified balance-update transaction function.
- Webhooks are validated through `src/lib/webhook-security.ts`.
- Cron jobs are scheduled through `vercel.json` and trigger internal API handlers.

---

## 13. Recommended Next Steps

- Add a dedicated architecture diagram asset or export the Mermaid diagram.
- Implement structured logging in API handlers and service wrappers.
- Harden webhook validation and secrets rotation.
- Add observability around `public.park_data_vault(...)` and `process_expired_vault_items()`.
