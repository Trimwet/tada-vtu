# Data Vault System - Phase 1

## Overview

The Data Vault system allows users to "park" data purchases when they have money, then deliver them instantly later with one tap - even when their balance is ₦0.

## Key Features

### 🏦 Park Data
- Pre-purchase data plans when you have funds
- Balance is deducted immediately 
- Data is stored securely in your vault
- 7-day expiry with automatic refund

### ⚡ Instant Delivery
- One-tap delivery from vault
- No need to re-enter details
- Works even with ₦0 balance
- Real-time notifications

### 🔒 Security
- PIN verification required for parking
- Automatic expiry and refunds
- Transaction history tracking
- Row-level security (RLS)

## User Flow

### Parking Data
1. Go to Buy Data page
2. Toggle to "Park Data" mode
3. Select network, plan, and phone number
4. Enter transaction PIN
5. Data is parked in vault (balance deducted)

### Delivering Data
1. View vault from dashboard widget
2. Click "Send Now" on any parked item
3. Data is delivered instantly via Inlomax
4. Item marked as delivered

## Technical Implementation

### Database Schema
```sql
-- data_vault table
- id: UUID (primary key)
- user_id: UUID (foreign key)
- network: TEXT (MTN, AIRTEL, etc.)
- plan_id: TEXT (Inlomax service ID)
- plan_name: TEXT (display name)
- amount: DECIMAL (price paid)
- recipient_phone: TEXT
- status: TEXT (ready, delivered, expired, refunded)
- expires_at: TIMESTAMPTZ (7 days from creation)
- transaction_id: UUID (links to transactions table)
```

### API Endpoints
- `POST /api/data-vault/park` - Park data purchase
- `POST /api/data-vault/deliver` - Deliver parked data
- `GET /api/data-vault/list` - List user's vault items
- `GET /api/cron/process-vault-expiry` - Process expired items

### Components
- `DataVaultWidget` - Dashboard widget showing ready items
- `useDataVault` - React hook for vault operations
- `/dashboard/data-vault` - Full vault management page

## Business Logic

### Expiry System
- Items expire after 7 days
- Automatic refund via cron job
- User notifications sent
- Original transaction marked as refunded

### Constraints
- One ready item per user+phone+plan combination
- Prevents duplicate parking
- Ensures clean user experience

### Integration
- Uses existing Inlomax API for delivery
- Integrates with transaction system
- Follows existing PIN verification flow

## Future Enhancements (Phase 2+)

### Queue System
- Multiple items per phone number
- Auto-advance delivery
- Scheduled delivery intervals

### Advanced Features
- Bulk parking operations
- Price protection
- Delivery scheduling
- Enhanced analytics

## Monitoring

### Key Metrics
- Park success rate
- Delivery success rate
- Expiry/refund rate
- Average time to delivery

### Alerts
- High expiry rates
- Delivery failures
- System errors

## Security Considerations

- PIN verification for all operations
- RLS policies on data_vault table
- Rate limiting on API endpoints
- Audit trail via transactions table
- Automatic cleanup of expired items