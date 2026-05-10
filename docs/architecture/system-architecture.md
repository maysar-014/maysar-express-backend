# Maysar Express — System Architecture Diagrams

> Architecture: Modular Monolith with Clean Architecture + Saga Orchestration
> Stack: Node.js / TypeScript, PostgreSQL, Redis, InMemoryEventBus + Transactional Outbox

---

## 1. High-Level System Context

```mermaid
graph TB
    subgraph Actors["External Actors"]
        BUYER["🛒 Buyer"]
        SELLER["🏪 Seller"]
        SUPPLIER["🏭 Supplier"]
        ENABLER["🤝 Enabler"]
        COURIER["🚴 Courier"]
        ADMIN["🔐 Admin"]
    end

    subgraph Platform["Maysar Express Platform"]
        GW["API Gateway\n:3000\nRouting · Auth · Rate Limiting"]

        subgraph Core["Core Commerce"]
            AUTH["Auth Service\n:3001"]
            CATALOG["Catalog Service\n:3005"]
            CHECKOUT["Checkout Service\n:3009"]
            ORDER["Order Service\n:3002"]
            INVENTORY["Inventory Service\n:3003"]
        end

        subgraph Financial["Financial"]
            PAYMENT["Payment Service\n:3004"]
            WALLET["Wallet Service"]
            PAYOUT["Payout Service"]
            COMMISSION["Commission Service\n:3008"]
        end

        subgraph Ops["Operations"]
            LOGISTICS["Logistics Service\n:3007"]
            MAPS["Maps Service"]
            NOTIFICATION["Notification Service\n:3010"]
            ANALYTICS["Analytics Service\n:3011"]
        end

        subgraph Trust["Trust & Compliance"]
            BUSINESS["Business Registry\n:3006"]
            COMPLIANCE["Compliance Service\n:3013"]
            KYC["KYC Service"]
        end

        subgraph Network["Network"]
            ENABLER_SVC["Enabler Service"]
            TRAINING["Training Service"]
            COMMUNITY["Community Service"]
            SUPPORT["Support Service"]
            PRODUCTION["Production Service"]
        end

        subgraph Infra["Infrastructure"]
            BUS["InMemoryEventBus\n+ Outbox Processor"]
            REDIS["Redis\nCache · Sessions · Locks"]
            PG["PostgreSQL\nPer-service DBs"]
        end
    end

    subgraph External["External Systems"]
        PESAPAL["Pesapal\nPayment Gateway"]
        SENDGRID["SendGrid\nEmail"]
        AT["Africa's Talking\nSMS"]
        GMAPS["Google Maps\nGeolocation"]
        S3["AWS S3\nMedia Storage"]
        FIREBASE["Firebase\nPhone OTP"]
    end

    BUYER & SELLER & SUPPLIER & ENABLER & COURIER & ADMIN --> GW
    GW --> Core & Financial & Ops & Trust & Network
    Core & Financial & Ops & Trust & Network --> Infra
    PAYMENT --> PESAPAL
    NOTIFICATION --> SENDGRID & AT & FIREBASE
    LOGISTICS --> GMAPS
    CATALOG --> S3

    style GW fill:#FF6B6B,color:#fff,stroke:#c92a2a
    style BUS fill:#9B59B6,color:#fff
    style REDIS fill:#DC382D,color:#fff
    style PG fill:#336791,color:#fff
```

---

## 2. Layered Architecture (Per Service)

```mermaid
graph TB
    subgraph Service["Any Service Module"]
        subgraph API["API Layer"]
            CTRL["Controllers"]
            ROUTES["Routes"]
            VALID["Validators"]
        end

        subgraph APP["Application Layer"]
            UC["Use Cases"]
            SAGAS["Sagas\n(Cross-module coordination)"]
            DTO["DTOs & Mappers"]
        end

        subgraph DOMAIN["Domain Layer ⚡ (Sacred)"]
            ENT["Entities"]
            VO["Value Objects"]
            ENG["Engines\n(Algorithms + Policies)"]
            DEVT["Domain Events"]
        end

        subgraph INFRA["Infrastructure Layer"]
            REPO["Repositories\n(Prisma)"]
            MSG["Messaging\n(EventBus)"]
            CACHE["Cache\n(Redis)"]
            PROV["External Providers"]
        end
    end

    API --> APP
    APP --> DOMAIN
    INFRA --> DOMAIN

    note1["⚠️ Dependencies point INWARD only\nDomain has ZERO external imports"]

    style DOMAIN fill:#fce4ec,stroke:#880e4f,stroke-width:3px
    style API fill:#e3f2fd,stroke:#1565c0
    style APP fill:#e8f5e9,stroke:#2e7d32
    style INFRA fill:#fff3e0,stroke:#e65100
```

---

## 3. Service Dependency Map

```mermaid
graph LR
    subgraph Clients["Client Consoles"]
        BUYER_UI["Buyer App"]
        SELLER_UI["Seller Console"]
        COURIER_UI["Courier App"]
        ENABLER_UI["Enabler Console"]
        SUPPLIER_UI["Supplier Console"]
        ADMIN_UI["Admin Console"]
    end

    GW["API Gateway :3000"]

    subgraph CoreFlow["Core Order Flow"]
        CATALOG["Catalog\n:3005"]
        CHECKOUT["Checkout\n:3009"]
        ORDER["Order\n:3002"]
        INVENTORY["Inventory\n:3003"]
        PAYMENT["Payment\n:3004"]
        LOGISTICS["Logistics\n:3007"]
    end

    subgraph FinancialFlow["Financial"]
        WALLET["Wallet"]
        PAYOUT["Payout"]
        COMMISSION["Commission\n:3008"]
    end

    subgraph SupportFlow["Support Services"]
        AUTH["Auth :3001"]
        USER["User :3014"]
        NOTIF["Notification\n:3010"]
        ANALYTICS["Analytics\n:3011"]
        BUSINESS["Business Registry\n:3006"]
        COMPLIANCE["Compliance\n:3013"]
        ENABLER_SVC["Enabler"]
        TRAINING["Training"]
    end

    Clients --> GW
    GW --> AUTH & CATALOG & CHECKOUT & ORDER & BUSINESS & ANALYTICS & USER & ENABLER_SVC

    CHECKOUT -->|"reserve stock"| INVENTORY
    CHECKOUT -->|"create order"| ORDER
    ORDER -->|"process payment"| PAYMENT
    ORDER -->|"schedule delivery"| LOGISTICS
    ORDER -->|"calculate commission"| COMMISSION
    PAYMENT -->|"debit/credit"| WALLET
    COMMISSION -->|"credit earnings"| WALLET
    WALLET -->|"disburse"| PAYOUT
    LOGISTICS -->|"route optimization"| MAPS["Maps"]
    CATALOG -->|"check stock"| INVENTORY
    BUSINESS -->|"verify compliance"| COMPLIANCE
    ENABLER_SVC -->|"track training"| TRAINING
    ORDER & PAYMENT & LOGISTICS & CATALOG --> NOTIF
    ORDER & PAYMENT & LOGISTICS --> ANALYTICS

    style GW fill:#FF6B6B,color:#fff
    style ORDER fill:#2196F3,color:#fff
    style PAYMENT fill:#4CAF50,color:#fff
    style WALLET fill:#9C27B0,color:#fff
```

---

## 4. Event-Driven Architecture

```mermaid
graph TB
    subgraph Publishers["Event Publishers"]
        P1["Order Service"]
        P2["Payment Service"]
        P3["Inventory Service"]
        P4["Logistics Service"]
        P5["Catalog Service"]
        P6["Commission Service"]
        P7["Wallet Service"]
    end

    subgraph Outbox["Transactional Outbox Pattern"]
        OB["Outbox Table\n(per service DB)\nSame TX as business op"]
        OP["Outbox Processor\nPolls every 5s\nBatch: 50 events\nMax retries: 5"]
    end

    subgraph Bus["InMemoryEventBus"]
        BUS["Event Bus\n3-retry exponential backoff\n50ms / 100ms / 200ms"]
    end

    subgraph Subscribers["Event Subscribers"]
        S1["Order Service\n(StockReserved, PaymentCompleted)"]
        S2["Inventory Service\n(OrderCreated, OrderCancelled)"]
        S3["Payment Service\n(OrderStockReserved)"]
        S4["Logistics Service\n(OrderConfirmed)"]
        S5["Notification Service\n(All order events)"]
        S6["Analytics Service\n(All events)"]
        S7["Commission Service\n(OrderCompleted)"]
        S8["Wallet Service\n(PaymentCompleted, CODVerified)"]
    end

    Publishers -->|"Write event\n(same DB transaction)"| OB
    OB --> OP
    OP -->|"Dispatch"| BUS
    BUS --> Subscribers

    style OB fill:#E67E22,color:#fff
    style OP fill:#E67E22,color:#fff
    style BUS fill:#9B59B6,color:#fff
```

---

## 5. Deployment Architecture

```mermaid
graph TB
    subgraph Internet["Internet"]
        CLIENT["Client Apps\n(Browser / Mobile)"]
    end

    subgraph Cloud["Cloud Infrastructure"]
        subgraph LB["Load Balancer"]
            NGINX["Nginx / Reverse Proxy\nSSL Termination"]
        end

        subgraph App["Application Tier"]
            MONOLITH["Maysar Monolith\nNode.js / TypeScript\n22 Service Modules\nPort: 3000"]
        end

        subgraph Data["Data Tier"]
            PG["PostgreSQL\n(Supabase / RDS)\nPrimary + Read Replicas"]
            REDIS["Redis Cluster\nSessions · Cache · Locks\nIdempotency Keys"]
        end

        subgraph Observability["Observability"]
            PROM["Prometheus\n/metrics endpoint"]
            JAEGER["Jaeger\nDistributed Tracing"]
            SENTRY["Sentry\nError Tracking"]
        end
    end

    subgraph External["External APIs"]
        PESAPAL["Pesapal\nPayments"]
        AT["Africa's Talking\nSMS"]
        FIREBASE["Firebase\nPhone OTP"]
        GMAPS["Google Maps"]
        S3["AWS S3\nMedia"]
    end

    CLIENT --> NGINX
    NGINX --> MONOLITH
    MONOLITH --> PG & REDIS
    MONOLITH --> PROM & JAEGER & SENTRY
    MONOLITH --> PESAPAL & AT & FIREBASE & GMAPS & S3

    style MONOLITH fill:#4A90E2,color:#fff,stroke-width:3px
    style PG fill:#336791,color:#fff
    style REDIS fill:#DC382D,color:#fff
```
