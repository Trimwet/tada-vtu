# Project Folder Structure and Git Map

## Repository Overview

- **Repository root:** `tada-vtu/`
- **Primary branch:** `main`
- **Remote:** `origin` → `https://github.com/Trimwet/tada-vtu.git`
- **Current commit:** `903d603` — `Save local changes`

---

## Top-Level Folder Structure

- `.git/`
- `.gitignore`
- `.env.local`
- `.next/`
- `.vercel/`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.ts`
- `middleware.ts`
- `README.md`
- `docs/`
- `public/`
- `scripts/`
- `src/`
- `supabase/`
- `openclaw/`
- `whatsapp-bot/`

---

## Main `src/` Structure

- `src/app/`
- `src/components/`
- `src/contexts/`
- `src/hooks/`
- `src/lib/`
- `src/types/`

### `src/app/`

- `admin/`
- `api/`
- `auth/`
- `contact/`
- `dashboard/`
- `docs/`
- `forgot-password/`
- `login/`
- `privacy/`
- `register/`
- `reset-password/`
- `terms/`
- `v/`
- `vault/`
- `apple-icon.svg`
- `error.tsx`
- `globals.css`
- `layout.tsx`
- `not-found.tsx`
- `page.tsx`

### `src/lib/`

- `admin-auth.ts`
- `api/`
- `api-utils.ts`
- `auth-helpers.ts`
- `auth-protection.ts`
- `cache-config.ts`
- `cache-invalidation.ts`
- `cache.ts`
- `cashback.ts`
- `circuit-breaker.ts`
- `constants.ts`
- `date-utils.ts`
- `email.ts`
- `notify.ts`
- `openclaw-auth.ts`
- `openclaw-utils.ts`
- `pricing-tiers.ts`
- `pricing.ts`
- `push-notifications.ts`
- `qr-generator.ts`
- `rate-limit.ts`
- `rate-limiter.ts`
- `scheduled-purchases.ts`
- `smart-toast.ts`
- `stateful-vtu-wrapper.ts`
- `supabase/`
- `swr-fetcher.ts`
- `toast.ts`
- `utils.ts`
- `validation.ts`
- `webhook-security.ts`

### `supabase/`

- `schema.sql`
- `functions/`
- `migrations/`

### `docs/`

- `SYSTEM_ARCHITECTURE_BLUEPRINT.md`
- `SYSTEM_BLUEPRINT.md`
- `DATA_VAULT_GUIDE.md`
- `DEVELOPER_SYSTEM_ARCHITECTURE.md`
- `OPENCLAW_API.md`
- `OPENCLAW_SECURITY.md`
- `CRON_SETUP_GUIDE.md`
- `RESELLER_API.md`
- `PROJECT_STATUS.md`
- `PERFORMANCE.md`
- `data-vault-master-blueprint.md`
- `data-vault-system.md`
- `data-vault-social-copy.md`
- `tada_data_vault_feature_ideas.html`
- `system-design-architecture.md`
- `project-folder-git-map.md`

### `public/`

- `loading-circle.lottie`
- `manifest.json`
- `offline.html`
- `robots.txt`
- `sitemap.xml`
- `sw-cleanup.js`
- `sw.js`

### `openclaw/`

- `agent.ts`
- `CHECKLIST.md`
- `FINAL_SETUP.md`
- `openclaw.config.json`
- `README.md`
- `SETUP_INSTRUCTIONS.md`
- `stateful-vtu.js`
- `test-deployment.ps1`
- `test-full-flow.js`
- `verify-deployment.ps1`
- `verify-openclaw-setup.ps1`
- `verify.ps1`

### `whatsapp-bot/`

- `free-bot.js`
- `package.json`
- `README.md`
- `start.bat`

---

## Git Branch & Remote Map

### Local branches
- `main`

### Remote branches
- `origin/main`
- `origin/HEAD` → `origin/main`

### Primary remote
- `origin`
  - fetch: `https://github.com/Trimwet/tada-vtu.git`
  - push: `https://github.com/Trimwet/tada-vtu.git`

### Commit history snapshot
- `903d603` — `Save local changes`
- `ffcddb3` — `fix: use processDeposit in verify endpoint to prevent double-credit and refresh balance in-place after payment`
- `2b7b50c` — `fix: wrap generateQR in arrow function to fix TS type error`
- `5832407` — `feat: add regenerate QR button with base64url encoding`
- `42fab63` — `fix: use base64url encoding to prevent / in QR URLs`
- `fbdcb1f` — `chore: trigger fresh vercel build`
- `23d1876` — `fix: route vault/qr through service worker network handler`
- `9bc14a3` — `add vault QR redemption page`
- `04d7ae1` — `feat: add transaction confirmation card after airtime/data purchase`

---

## Notes

- The repository currently has a single active branch: `main`.
- There are no additional local or remote feature branches present in this clone.
- The current repository structure is centered around Next.js plus Supabase integration.
