# TADA VTU - Visual Architecture Diagrams

## 🏗️ **High-Level System Architecture**

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>Next.js 15]
        PWA[Mobile PWA]
        ADMIN[Admin Portal]
    end
    
    subgraph "Application Layer"
        NEXTJS[Next.js Application]
        API[API Routes]
        MIDDLEWARE[Auth Middleware]
    end
    
    subgraph "Service Layer"
        VTU[VTU Services]
        WALLET[Wallet Service]
        GIFT[Gift Room Service]
        NOTIFY[Notification Service]
    end
    
    subgraph "Data Layer"
        SUPABASE[(Supabase<br/>PostgreSQL)]
        REDIS[(Redis Cache)]
    end
    
    subgraph "External Services"
        FLUTTER[Flutterwave<br/>Payments]
        INLOMAX[Inlomax<br/>VTU Provider]
        SMEPLUG[SME Plug<br/>VTU Provider]
        GROQ[Groq AI<br/>Smart Features]
    end
    
    WEB --> NEXTJS
    PWA --> NEXTJS
    ADMIN --> NEXTJS
    
    NEXTJS --> API
    API --> MIDDLEWARE
    MIDDLEWARE --> VTU
    MIDDLEWARE --> WALLET
    MIDDLEWARE --> GIFT
    MIDDLEWARE --> NOTIFY
    
    VTU --> SUPABASE
    WALLET --> SUPABASE
    GIFT --> SUPABASE
    NOTIFY --> SUPABASE
    
    VTU --> REDIS
    WALLET --> REDIS
    
    WALLET --> FLUTTER
    VTU --> INLOMAX
    VTU --> SMEPLUG
    NOTIFY --> GROQ
    
    style WEB fill:#e1f5fe
    style PWA fill:#e1f5fe
    style ADMIN fill:#e1f5fe
    style SUPABASE fill:#f3e5f5
    style FLUTTER fill:#fff3e0
    style INLOMAX fill:#fff3e0
    style SMEPLUG fill:#fff3e0
    style GROQ fill:#fff3e0
```

## 🔄 **Data Flow Architecture**

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Layer
    participant S as Service Layer
    participant D as Database
    participant E as External API
    
    U->>F: Initiate Transaction
    F->>A: POST /api/vtu/airtime
    A->>A: Authenticate User
    A->>A: Validate Request
    A->>S: Process Transaction
    S->>D: Check Balance
    D-->>S: Balance Response
    S->>D: Create Pending Transaction
    S->>E: Call VTU Provider
    E-->>S: Provider Response
    S->>D: Update Transaction Status
    S->>D: Update User Balance
    D-->>S: Success Confirmation
    S-->>A: Transaction Result
    A-->>F: API Response
    F-->>U: Success/Error Message
```

## 🗄️ **Database Schema Relationships**

```mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : has
    USERS ||--o{ BENEFICIARIES : creates
    USERS ||--o{ GIFT_ROOMS : creates
    USERS ||--o{ GIFT_RESERVATIONS : makes
    USERS ||--o{ LOYALTY_POINTS : earns
    USERS ||--o{ ADMIN_USERS : can_be
    
    GIFT_ROOMS ||--o{ GIFT_RESERVATIONS : contains
    TRANSACTIONS ||--o{ LOYALTY_POINTS : generates
    
    USERS {
        uuid id PK
        string email UK
        string full_name
        string phone
        string signup_method
        decimal balance
        string referral_code UK
        uuid referred_by FK
        timestamp created_at
    }
    
    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        string type
        decimal amount
        string status
        string reference UK
        string provider
        jsonb metadata
        timestamp created_at
    }
    
    GIFT_ROOMS {
        uuid id PK
        uuid creator_id FK
        string token UK
        string type
        decimal amount
        integer capacity
        string status
        timestamp expires_at
    }
    
    GIFT_RESERVATIONS {
        uuid id PK
        uuid gift_room_id FK
        uuid user_id FK
        string device_fingerprint
        string status
        timestamp created_at
    }
```

## 🔐 **Security Architecture**

```mermaid
graph LR
    subgraph "Security Layers"
        AUTH[Authentication<br/>Supabase Auth]
        RBAC[Role-Based<br/>Access Control]
        RLS[Row Level<br/>Security]
        RATE[Rate<br/>Limiting]
        PIN[Transaction<br/>PIN]
        DEVICE[Device<br/>Fingerprinting]
    end
    
    subgraph "Request Flow"
        REQ[Incoming Request]
        MIDDLEWARE[Security Middleware]
        API[API Handler]
        DB[(Database)]
    end
    
    REQ --> MIDDLEWARE
    MIDDLEWARE --> AUTH
    MIDDLEWARE --> RBAC
    MIDDLEWARE --> RATE
    MIDDLEWARE --> PIN
    MIDDLEWARE --> DEVICE
    MIDDLEWARE --> API
    API --> RLS
    RLS --> DB
    
    style AUTH fill:#ffebee
    style RBAC fill:#ffebee
    style RLS fill:#ffebee
    style RATE fill:#fff3e0
    style PIN fill:#e8f5e8
    style DEVICE fill:#e8f5e8
```

## 💳 **Payment Processing Flow**

```mermaid
graph TD
    START[User Initiates Payment] --> VALIDATE[Validate Amount & User]
    VALIDATE --> CREATE_TXN[Create Pending Transaction]
    CREATE_TXN --> FLUTTER_INIT[Initialize Flutterwave Payment]
    FLUTTER_INIT --> REDIRECT[Redirect to Payment Gateway]
    REDIRECT --> USER_PAYS[User Completes Payment]
    USER_PAYS --> WEBHOOK[Flutterwave Webhook]
    WEBHOOK --> VERIFY[Verify Payment Status]
    VERIFY --> SUCCESS{Payment Successful?}
    
    SUCCESS -->|Yes| UPDATE_WALLET[Update User Wallet]
    SUCCESS -->|No| MARK_FAILED[Mark Transaction Failed]
    
    UPDATE_WALLET --> MARK_SUCCESS[Mark Transaction Success]
    MARK_SUCCESS --> NOTIFY_USER[Notify User]
    MARK_FAILED --> NOTIFY_FAILURE[Notify User of Failure]
    
    NOTIFY_USER --> END[Process Complete]
    NOTIFY_FAILURE --> END
    
    style START fill:#e8f5e8
    style END fill:#e8f5e8
    style SUCCESS fill:#fff3e0
    style UPDATE_WALLET fill:#e1f5fe
    style MARK_FAILED fill:#ffebee
```

## 🎁 **Gift Room System Flow**

```mermaid
stateDiagram-v2
    [*] --> Creating
    Creating --> Active : Room Created
    Active --> Joining : Users Join
    Joining --> Active : More Spots Available
    Joining --> Full : All Spots Taken
    Active --> Expired : Time Limit Reached
    Full --> Claiming : Users Claim Gifts
    Claiming --> Completed : All Gifts Claimed
    Claiming --> Expired : Time Limit Reached
    Expired --> [*]
    Completed --> [*]
    
    note right of Creating
        Creator funds room
        Token generated
        Expiry time set
    end note
    
    note right of Joining
        Device fingerprinting
        Contact info collection
        Reservation creation
    end note
    
    note right of Claiming
        User authentication
        Gift distribution
        Referral bonuses
    end note
```

## 📊 **Analytics Data Pipeline**

```mermaid
graph LR
    subgraph "Data Sources"
        USER_EVENTS[User Events]
        TRANSACTIONS[Transactions]
        API_LOGS[API Logs]
        SYSTEM_LOGS[System Logs]
    end
    
    subgraph "Processing"
        ETL[ETL Jobs]
        AGGREGATION[Data Aggregation]
        ENRICHMENT[Data Enrichment]
    end
    
    subgraph "Storage"
        RAW_DATA[(Raw Data)]
        PROCESSED_DATA[(Processed Data)]
        METRICS[(Metrics Store)]
    end
    
    subgraph "Visualization"
        DASHBOARD[Admin Dashboard]
        REPORTS[Automated Reports]
        ALERTS[Real-time Alerts]
    end
    
    USER_EVENTS --> ETL
    TRANSACTIONS --> ETL
    API_LOGS --> ETL
    SYSTEM_LOGS --> ETL
    
    ETL --> RAW_DATA
    RAW_DATA --> AGGREGATION
    AGGREGATION --> ENRICHMENT
    ENRICHMENT --> PROCESSED_DATA
    PROCESSED_DATA --> METRICS
    
    METRICS --> DASHBOARD
    METRICS --> REPORTS
    METRICS --> ALERTS
    
    style USER_EVENTS fill:#e8f5e8
    style TRANSACTIONS fill:#e8f5e8
    style DASHBOARD fill:#e1f5fe
    style REPORTS fill:#e1f5fe
    style ALERTS fill:#ffebee
```

## 🚀 **Deployment Architecture**

```mermaid
graph TB
    subgraph "Development"
        DEV_CODE[Source Code<br/>GitHub]
        DEV_ENV[Development<br/>Environment]
    end
    
    subgraph "CI/CD Pipeline"
        BUILD[Build Process]
        TEST[Automated Tests]
        DEPLOY[Deployment]
    end
    
    subgraph "Production"
        VERCEL[Vercel<br/>Hosting]
        SUPABASE_PROD[Supabase<br/>Production]
        CDN[Global CDN]
    end
    
    subgraph "Monitoring"
        ANALYTICS[Vercel Analytics]
        LOGS[Application Logs]
        ALERTS[Error Tracking]
    end
    
    DEV_CODE --> BUILD
    BUILD --> TEST
    TEST --> DEPLOY
    DEPLOY --> VERCEL
    
    VERCEL --> SUPABASE_PROD
    VERCEL --> CDN
    
    VERCEL --> ANALYTICS
    VERCEL --> LOGS
    LOGS --> ALERTS
    
    DEV_ENV --> DEV_CODE
    
    style DEV_CODE fill:#e8f5e8
    style VERCEL fill:#e1f5fe
    style SUPABASE_PROD fill:#f3e5f5
    style ALERTS fill:#ffebee
```

## 🔄 **API Request Lifecycle**

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware
    participant A as API Handler
    participant S as Service Layer
    participant D as Database
    participant E as External API
    participant R as Response
    
    C->>M: HTTP Request
    M->>M: Rate Limiting Check
    M->>M: Authentication
    M->>M: Authorization
    M->>A: Validated Request
    A->>A: Input Validation
    A->>S: Business Logic
    S->>D: Database Query
    D-->>S: Data Response
    S->>E: External API Call
    E-->>S: External Response
    S->>D: Update Database
    S-->>A: Service Response
    A->>R: Format Response
    R-->>C: HTTP Response
    
    Note over M: Security Layer
    Note over A: Validation Layer
    Note over S: Business Logic Layer
    Note over D,E: Data Layer
```

## 📱 **Mobile PWA Architecture**

```mermaid
graph TB
    subgraph "PWA Features"
        OFFLINE[Offline Support]
        PUSH[Push Notifications]
        INSTALL[App Installation]
        CACHE[Service Worker Cache]
    end
    
    subgraph "Core App"
        REACT[React Components]
        HOOKS[Custom Hooks]
        CONTEXT[State Management]
        ROUTER[App Router]
    end
    
    subgraph "Device APIs"
        CAMERA[Camera Access]
        LOCATION[Geolocation]
        STORAGE[Local Storage]
        NETWORK[Network Status]
    end
    
    OFFLINE --> CACHE
    PUSH --> HOOKS
    INSTALL --> REACT
    CACHE --> STORAGE
    
    REACT --> HOOKS
    HOOKS --> CONTEXT
    CONTEXT --> ROUTER
    
    HOOKS --> CAMERA
    HOOKS --> LOCATION
    HOOKS --> NETWORK
    
    style OFFLINE fill:#e8f5e8
    style PUSH fill:#fff3e0
    style INSTALL fill:#e1f5fe
    style CACHE fill:#f3e5f5
```

This visual architecture documentation provides comprehensive diagrams showing how all components of your TADA VTU system interact, from high-level architecture down to specific data flows and security measures.