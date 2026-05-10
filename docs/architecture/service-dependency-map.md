# Maysar Express — Service Dependency Map

> Shows runtime dependencies, event subscriptions, and data flow between all 22 service modules.

---

## 1. Full Service Dependency Graph

```mermaid
graph TB
    subgraph Gateway["API Gateway Layer"]
        GW["API Gateway :3000\n(Express + Auth Middleware)"]
    end

    subgraph CoreCommerce["Core Commerce Services"]
        AUTH["Auth Service :3001\nJWT · Sessions · 2FA · RBAC"]
        CATALOG["Catalog Service :3005\nProducts · Buy-box · Search · Pricing"]
        CHECKOUT["Checkout Service :3009\nCart · Sessions · Discounts"]
        ORDER["Order Service :3002\nOrder Lifecycle · Saga Orchestration"]
        INVENTORY["Inventory Service :3003\nStock · Reservations · Warehouses"]
    end

    subgraph Financial["Financial Services"]
        PAYMENT["Payment Service :3004\nPesapal · Fraud · Refunds"]
        WALLET["Wallet Service\nBalances · COD Holds · Ledger"]
        PAYOUT["Payout Service\nDisbursements · Reconciliation"]
        COMMISSION["Commission Service :3008\nRates · Attribution · Settlement"]
    end

    subgraph Operations["Operations Services"]
        LOGISTICS["Logistics Service :3007\nDeliveries · Couriers · COD · Routes"]
        MAPS["Maps Service\nGeolocation · ETA · Routing"]
        NOTIFICATION["Notification Service :3010\nEmail · SMS · Push · Firebase"]
        ANALYTICS["Analytics Service :3011\nMetrics · Dashboards · Reports"]
    end

    subgraph TrustCompliance["Trust & Compliance"]
        BUSINESS["Business Registry :3006\nKYC · Verification · Documents"]
        COMPLIANCE["Compliance Service :3013\nAML · TCRA · TRA · GDPR"]
        KYC["KYC Service\nDocument Verification"]
        USER["User Service :3014\nProfiles · Addresses · Preferences"]
    end

    subgraph Network["Network Services"]
        ENABLER["Enabler Service\nProfiles · Attribution · Listings"]
        TRAINING["Training Service\nModules · Assessments · Certs"]
        COMMUNITY["Community Service\nPosts · Reviews · Social"]
        SUPPORT["Support Service\nTickets · SLA · Escalation"]
        PRODUCTION["Production Service\nBulk Orders · Capacity · Quotes"]
    end

    %% Gateway routes
    GW --> AUTH & CATALOG & CHECKOUT & ORDER & BUSINESS & ANALYTICS & USER & ENABLER & LOGISTICS & PAYMENT & WALLET & SUPPORT

    %% Core order flow dependencies
    CHECKOUT -->|"reserve stock"| INVENTORY
    CHECKOUT -->|"create order"| ORDER
    ORDER -->|"process payment"| PAYMENT
    ORDER -->|"create shipment"| LOGISTICS
    ORDER -->|"calculate commission"| COMMISSION
    CATALOG -->|"check availability"| INVENTORY

    %% Financial dependencies
    PAYMENT -->|"debit/credit balance"| WALLET
    PAYMENT -->|"COD commitment"| WALLET
    COMMISSION -->|"credit earnings"| WALLET
    WALLET -->|"disburse funds"| PAYOUT

    %% Operations dependencies
    LOGISTICS -->|"route optimization"| MAPS
    LOGISTICS -->|"COD verification"| PAYMENT
    LOGISTICS -->|"release escrow"| WALLET

    %% Trust dependencies
    BUSINESS -->|"compliance check"| COMPLIANCE
    BUSINESS -->|"KYC verification"| KYC
    USER -->|"identity sync"| AUTH

    %% Network dependencies
    ENABLER -->|"training status"| TRAINING
    ENABLER -->|"commission attribution"| COMMISSION
    ENABLER -->|"product listings"| CATALOG

    %% Cross-cutting notifications
    ORDER & PAYMENT & LOGISTICS --> NOTIFICATION
    ORDER & PAYMENT & LOGISTICS & CATALOG --> ANALYTICS

    style GW fill:#FF6B6B,color:#fff
    style ORDER fill:#2196F3,color:#fff
    style PAYMENT fill:#4CAF50,color:#fff
    style WALLET fill:#9C27B0,color:#fff
    style COMMISSION fill:#FF9800,color:#fff
```

---

## 2. Event Subscription Matrix

```mermaid
graph LR
    subgraph Events["Domain Events Published"]
        E1["OrderCreated"]
        E2["StockReserved / StockReservationFailed"]
        E3["PaymentCompleted / PaymentFailed"]
        E4["OrderConfirmed / OrderCancelled"]
        E5["ShipmentCreated / DeliveryCompleted"]
        E6["CODVerified / CODVerificationFailed"]
        E7["CommissionSettled"]
        E8["RefundProcessed"]
        E9["EnablerApproved / CertificationAwarded"]
        E10["TicketCreated / TicketResolved"]
    end

    subgraph Subscribers["Service Subscribers"]
        S_INV["Inventory Service\n← OrderCreated\n← OrderCancelled"]
        S_PAY["Payment Service\n← OrderStockReserved"]
        S_LOG["Logistics Service\n← OrderConfirmed"]
        S_ORD["Order Service\n← StockReserved\n← PaymentCompleted\n← PaymentFailed"]
        S_WAL["Wallet Service\n← PaymentCompleted\n← CODVerified\n← RefundProcessed"]
        S_COM["Commission Service\n← OrderCompleted"]
        S_NOT["Notification Service\n← ALL order events"]
        S_ANA["Analytics Service\n← ALL events"]
    end

    E1 --> S_INV & S_ANA
    E2 --> S_ORD & S_ANA
    E3 --> S_ORD & S_WAL & S_NOT & S_ANA
    E4 --> S_LOG & S_NOT & S_ANA
    E5 --> S_WAL & S_COM & S_NOT & S_ANA
    E6 --> S_WAL & S_NOT & S_ANA
    E7 --> S_NOT & S_ANA
    E8 --> S_NOT & S_ANA

    style S_NOT fill:#FF9800,color:#fff
    style S_ANA fill:#9C27B0,color:#fff
```

---

## 3. Shared Infrastructure Dependencies

```mermaid
graph TB
    subgraph Services["All Service Modules"]
        SVC["22 Service Modules"]
    end

    subgraph SharedInfra["Shared Infrastructure"]
        PG["PostgreSQL\n(Per-service isolated DB)"]
        REDIS["Redis\n(Shared cluster)"]
        BUS["InMemoryEventBus\n(In-process)"]
        OUTBOX["Outbox Processor\n(Per service)"]
        SAGA["Saga Framework\n(Shared library)"]
        AUDIT["Audit Logger\n(Shared library)"]
        TRACING["OpenTelemetry\n(Jaeger)"]
        METRICS["Prometheus\n(/metrics endpoint)"]
    end

    subgraph RedisUsage["Redis Usage by Service"]
        R1["Auth: Sessions · Rate limits"]
        R2["Inventory: Redlock · Reservations"]
        R3["Payment: Idempotency keys"]
        R4["Catalog: Product cache · Search cache"]
        R5["Checkout: Cart sessions"]
        R6["Order: Saga state cache"]
    end

    SVC --> PG
    SVC --> REDIS
    SVC --> BUS
    SVC --> OUTBOX
    SVC --> SAGA
    SVC --> AUDIT
    SVC --> TRACING
    SVC --> METRICS

    REDIS --> RedisUsage

    style PG fill:#336791,color:#fff
    style REDIS fill:#DC382D,color:#fff
    style BUS fill:#9B59B6,color:#fff
    style OUTBOX fill:#E67E22,color:#fff
```
