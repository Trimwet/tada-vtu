# TADA VTU - Technical Specifications

## 📋 **Technology Stack**

### **Frontend Technologies**
```yaml
Framework: Next.js 15.5.7
Runtime: React 19.2.0
Language: TypeScript 5
Styling: Tailwind CSS 4
UI Components: Radix UI + Custom Components
Icons: Phosphor Icons + Ionicons
Animations: tailwindcss-animate + Framer Motion
PWA: Next.js PWA + Service Workers
State Management: React Context + Custom Hooks
```

### **Backend Technologies**
```yaml
Runtime: Node.js (Vercel Edge Runtime)
API: Next.js Route Handlers
Database: Supabase (PostgreSQL 15)
Authentication: Supabase Auth
Real-time: Supabase Realtime
File Storage: Supabase Storage
Caching: Built-in Next.js caching
Validation: Zod
```

### **External Integrations**
```yaml
Payment Processing: Flutterwave
VTU Providers: Inlomax, SME Plug
AI Services: Groq (Mixtral-8x7b)
Analytics: Vercel Analytics
Monitoring: Vercel Logs
CDN: Vercel Edge Network
```

## 🏗️ **System Requirements**

### **Performance Requirements**
```yaml
Page Load Time: < 2 seconds (First Contentful Paint)
API Response Time: < 500ms (95th percentile)
Database Query Time: < 100ms (average)
Uptime: 99.9% availability
Concurrent Users: 10,000+ simultaneous
Transaction Throughput: 1,000 TPS
```

### **Security Requirements**
```yaml
Authentication: Multi-factor (Email + PIN)
Authorization: Role-based access control (RBAC)
Data Encryption: AES-256 at rest, TLS 1.3 in transit
Session Management: JWT with refresh tokens
Rate Limiting: 100 requests/minute per user
Input Validation: Server-side validation for all inputs
SQL Injection Protection: Parameterized queries + RLS
XSS Protection: Content Security Policy (CSP)
```

### **Scalability Requirements**
```yaml
Horizontal Scaling: Auto-scaling on Vercel
Database Scaling: Supabase connection pooling
CDN: Global edge caching
Load Balancing: Automatic (Vercel)
Database Connections: Connection pooling (max 100)
Memory Usage: < 512MB per function
Cold Start Time: < 1 second
```

## 📊 **Database Design**

### **Core Tables Structure**
```sql
-- Users table with comprehensive profile data
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    signup_method VARCHAR(20) DEFAULT 'manual',
    verification_level VARCHAR(20) DEFAULT 'basic',
    trust_score INTEGER DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0.00,
    transaction_pin VARCHAR(255),
    referral_code VARCHAR(10) UNIQUE,
    referred_by UUID REFERENCES users(id),
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    kyc_status VARCHAR(20) DEFAULT 'pending',
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions with comprehensive tracking
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    fee DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending',
    reference VARCHAR(100) UNIQUE,
    provider VARCHAR(50),
    provider_reference VARCHAR(100),
    description TEXT,
    recipient_phone VARCHAR(20),
    recipient_network VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Gift rooms with advanced features
CREATE TABLE gift_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) NOT NULL,
    token VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'first_come',
    amount DECIMAL(12,2) NOT NULL,
    capacity INTEGER NOT NULL,
    joined_count INTEGER DEFAULT 0,
    claimed_count INTEGER DEFAULT 0,
    message TEXT,
    status VARCHAR(20) DEFAULT 'active',
    visibility VARCHAR(20) DEFAULT 'public',
    requires_auth BOOLEAN DEFAULT false,
    device_limit INTEGER DEFAULT 1,
    geographic_restriction JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Indexing Strategy**
```sql
-- Performance optimization indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_referral_code ON users(referral_code);
CREATE INDEX CONCURRENTLY idx_users_signup_method ON users(signup_method);

CREATE INDEX CONCURRENTLY idx_transactions_user_id_created_at 
    ON transactions(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_transactions_status_created_at 
    ON transactions(status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_transactions_reference 
    ON transactions(reference);
CREATE INDEX CONCURRENTLY idx_transactions_provider_reference 
    ON transactions(provider_reference);

CREATE INDEX CONCURRENTLY idx_gift_rooms_token ON gift_rooms(token);
CREATE INDEX CONCURRENTLY idx_gift_rooms_status_expires_at 
    ON gift_rooms(status, expires_at);
CREATE INDEX CONCURRENTLY idx_gift_rooms_creator_id 
    ON gift_rooms(creator_id);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_transactions_user_type_status 
    ON transactions(user_id, type, status);
CREATE INDEX CONCURRENTLY idx_gift_rooms_status_visibility 
    ON gift_rooms(status, visibility);
```

### **Database Functions**
```sql
-- Atomic wallet operations with comprehensive error handling
CREATE OR REPLACE FUNCTION atomic_wallet_update(
    p_user_id UUID,
    p_amount DECIMAL(12,2),
    p_description TEXT,
    p_reference VARCHAR(100),
    p_type VARCHAR(50),
    p_metadata JSONB DEFAULT '{}',
    p_provider VARCHAR(50) DEFAULT NULL
) RETURNS TABLE(
    new_balance DECIMAL(12,2), 
    transaction_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_current_balance DECIMAL(12,2);
    v_new_balance DECIMAL(12,2);
    v_transaction_id UUID;
    v_min_balance DECIMAL(12,2) := 0.00;
BEGIN
    -- Lock user row for update
    SELECT balance INTO v_current_balance 
    FROM users 
    WHERE id = p_user_id AND is_active = true
    FOR UPDATE;
    
    -- Check if user exists
    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT 0.00::DECIMAL(12,2), NULL::UUID, false, 'User not found or inactive';
        RETURN;
    END IF;
    
    -- Check sufficient balance for debits
    IF p_amount < 0 AND v_current_balance + p_amount < v_min_balance THEN
        RETURN QUERY SELECT v_current_balance, NULL::UUID, false, 'Insufficient balance';
        RETURN;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- Update user balance and total spent
    UPDATE users 
    SET 
        balance = v_new_balance,
        total_spent = CASE 
            WHEN p_amount < 0 THEN total_spent + ABS(p_amount)
            ELSE total_spent
        END,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_id, amount, description, reference, type, 
        metadata, provider, status
    )
    VALUES (
        p_user_id, p_amount, p_description, p_reference, p_type,
        p_metadata, p_provider, 'success'
    )
    RETURNING id INTO v_transaction_id;
    
    RETURN QUERY SELECT v_new_balance, v_transaction_id, true, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT v_current_balance, NULL::UUID, false, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Gift room management functions
CREATE OR REPLACE FUNCTION create_gift_room(
    p_creator_id UUID,
    p_amount DECIMAL(12,2),
    p_capacity INTEGER,
    p_message TEXT DEFAULT NULL,
    p_expires_in_hours INTEGER DEFAULT 24
) RETURNS TABLE(
    room_id UUID,
    token VARCHAR(20),
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_room_id UUID;
    v_token VARCHAR(20);
    v_expires_at TIMESTAMP;
    v_creator_balance DECIMAL(12,2);
BEGIN
    -- Check creator balance
    SELECT balance INTO v_creator_balance
    FROM users
    WHERE id = p_creator_id AND is_active = true;
    
    IF v_creator_balance IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR(20), false, 'Creator not found or inactive';
        RETURN;
    END IF;
    
    IF v_creator_balance < p_amount THEN
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR(20), false, 'Insufficient balance';
        RETURN;
    END IF;
    
    -- Generate unique token
    v_token := generate_gift_room_token();
    v_expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;
    
    -- Create gift room
    INSERT INTO gift_rooms (
        creator_id, token, amount, capacity, message, expires_at
    )
    VALUES (
        p_creator_id, v_token, p_amount, p_capacity, p_message, v_expires_at
    )
    RETURNING id INTO v_room_id;
    
    -- Debit creator's wallet
    PERFORM atomic_wallet_update(
        p_creator_id,
        -p_amount,
        'Gift room creation: ' || v_token,
        'GIFT_CREATE_' || v_room_id,
        'gift_room_creation'
    );
    
    RETURN QUERY SELECT v_room_id, v_token, true, NULL::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR(20), false, SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

## 🔐 **Security Implementation**

### **Authentication Flow**
```typescript
// Multi-layer authentication system
class AuthenticationService {
  async authenticateUser(email: string, password: string): Promise<AuthResult> {
    // 1. Rate limiting check
    await this.checkRateLimit(email);
    
    // 2. Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      await this.logFailedAttempt(email);
      throw new AuthError('Invalid credentials');
    }
    
    // 3. Additional security checks
    const user = await this.getUserProfile(data.user.id);
    await this.validateUserStatus(user);
    await this.updateLastLogin(user.id);
    
    return {
      user: data.user,
      session: data.session,
      profile: user
    };
  }

  async validateTransactionPIN(userId: string, pin: string): Promise<boolean> {
    const user = await supabase
      .from('users')
      .select('transaction_pin')
      .eq('id', userId)
      .single();
    
    if (!user.data?.transaction_pin) {
      throw new Error('Transaction PIN not set');
    }
    
    const isValid = await bcrypt.compare(pin, user.data.transaction_pin);
    
    if (!isValid) {
      await this.logFailedPINAttempt(userId);
    }
    
    return isValid;
  }
}
```

### **Authorization System**
```typescript
// Role-based access control
enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  SUPPORT = 'support'
}

enum Permission {
  READ_OWN_DATA = 'read_own_data',
  WRITE_OWN_DATA = 'write_own_data',
  READ_ALL_USERS = 'read_all_users',
  WRITE_ALL_USERS = 'write_all_users',
  MANAGE_TRANSACTIONS = 'manage_transactions',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_GIFT_ROOMS = 'manage_gift_rooms'
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.READ_OWN_DATA,
    Permission.WRITE_OWN_DATA
  ],
  [UserRole.SUPPORT]: [
    Permission.READ_OWN_DATA,
    Permission.WRITE_OWN_DATA,
    Permission.READ_ALL_USERS,
    Permission.VIEW_ANALYTICS
  ],
  [UserRole.ADMIN]: [
    Permission.READ_OWN_DATA,
    Permission.WRITE_OWN_DATA,
    Permission.READ_ALL_USERS,
    Permission.WRITE_ALL_USERS,
    Permission.MANAGE_TRANSACTIONS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_GIFT_ROOMS
  ],
  [UserRole.SUPER_ADMIN]: Object.values(Permission)
};

class AuthorizationService {
  async checkPermission(userId: string, permission: Permission): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    const permissions = ROLE_PERMISSIONS[userRole];
    return permissions.includes(permission);
  }
}
```

## 🚀 **API Design**

### **RESTful API Standards**
```typescript
// Standardized API response format
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// Error handling middleware
export async function errorHandler(
  error: Error,
  request: NextRequest
): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  
  // Log error for monitoring
  console.error(`[${requestId}] API Error:`, {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  });
  
  // Determine error type and response
  if (error instanceof ValidationError) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0'
      }
    }, { status: 400 });
  }
  
  if (error instanceof AuthenticationError) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '1.0.0'
      }
    }, { status: 401 });
  }
  
  // Generic server error
  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      version: '1.0.0'
    }
  }, { status: 500 });
}
```

### **Input Validation**
```typescript
// Zod schemas for request validation
const CreateTransactionSchema = z.object({
  type: z.enum(['airtime', 'data', 'cable', 'electricity']),
  amount: z.number().min(50).max(100000),
  recipient: z.string().regex(/^(\+234|0)[789][01]\d{8}$/),
  network: z.enum(['MTN', 'AIRTEL', 'GLO', '9MOBILE']),
  pin: z.string().length(4).regex(/^\d{4}$/),
  metadata: z.object({}).optional()
});

const CreateGiftRoomSchema = z.object({
  amount: z.number().min(100).max(50000),
  capacity: z.number().min(2).max(100),
  message: z.string().max(500).optional(),
  expiresInHours: z.number().min(1).max(168).default(24),
  type: z.enum(['first_come', 'random_draw']).default('first_come')
});

// Validation middleware
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<T> => {
    try {
      const body = await request.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid request data', error.errors);
      }
      throw error;
    }
  };
}
```

## 📱 **Frontend Architecture**

### **Component Structure**
```typescript
// Component hierarchy and patterns
src/components/
├── ui/                           # Base UI components
│   ├── button.tsx               # Reusable button with variants
│   ├── input.tsx                # Form input components
│   ├── card.tsx                 # Card layouts
│   └── modal.tsx                # Modal dialogs
├── forms/                       # Form components
│   ├── transaction-form.tsx     # VTU transaction forms
│   ├── gift-room-form.tsx       # Gift room creation
│   └── profile-form.tsx         # User profile management
├── features/                    # Feature-specific components
│   ├── wallet/                  # Wallet management
│   ├── transactions/            # Transaction history
│   ├── gift-rooms/              # Gift room system
│   └── admin/                   # Admin panel components
└── layout/                      # Layout components
    ├── header.tsx               # App header
    ├── sidebar.tsx              # Navigation sidebar
    └── footer.tsx               # App footer

// Component design patterns
interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

// Custom hooks for business logic
export function useTransaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const executeTransaction = useCallback(async (data: TransactionData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/vtu/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error.message);
      }
      
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { executeTransaction, loading, error };
}
```

### **State Management**
```typescript
// Context-based state management
interface AppState {
  user: User | null;
  wallet: WalletState;
  transactions: Transaction[];
  giftRooms: GiftRoom[];
  notifications: Notification[];
}

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<AppAction>;
} | null>(null);

// Reducer for state updates
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'UPDATE_WALLET_BALANCE':
      return {
        ...state,
        wallet: { ...state.wallet, balance: action.payload }
      };
    
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions]
      };
    
    case 'UPDATE_TRANSACTION_STATUS':
      return {
        ...state,
        transactions: state.transactions.map(txn =>
          txn.id === action.payload.id
            ? { ...txn, status: action.payload.status }
            : txn
        )
      };
    
    default:
      return state;
  }
}

// Provider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
```

## 🔄 **Real-time Features**

### **Supabase Realtime Integration**
```typescript
// Real-time transaction updates
export function useRealtimeTransactions(userId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    const supabase = getSupabase();
    
    // Subscribe to transaction updates
    const subscription = supabase
      .channel('transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Transaction update:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              setTransactions(prev => [payload.new as Transaction, ...prev]);
              break;
            
            case 'UPDATE':
              setTransactions(prev =>
                prev.map(txn =>
                  txn.id === payload.new.id ? payload.new as Transaction : txn
                )
              );
              break;
          }
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);
  
  return transactions;
}

// Real-time gift room updates
export function useRealtimeGiftRoom(token: string) {
  const [giftRoom, setGiftRoom] = useState<GiftRoom | null>(null);
  
  useEffect(() => {
    const supabase = getSupabase();
    
    const subscription = supabase
      .channel(`gift_room:${token}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gift_rooms',
          filter: `token=eq.${token}`
        },
        (payload) => {
          setGiftRoom(payload.new as GiftRoom);
        }
      )
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [token]);
  
  return giftRoom;
}
```

## 📊 **Performance Optimization**

### **Caching Strategy**
```typescript
// Multi-layer caching implementation
class CacheService {
  private static instance: CacheService;
  private memoryCache = new Map<string, { data: any; expires: number }>();
  
  // Memory cache for frequently accessed data
  async get<T>(key: string): Promise<T | null> {
    const cached = this.memoryCache.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    this.memoryCache.delete(key);
    return null;
  }
  
  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    this.memoryCache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }
  
  // Database query caching
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached) {
      return cached;
    }
    
    const result = await queryFn();
    await this.set(key, result, ttlSeconds);
    
    return result;
  }
}

// Usage in API routes
export async function GET(request: NextRequest) {
  const cache = CacheService.getInstance();
  
  const dataPlan = await cache.cachedQuery(
    'data_plans:mtn',
    async () => {
      const { data } = await supabase
        .from('data_plans')
        .select('*')
        .eq('network', 'MTN')
        .eq('active', true);
      
      return data;
    },
    3600 // Cache for 1 hour
  );
  
  return NextResponse.json({ success: true, data: dataPlan });
}
```

### **Database Optimization**
```sql
-- Query optimization techniques
-- 1. Efficient pagination
SELECT * FROM transactions 
WHERE user_id = $1 
  AND created_at < $2 
ORDER BY created_at DESC 
LIMIT 20;

-- 2. Aggregated queries with proper indexing
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount
FROM transactions 
WHERE user_id = $1 
  AND created_at >= NOW() - INTERVAL '30 days'
  AND status = 'success'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- 3. Efficient gift room queries
SELECT 
  gr.*,
  u.full_name as creator_name,
  COUNT(grr.id) as reservation_count
FROM gift_rooms gr
JOIN users u ON gr.creator_id = u.id
LEFT JOIN gift_reservations grr ON gr.id = grr.gift_room_id
WHERE gr.status = 'active' 
  AND gr.expires_at > NOW()
GROUP BY gr.id, u.full_name
ORDER BY gr.created_at DESC;
```

This comprehensive technical specification provides detailed implementation guidelines for all aspects of your TADA VTU system, from database design to frontend architecture and performance optimization.