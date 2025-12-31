# 🎁 Gift Room System Blueprint

## Overview
This document provides a complete mind map of the Gift Room system, showing all files, code flows, and their relationships.

---

## 📁 FILE STRUCTURE

```
tada-vtu/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── send-gift/page.tsx      # CREATE GIFT UI
│   │   │   └── gift-rooms/page.tsx     # VIEW MY GIFTS UI
│   │   ├── gift/
│   │   │   └── [token]/page.tsx        # PUBLIC GIFT PAGE (JOIN/CLAIM)
│   │   └── api/gift-rooms/
│   │       ├── create/route.ts         # POST: Create gift room
│   │       ├── join/route.ts           # POST: Join gift room
│   │       ├── claim/route.ts          # POST: Claim gift
│   │       ├── [token]/route.ts        # GET: Get gift room details
│   │       ├── my-rooms/route.ts       # GET: User's gift rooms
│   │       ├── history/route.ts        # GET: Gift history
│   │       ├── refund/route.ts         # POST: Request refund
│   │       ├── stats/route.ts          # GET: Gift room stats
│   │       ├── health/route.ts         # GET: System health
│   │       └── cleanup/route.ts        # POST: Cleanup expired
│   ├── components/
│   │   ├── gift-room-card.tsx          # Gift room display card
│   │   ├── gift-room-stats.tsx         # Statistics display
│   │   ├── gift-room-wizard.tsx        # Creation wizard
│   │   ├── gift-room-share.tsx         # Share functionality
│   │   ├── gift-room-activity.tsx      # Activity log
│   │   └── gift-room-refund-manager.tsx # Refund UI
│   ├── hooks/
│   │   └── useGiftRoom.ts              # Gift room React hook
│   ├── lib/
│   │   ├── gift-room-service.ts        # Frontend API service
│   │   └── device-fingerprint.ts       # Device identification
│   └── types/
│       └── gift-room.ts                # TypeScript types
└── supabase/
    └── migrations/
        ├── create_gift_room_cleanup_function.sql
        ├── add_gift_room_security_functions.sql
        └── 20241231_fix_gift_room_capacity_issues.sql
```

---

## 🔄 FLOW CHARTS

### FLOW 1: CREATE GIFT ROOM (Sender)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND: send-gift/page.tsx                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. User selects gift type (personal/group/public)               │
│ 2. User sets capacity (1 for personal, 2-50 for group, etc)     │
│ 3. User enters amount per person (₦50 - ₦50,000)                │
│ 4. User adds optional message                                    │
│ 5. User clicks "Create Gift Room"                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                SERVICE: gift-room-service.ts                     │
├─────────────────────────────────────────────────────────────────┤
│ createGiftRoom(request) → POST /api/gift-rooms/create           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API: /api/gift-rooms/create/route.ts            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Check authentication (user must be logged in)                 │
│ 2. Validate input (type, capacity, amount, message)              │
│ 3. Check rate limit (max 10 rooms per hour)                      │
│ 4. Call RPC: create_gift_room()                                  │
│ 5. Return share URL                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              DATABASE: create_gift_room() RPC                    │
├─────────────────────────────────────────────────────────────────┤
│ 1. Calculate total_amount = capacity × amount                    │
│ 2. Check sender balance >= total_amount                          │
│ 3. Deduct total_amount from sender balance                       │
│ 4. Generate unique token                                         │
│ 5. Create gift_rooms record                                      │
│ 6. Log activity (created)                                        │
│ 7. Create transaction record                                     │
│ 8. Return room_id                                                │
└─────────────────────────────────────────────────────────────────┘
```

### FLOW 2: JOIN GIFT ROOM (Recipient)

```
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: gift/[token]/page.tsx                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Load gift room details via token                              │
│ 2. Show gift amount, sender name, message                        │
│ 3. Show spots remaining                                          │
│ 4. User clicks "Secure My Spot"                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                SERVICE: gift-room-service.ts                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Generate device fingerprint                                   │
│ 2. joinGiftRoom(token, contactInfo) → POST /api/gift-rooms/join │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API: /api/gift-rooms/join/route.ts              │
├─────────────────────────────────────────────────────────────────┤
│ 1. Get room by token                                             │
│ 2. Check room is active and not expired                          │
│ 3. Prevent sender from joining own room                          │
│ 4. Call RPC: create_reservation()                                │
│ 5. Link reservation to user if logged in                         │
│ 6. Log activity (joined)                                         │
│ 7. Return reservation details                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              DATABASE: create_reservation() RPC                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. Lock room row (FOR UPDATE) - prevent race conditions          │
│ 2. Check room is active                                          │
│ 3. Clean up expired reservations                                 │
│ 4. Check for existing reservation (idempotency)                  │
│ 5. Count actual active reservations                              │
│ 6. Check capacity (actual count < capacity)                      │
│ 7. Generate temp_token                                           │
│ 8. Create reservation record                                     │
│ 9. Update room joined_count                                      │
│ 10. Update room status if full                                   │
│ 11. Return reservation_id                                        │
└─────────────────────────────────────────────────────────────────┘
```

### FLOW 3: CLAIM GIFT (Recipient)

```
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: gift/[token]/page.tsx                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. User must be logged in                                        │
│ 2. User has active reservation                                   │
│ 3. User clicks "Claim ₦X"                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                SERVICE: gift-room-service.ts                     │
├─────────────────────────────────────────────────────────────────┤
│ claimGift(reservation_id) → POST /api/gift-rooms/claim          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API: /api/gift-rooms/claim/route.ts             │
├─────────────────────────────────────────────────────────────────┤
│ 1. Check authentication (REQUIRED)                               │
│ 2. Get reservation with room details                             │
│ 3. Validate reservation is active                                │
│ 4. Check reservation not expired                                 │
│ 5. Prevent self-claiming                                         │
│ 6. Check no duplicate claims                                     │
│ 7. Call RPC: claim_gift()                                        │
│ 8. Log activity (claimed)                                        │
│ 9. Return claim details                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE: claim_gift() RPC                      │
├─────────────────────────────────────────────────────────────────┤
│ 1. Lock reservation row                                          │
│ 2. Validate reservation is active                                │
│ 3. Update reservation status to 'claimed'                        │
│ 4. Credit amount to user balance                                 │
│ 5. Create gift_claims record                                     │
│ 6. Update room claimed_count                                     │
│ 7. Check if room is completed (all claimed)                      │
│ 8. Award referral bonus if new user                              │
│ 9. Create transaction record                                     │
│ 10. Return claim_id                                              │
└─────────────────────────────────────────────────────────────────┘
```

### FLOW 4: VIEW MY GIFT ROOMS (Sender Dashboard)

```
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: gift-rooms/page.tsx                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Load user's gift rooms                                        │
│ 2. Display stats (total, active, sent, claimed)                  │
│ 3. Filter by status                                              │
│ 4. Show room cards with share/view options                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  HOOK: useGiftRoom.ts                            │
├─────────────────────────────────────────────────────────────────┤
│ getUserGiftRooms() → GET /api/gift-rooms/my-rooms               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API: /api/gift-rooms/my-rooms/route.ts          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Check authentication                                          │
│ 2. Get rooms where sender_id = user.id (SENT)                    │
│ 3. Get rooms where user has reservations (JOINED)                │
│ 4. Combine and deduplicate                                       │
│ 5. Return paginated results                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 DATABASE TABLES

```
┌─────────────────────────────────────────────────────────────────┐
│                        gift_rooms                                │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                 │
│ sender_id       UUID → profiles(id)                              │
│ type            TEXT (personal/group/public)                     │
│ capacity        INTEGER                                          │
│ amount          DECIMAL(12,2) - per person                       │
│ total_amount    DECIMAL(12,2) - capacity × amount                │
│ message         TEXT (optional)                                  │
│ token           TEXT UNIQUE - share link token                   │
│ status          TEXT (active/full/expired/completed)             │
│ joined_count    INTEGER - current reservations                   │
│ claimed_count   INTEGER - claimed gifts                          │
│ created_at      TIMESTAMPTZ                                      │
│ expires_at      TIMESTAMPTZ                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        reservations                              │
├─────────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                             │
│ room_id             UUID → gift_rooms(id)                        │
│ device_fingerprint  TEXT - device identification                 │
│ temp_token          TEXT UNIQUE - temporary claim token          │
│ status              TEXT (active/claimed/expired)                │
│ contact_info        JSONB (optional email/phone/name)            │
│ user_id             UUID → profiles(id) (nullable)               │
│ created_at          TIMESTAMPTZ                                  │
│ expires_at          TIMESTAMPTZ                                  │
│ claimed_at          TIMESTAMPTZ (nullable)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:1
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        gift_claims                               │
├─────────────────────────────────────────────────────────────────┤
│ id                      UUID PRIMARY KEY                         │
│ reservation_id          UUID → reservations(id)                  │
│ user_id                 UUID → profiles(id)                      │
│ amount                  DECIMAL(12,2)                            │
│ transaction_id          UUID (optional)                          │
│ referral_bonus_awarded  BOOLEAN                                  │
│ claimed_at              TIMESTAMPTZ                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    gift_room_activities                          │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                                 │
│ room_id         UUID → gift_rooms(id)                            │
│ user_id         UUID → profiles(id) (nullable)                   │
│ activity_type   TEXT (created/joined/claimed/expired/refunded)   │
│ details         JSONB                                            │
│ ip_address      INET                                             │
│ user_agent      TEXT                                             │
│ created_at      TIMESTAMPTZ                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 DATABASE FUNCTIONS (RPC)

| Function | Purpose |
|----------|---------|
| `create_gift_room` | Creates room, deducts balance, generates token |
| `create_reservation` | Creates reservation with capacity check |
| `claim_gift` | Claims gift, credits balance, awards referral |
| `cleanup_expired_gift_rooms` | Expires old rooms, refunds unclaimed |
| `refund_gift_room` | Manual refund for room creator |
| `validate_gift_room_ownership` | Checks if user owns room |

---

## 🐛 KNOWN ISSUES & FIXES

### Issue 1: Orphaned Reservations
**Problem**: Reservations created without `user_id` when user not logged in
**Fix**: Link reservation to user when they log in and claim

### Issue 2: Capacity Mismatch
**Problem**: `joined_count` doesn't match actual active reservations
**Fix**: Use actual COUNT(*) instead of relying on `joined_count` field

### Issue 3: Race Conditions
**Problem**: Multiple users can pass capacity check simultaneously
**Fix**: Use `FOR UPDATE` row locking in `create_reservation`

### Issue 4: Expired Reservations Not Cleaned
**Problem**: Expired reservations still counted in capacity
**Fix**: Clean up expired reservations before capacity check

---

## ✅ SIMPLIFIED FLOW SUMMARY

```
SENDER FLOW:
1. Login → Dashboard → Send Gift
2. Select type, amount, capacity
3. Create → Deduct balance → Get share link
4. Share link with recipients

RECIPIENT FLOW:
1. Click share link → Gift page
2. Click "Secure My Spot" → Create reservation
3. Sign up/Login (if not already)
4. Click "Claim" → Credit balance

REFUND FLOW:
1. Room expires with unclaimed gifts
2. Auto-refund to sender OR manual refund request
3. Credit unclaimed amount back to sender
```

---

## 🎯 SIMPLIFICATION RECOMMENDATIONS

1. **Remove device fingerprint complexity** - Use simple session-based tracking
2. **Simplify reservation linking** - Always require login before joining
3. **Remove contact_info** - Not needed if login required
4. **Consolidate RPC functions** - Reduce from 12 to 4 core functions
5. **Remove real-time subscriptions** - Use simple polling or refresh
6. **Simplify status management** - Only: active, claimed, expired
