# TADA VTU - Complete System Design

## 🏗️ **System Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TADA VTU SYSTEM ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Web App   │    │   Mobile    │    │    Admin    │    │     API     │  │
│  │  (Next.js)  │    │    PWA      │    │   Portal    │    │  Clients    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                   │                   │                   │       │
│         └───────────────────┼───────────────────┼───────────────────┘       │
│                             │                   │                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      NEXT.JS APPLICATION LAYER                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │    Pages    │  │ Components  │  │    Hooks    │  │   Context   │   │  │
│  │  │   Routes    │  │     UI      │  │   Custom    │  │   Providers │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        API LAYER (Route Handlers)                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │     VTU     │  │   Payment   │  │ Gift Rooms  │  │    Admin    │   │  │
│  │  │  Services   │  │  Processing │  │   System    │  │  Analytics  │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         SERVICE LAYER                                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │  Supabase   │  │ External    │  │    Cache    │  │   Queue     │   │  │
│  │  │  Database   │  │    APIs     │  │   Redis     │  │  Background │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 **Core System Components**

### **1. Frontend Architecture (Next.js 15)**

#### **A. Application Structure**
```
src/
├── app/                          # App Router (Next.js 15)
│   ├── (auth)/                   # Auth group routes
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/                # Protected routes
│   │   ├── buy-airtime/
│   │   ├── buy-data/
│   │   ├── cable-tv/
│   │   ├── electricity/
│   │   ├── fund-wallet/
│   │   ├── gift-rooms/
│   │   ├── settings/
│   │   └── transactions/
│   ├── admin/                    # Admin panel
│   │   ├── analytics/
│   │   ├── users/
│   │   └── gift-rooms/
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   ├── inlomax/
│   │   ├── flutterwave/
│   │   ├── gift-rooms/
│   │   └── admin/
│   └── gift/[token]/             # Public gift pages
├── components/                   # Reusable components
│   ├── ui/                       # Base UI components
│   ├── forms/                    # Form components
│   └── features/                 # Feature-specific components
├── hooks/                        # Custom React hooks
├── lib/                          # Utilities and services
├── contexts/                     # React contexts
└── types/                        # TypeScript definitions
```

#### **B. State Management Architecture**
```typescript
// Context-based state management
┌─────────────────────────────────────────────────────────────┐
│                    STATE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    Auth     │    │   Wallet    │    │ Transactions│     │
│  │   Context   │    │   Context   │    │   Context   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                   │                   │          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Supabase    │    │   Local     │    │   Session   │     │
│  │   Client    │    │  Storage    │    │   Storage   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **2. Backend Architecture (API Layer)**

#### **A. API Route Structure**
```typescript
// Next.js API Routes (Route Handlers)
api/
├── auth/                         # Authentication
│   ├── login/route.ts
│   ├── register/route.ts
│   ├── forgot-pin/route.ts
│   └── reset-pin/route.ts
├── vtu/                          # VTU Services
│   ├── airtime/route.ts
│   ├── data/route.ts
│   ├── cable/route.ts
│   └── electricity/route.ts
├── wallet/                       # Wallet Management
│   ├── balance/route.ts
│   ├── fund/route.ts
│   └── withdraw/route.ts
├── gift-rooms/                   # Gift Room System
│   ├── create/route.ts
│   ├── join/route.ts
│   ├── claim/route.ts
│   └── [token]/route.ts
├── admin/                        # Admin Operations
│   ├── users/route.ts
│   ├── analytics/route.ts
│   └── transactions/route.ts
└── webhooks/                     # External webhooks
    ├── flutterwave/route.ts
    ├── inlomax/route.ts
    └── smeplug/route.ts
```

#### **B. Service Layer Architecture**
```typescript
// Service abstraction layer
lib/
├── api/                          # External API clients
│   ├── inlomax.ts               # VTU provider
│   ├── flutterwave.ts           # Payment processor
│   ├── smeplug.ts               # Alternative VTU
│   └── groq.ts                  # AI services
├── supabase/                    # Database layer
│   ├── client.ts                # Browser client
│   ├── server.ts                # Server client
│   └── middleware.ts            # Auth middleware
├── services/                    # Business logic
│   ├── vtu-service.ts
│   ├── wallet-service.ts
│   ├── gift-room-service.ts
│   └── notification-service.ts
└── utils/                       # Utilities
    ├── validation.ts
    ├── rate-limit.ts
    └── error-handler.ts
```

## 🗄️ **Database Architecture (Supabase PostgreSQL)**

### **A. Core Tables Schema**
```sql
-- User Management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    signup_method VARCHAR(20) DEFAULT 'manual', -- 'google' | 'manual'
    verification_level VARCHAR(20) DEFAULT 'basic', -- 'basic' | 'verified' | 'premium'
    trust_score INTEGER DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0.00,
    transaction_pin VARCHAR(255),
    referral_code VARCHAR(10) UNIQUE,
    referred_by UUID REFERENCES users(id),
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    kyc_status VARCHAR(20) DEFAULT 'pending',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transaction Management
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'airtime' | 'data' | 'cable' | 'electricity' | 'wallet_funding' | 'withdrawal'
    amount DECIMAL(12,2) NOT NULL,
    fee DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'success' | 'failed' | 'cancelled'
    reference VARCHAR(100) UNIQUE,
    provider VARCHAR(50), -- 'inlomax' | 'smeplug' | 'flutterwave'
    provider_reference VARCHAR(100),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- VTU Services
CREATE TABLE beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    network VARCHAR(20) NOT NULL, -- 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE'
    type VARCHAR(20) NOT NULL, -- 'airtime' | 'data'
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Gift Room System
CREATE TABLE gift_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) NOT NULL,
    token VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'first_come' | 'random_draw' | 'quiz'
    amount DECIMAL(12,2) NOT NULL,
    capacity INTEGER NOT NULL,
    joined_count INTEGER DEFAULT 0,
    message TEXT,
    status VARCHAR(20) DEFAULT 'active', -- 'active' | 'full' | 'expired' | 'completed'
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE gift_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_room_id UUID REFERENCES gift_rooms(id) NOT NULL,
    user_id UUID REFERENCES users(id),
    device_fingerprint VARCHAR(255),
    contact_info JSONB,
    status VARCHAR(20) DEFAULT 'reserved', -- 'reserved' | 'claimed' | 'expired'
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Loyalty & Rewards
CREATE TABLE loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    points INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'transaction' | 'referral' | 'bonus' | 'redemption'
    description TEXT,
    transaction_id UUID REFERENCES transactions(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin & Analytics
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'super_admin' | 'admin' | 'support'
    permissions JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL, -- 'info' | 'warning' | 'error' | 'critical'
    message TEXT NOT NULL,
    context JSONB,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **B. Database Functions & Triggers**
```sql
-- Atomic wallet operations
CREATE OR REPLACE FUNCTION atomic_wallet_update(
    p_user_id UUID,
    p_amount DECIMAL(12,2),
    p_description TEXT,
    p_reference VARCHAR(100),
    p_type VARCHAR(50),
    p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(new_balance DECIMAL(12,2), transaction_id UUID) AS $$
DECLARE
    v_current_balance DECIMAL(12,2);
    v_new_balance DECIMAL(12,2);
    v_transaction_id UUID;
BEGIN
    -- Lock user row for update
    SELECT balance INTO v_current_balance 
    FROM users 
    WHERE id = p_user_id 
    FOR UPDATE;
    
    -- Check sufficient balance for debits
    IF p_amount < 0 AND v_current_balance + p_amount < 0 THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- Update user balance
    UPDATE users 
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Create transaction record
    INSERT INTO transactions (user_id, amount, description, reference, type, metadata, status)
    VALUES (p_user_id, p_amount, p_description, p_reference, p_type, p_metadata, 'success')
    RETURNING id INTO v_transaction_id;
    
    RETURN QUERY SELECT v_new_balance, v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Gift room token generation
CREATE OR REPLACE FUNCTION generate_gift_room_token() RETURNS VARCHAR(20) AS $$
DECLARE
    v_token VARCHAR(20);
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_token := upper(substring(md5(random()::text) from 1 for 8));
        SELECT EXISTS(SELECT 1 FROM gift_rooms WHERE token = v_token) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;
    RETURN v_token;
END;
$$ LANGUAGE plpgsql;

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔌 **External Integrations**

### **A. Payment Processing (Flutterwave)**
```typescript
// Payment flow architecture
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT PROCESSING FLOW                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Initiates Payment                                     │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Frontend  │───▶│   Backend   │───▶│ Flutterwave │     │
│  │   Payment   │    │   API       │    │     API     │     │
│  │   Request   │    │   Handler   │    │             │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Loading   │    │  Database   │    │   Webhook   │     │
│  │    State    │    │   Update    │    │  Callback   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                   │                   │          │
│         └───────────────────┼───────────────────┘          │
│                             ▼                              │
│                    ┌─────────────┐                         │
│                    │   Success   │                         │
│                    │  Response   │                         │
│                    └─────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

// Implementation
class FlutterwaveService {
  async initializePayment(amount: number, email: string, reference: string) {
    return await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: amount,
        currency: 'NGN',
        redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/flutterwave/callback`,
        customer: { email },
        customizations: {
          title: 'TADA VTU Wallet Funding',
          logo: `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`
        }
      })
    });
  }

  async verifyPayment(transactionId: string) {
    return await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: {
        'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
      }
    });
  }
}
```

### **B. VTU Services (Inlomax & SME Plug)**
```typescript
// VTU provider abstraction
interface VTUProvider {
  buyAirtime(phone: string, amount: number, network: string): Promise<VTUResponse>;
  buyData(phone: string, planId: string, network: string): Promise<VTUResponse>;
  payCable(smartCardNumber: string, package: string, provider: string): Promise<VTUResponse>;
  payElectricity(meterNumber: string, amount: number, disco: string): Promise<VTUResponse>;
}

class VTUService {
  private providers: VTUProvider[] = [
    new InlomaxProvider(),
    new SMEPlugProvider()
  ];

  async executeTransaction(type: string, params: any): Promise<VTUResponse> {
    // Provider failover logic
    for (const provider of this.providers) {
      try {
        const result = await provider[type](params);
        if (result.success) return result;
      } catch (error) {
        console.error(`Provider ${provider.name} failed:`, error);
        continue; // Try next provider
      }
    }
    throw new Error('All VTU providers failed');
  }
}
```

### **C. AI Services (Groq)**
```typescript
// AI integration for smart features
class AIService {
  async generateGreeting(context: GreetingContext): Promise<string> {
    return await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [{
          role: 'user',
          content: `Generate a friendly Nigerian VTU greeting for ${context.userName} at ${context.timeOfDay}`
        }],
        max_tokens: 50,
        temperature: 0.8
      })
    });
  }

  async recommendDataPlan(usage: UserUsage): Promise<DataPlan[]> {
    // AI-powered data plan recommendations
    const prompt = `Based on user's monthly usage of ${usage.monthlyGB}GB, 
                   recommend optimal data plans. User prefers ${usage.network} network.`;
    
    // Process AI response and return structured recommendations
  }
}
```

## 🔐 **Security Architecture**

### **A. Authentication & Authorization**
```typescript
// Multi-layer security approach
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    Auth     │    │    RBAC     │    │    Rate     │     │
│  │ Middleware  │    │   System    │    │  Limiting   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                   │                   │          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Session   │    │    PIN      │    │   Device    │     │
│  │ Management  │    │Verification │    │Fingerprint  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                   │                   │          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Supabase  │    │   Database  │    │   API Key   │     │
│  │     RLS     │    │Encryption   │    │ Management  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

// Implementation
class SecurityService {
  // Rate limiting
  async checkRateLimit(userId: string, action: string): Promise<boolean> {
    const key = `rate_limit:${userId}:${action}`;
    const current = await redis.get(key);
    
    if (current && parseInt(current) >= RATE_LIMITS[action]) {
      throw new Error('Rate limit exceeded');
    }
    
    await redis.incr(key);
    await redis.expire(key, 3600); // 1 hour window
    return true;
  }

  // Transaction PIN verification
  async verifyTransactionPIN(userId: string, pin: string): Promise<boolean> {
    const user = await supabase
      .from('users')
      .select('transaction_pin')
      .eq('id', userId)
      .single();
    
    return await bcrypt.compare(pin, user.data.transaction_pin);
  }

  // Device fingerprinting
  generateDeviceFingerprint(request: Request): string {
    const userAgent = request.headers.get('user-agent');
    const acceptLanguage = request.headers.get('accept-language');
    const acceptEncoding = request.headers.get('accept-encoding');
    
    return crypto
      .createHash('sha256')
      .update(`${userAgent}:${acceptLanguage}:${acceptEncoding}`)
      .digest('hex');
  }
}
```

### **B. Data Protection**
```sql
-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_rooms ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Transactions are user-specific
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Gift rooms have complex access rules
CREATE POLICY "Users can view active gift rooms" ON gift_rooms
    FOR SELECT USING (status = 'active' OR creator_id = auth.uid());

-- Admin access policies
CREATE POLICY "Admins can view all data" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );
```

## 📊 **Analytics & Monitoring**

### **A. Business Intelligence**
```typescript
// Analytics data pipeline
┌─────────────────────────────────────────────────────────────┐
│                    ANALYTICS PIPELINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Raw Data  │───▶│ Processing  │───▶│ Aggregated  │     │
│  │ Collection  │    │   Layer     │    │    Data     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                   │                   │          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ User Events │    │   ETL Jobs  │    │ Dashboard   │     │
│  │Transaction  │    │ Scheduled   │    │  Reports    │     │
│  │   Logs      │    │ Functions   │    │             │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

// Key metrics tracking
interface AnalyticsMetrics {
  // User metrics
  totalUsers: number;
  activeUsers: number;
  newSignups: number;
  retentionRate: number;
  
  // Transaction metrics
  totalTransactions: number;
  transactionVolume: number;
  averageTransactionSize: number;
  successRate: number;
  
  // Revenue metrics
  totalRevenue: number;
  revenueByService: Record<string, number>;
  profitMargin: number;
  
  // Gift room metrics
  totalGiftRooms: number;
  participationRate: number;
  claimRate: number;
  viralCoefficient: number;
}

class AnalyticsService {
  async generateDashboard(timeRange: string): Promise<AnalyticsMetrics> {
    const [users, transactions, giftRooms] = await Promise.all([
      this.getUserMetrics(timeRange),
      this.getTransactionMetrics(timeRange),
      this.getGiftRoomMetrics(timeRange)
    ]);
    
    return {
      ...users,
      ...transactions,
      ...giftRooms
    };
  }
}
```

### **B. Performance Monitoring**
```typescript
// Performance tracking system
class PerformanceMonitor {
  async trackAPIPerformance(endpoint: string, duration: number, status: number) {
    await supabase.from('api_metrics').insert({
      endpoint,
      duration,
      status,
      timestamp: new Date().toISOString()
    });
    
    // Alert on slow responses
    if (duration > 5000) {
      await this.sendSlowResponseAlert(endpoint, duration);
    }
  }

  async trackUserJourney(userId: string, action: string, metadata: any) {
    await supabase.from('user_events').insert({
      user_id: userId,
      action,
      metadata,
      timestamp: new Date().toISOString()
    });
  }
}
```

## 🚀 **Deployment Architecture**

### **A. Vercel Deployment**
```yaml
# vercel.json configuration
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_key",
    "FLUTTERWAVE_SECRET_KEY": "@flutterwave_secret",
    "INLOMAX_API_KEY": "@inlomax_key",
    "GROQ_API_KEY": "@groq_key"
  },
  "regions": ["cle1"],
  "crons": [
    {
      "path": "/api/cron/cleanup-expired-gifts",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/generate-analytics",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### **B. Environment Configuration**
```typescript
// Environment management
const config = {
  development: {
    database: process.env.SUPABASE_URL_DEV,
    apiKeys: {
      flutterwave: process.env.FLUTTERWAVE_TEST_KEY,
      inlomax: process.env.INLOMAX_TEST_KEY
    },
    features: {
      giftRooms: true,
      aiGreetings: true,
      analytics: false
    }
  },
  production: {
    database: process.env.SUPABASE_URL_PROD,
    apiKeys: {
      flutterwave: process.env.FLUTTERWAVE_LIVE_KEY,
      inlomax: process.env.INLOMAX_LIVE_KEY
    },
    features: {
      giftRooms: true,
      aiGreetings: true,
      analytics: true
    }
  }
};
```

## 🔄 **Data Flow Diagrams**

### **A. VTU Transaction Flow**
```
User Request → Authentication → Validation → Provider API → Database Update → Response

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    User     │───▶│   Auth      │───▶│ Validation  │───▶│  Provider   │
│  Initiates  │    │ Middleware  │    │   Layer     │    │     API     │
│Transaction  │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Loading   │    │   Session   │    │    PIN      │    │  External   │
│    State    │    │   Check     │    │Verification │    │   Service   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                                                          │
       ▼                                                          ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Success   │◀───│  Database   │◀───│  Response   │◀───│   Webhook   │
│  Response   │    │   Update    │    │ Processing  │    │  Callback   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### **B. Gift Room System Flow**
```
Creation → Sharing → Joining → Claiming → Completion

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Creator   │───▶│    Room     │───▶│   Share     │───▶│ Participants│
│   Funds     │    │  Creation   │    │    Link     │    │    Join     │
│   Room      │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Wallet    │    │  Generate   │    │   Social    │    │ Reservation │
│   Debit     │    │   Token     │    │  Sharing    │    │   System    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                 │
                                                                 ▼
                                                        ┌─────────────┐
                                                        │   Claim     │
                                                        │  Process    │
                                                        └─────────────┘
```

## 🎯 **System Scalability**

### **A. Performance Optimization**
```typescript
// Caching strategy
const cacheConfig = {
  // Static data caching
  dataPlan: { ttl: 3600 }, // 1 hour
  networkProviders: { ttl: 86400 }, // 24 hours
  
  // Dynamic data caching
  userBalance: { ttl: 300 }, // 5 minutes
  recentTransactions: { ttl: 600 }, // 10 minutes
  
  // Real-time data (no caching)
  giftRoomStatus: { ttl: 0 },
  liveTransactions: { ttl: 0 }
};

// Database optimization
const dbOptimizations = {
  indexes: [
    'CREATE INDEX idx_transactions_user_id_created_at ON transactions(user_id, created_at DESC)',
    'CREATE INDEX idx_gift_rooms_status_expires_at ON gift_rooms(status, expires_at)',
    'CREATE INDEX idx_users_referral_code ON users(referral_code)',
    'CREATE INDEX idx_transactions_reference ON transactions(reference)'
  ],
  
  partitioning: {
    transactions: 'PARTITION BY RANGE (created_at)',
    system_logs: 'PARTITION BY RANGE (created_at)'
  }
};
```

### **B. Monitoring & Alerting**
```typescript
// System health monitoring
class HealthMonitor {
  async checkSystemHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkExternalAPIs(),
      this.checkCacheLayer(),
      this.checkQueueSystem()
    ]);
    
    return {
      overall: checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'degraded',
      components: {
        database: checks[0].status === 'fulfilled' ? 'up' : 'down',
        externalAPIs: checks[1].status === 'fulfilled' ? 'up' : 'down',
        cache: checks[2].status === 'fulfilled' ? 'up' : 'down',
        queue: checks[3].status === 'fulfilled' ? 'up' : 'down'
      },
      timestamp: new Date().toISOString()
    };
  }
}
```

## 📋 **API Documentation**

### **A. Core Endpoints**
```typescript
// Authentication endpoints
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-pin
POST /api/auth/reset-pin

// VTU service endpoints
POST /api/vtu/airtime
POST /api/vtu/data
POST /api/vtu/cable
POST /api/vtu/electricity
GET  /api/vtu/plans/{network}

// Wallet endpoints
GET  /api/wallet/balance
POST /api/wallet/fund
POST /api/wallet/withdraw
GET  /api/wallet/transactions

// Gift room endpoints
POST /api/gift-rooms/create
POST /api/gift-rooms/join
POST /api/gift-rooms/claim
GET  /api/gift-rooms/{token}
GET  /api/gift-rooms/my-rooms

// Admin endpoints
GET  /api/admin/analytics
GET  /api/admin/users
POST /api/admin/users/{id}/actions
GET  /api/admin/transactions
```

### **B. Response Formats**
```typescript
// Standard API response format
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId: string;
}

// Error response format
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  timestamp: string;
  requestId: string;
}
```

This comprehensive system design provides a complete architectural overview of your TADA VTU webapp, covering all major components, data flows, security measures, and scalability considerations. The design is modular, maintainable, and ready for future enhancements.