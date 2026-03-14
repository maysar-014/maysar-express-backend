# Maysar Express Backend - System Operations Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Pattern](#architecture-pattern)
3. [Service Catalog](#service-catalog)
4. [Service Operations](#service-operations)
5. [Inter-Service Communication](#inter-service-communication)
6. [Event-Driven Architecture](#event-driven-architecture)
7. [Saga Orchestration](#saga-orchestration)
8. [Data Flow Patterns](#data-flow-patterns)

---

## System Overview

**Maysar Express Backend** is an enterprise-grade e-commerce platform built as a **modular monolith** with microservices-ready architecture. The system consists of 25+ services that communicate through an event-driven architecture using the Saga pattern for distributed transactions.

### Key Characteristics
- **Architecture**: Modular Monolith with Clean Architecture principles
- **Communication**: Event-driven with in-memory EventBus (production-ready for message brokers)
- **Transaction Management**: Saga orchestration pattern with compensation logic
- **Database**: PostgreSQL with Prisma ORM + Supabase integration
- **Deployment**: Single Docker container with service isolation
- **Port Strategy**: Single entry point (3000) with route-based service routing

### Technology Stack
- **Runtime**: Node.js 18+ with TypeScript 5.2+
- **Framework**: Express.js
- **ORM**: Prisma with PostgreSQL
- **Cache**: Redis
- **Events**: In-memory EventBus (Kafka/RabbitMQ ready)
- **Testing**: Jest with 90%+ coverage target

---

## Architecture Pattern

### Clean Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    API/Presentation Layer                    │
│  • Controllers (HTTP handlers)                              │
│  • Routes (endpoint definitions)                            │
│  • Middleware (validation, auth, error handling)            │
│  • Validators (input validation)                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  • Use Cases (business workflows)                           │
│  • Sagas (distributed transaction orchestration)            │
│  • DTOs (data transfer objects)                             │
│  • Mappers (entity ↔ DTO transformation)                    │
│  • Event Handlers (async event processing)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                              │
│  • Entities (business objects with identity)                │
│  • Value Objects (immutable domain concepts)                │
│  • Engines (complex business logic processors)              │
│  • Policies (business rules and constraints)                │
│  • Algorithms (pure computation logic)                      │
│  • Domain Events (business event definitions)               │
│  • Repository Interfaces (data access contracts)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  • Repositories (database implementations)                  │
│  • Messaging (event publishers/subscribers)                 │
│  • Providers (external API integrations)                    │
│  • Services (technical utilities)                           │
│  • Cache (Redis implementations)                            │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

Each service follows this structure:
```
service-name/
├── src/
│   ├── domain/              # Business logic (pure)
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── engines/
│   │   ├── policies/
│   │   ├── events/
│   │   └── repositories/    # Interfaces only
│   ├── application/         # Use cases & orchestration
│   │   ├── use-cases/
│   │   ├── sagas/
│   │   ├── dto/
│   │   ├── mappers/
│   │   └── handlers/
│   ├── infrastructure/      # External dependencies
│   │   ├── repositories/    # Implementations
│   │   ├── messaging/
│   │   ├── providers/
│   │   └── services/
│   └── api/                 # HTTP layer
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       └── validators/
├── tests/
├── prisma/
└── index.ts                 # Module export
```

---

## Service Catalog

### Core Services (Port 3000 - Route-based)

| Service | Route | Primary Responsibility | Key Operations |
|---------|-------|----------------------|----------------|
| **User Service** | `/api/user` | User management & profiles | Registration, authentication, profile CRUD, address management |
| **Auth Service** | `/api/auth` | Authentication & authorization | Login, token management, JWT validation, session handling |
| **Catalog Service** | `/api/catalog` | Product catalog management | Product CRUD, search, pricing, buy-box computation, matching |
| **Order Service** | `/api/order` | Order lifecycle management | Order creation, status tracking, fulfillment, cancellation |
| **Payment Service** | `/api/payment` | Payment processing | Payment processing, refunds, fraud detection, settlement |
| **Inventory Service** | `/api/inventory` | Stock management | Stock tracking, reservations, reorder points, warehouse management |
| **Logistics Service** | `/api/logistics` | Delivery operations | Route optimization, courier management, tracking, ETA calculation |
| **Checkout Service** | `/api/checkout` | Shopping cart & checkout | Cart management, checkout initiation, order preparation |
| **Wallet Service** | `/api/wallet` | Digital wallet operations | Balance management, transactions, top-ups, withdrawals |
| **Commission Service** | `/api/commission` | Commission calculations | Earnings tracking, commission rules, payout processing |
| **Payout Service** | `/api/payout` | Seller payouts | Payout scheduling, processing, reconciliation |
| **Pricing Service** | `/api/pricing` | Dynamic pricing | Price calculations, discounts, promotions, rules engine |
| **Notification Service** | `/api/notification` | Multi-channel notifications | Email, SMS, push notifications, templates |
| **Analytics Service** | `/api/analytics` | Business intelligence | Metrics collection, reporting, dashboards |
| **Community Service** | `/api/community` | Social features | Reviews, ratings, forums, user interactions |
| **Support Service** | `/api/support` | Customer support | Tickets, chat, knowledge base |
| **Training Service** | `/api/training` | Seller training | Courses, certifications, onboarding |
| **Compliance Service** | `/api/compliance` | Regulatory compliance | KYC, AML, tax compliance, auditing |
| **Business Registry** | `/api/business-registry` | Business verification | Business registration, verification, documentation |
| **Campaign Service** | `/api/campaign` | Marketing campaigns | Campaign management, targeting, analytics |
| **Enabler Service** | `/api/enabler` | Local business support | Community facilitators, local partnerships |
| **Maps Service** | `/api/maps` | Location services | Geocoding, routing, distance calculations |
| **SMS Service** | `/api/sms` | SMS gateway | SMS sending, delivery tracking, templates |
| **Two-Factor Service** | `/api/two-factor` | 2FA operations | OTP generation, verification, backup codes |
| **Session Service** | `/api/session` | Session management | Session creation, validation, expiration |
| **Production Service** | `/api/production` | Manufacturing tracking | Production orders, inventory planning |

---

## Service Operations

### 1. User Service Operations

**Core Responsibilities**: User lifecycle management, profile data, authentication data storage

**Key Operations**:
- **User Registration**: Create new user accounts with validation
- **Profile Management**: Update user information, preferences, settings
- **Address Management**: CRUD operations for shipping/billing addresses
- **Email/Phone Verification**: Verification token generation and validation
- **Password Management**: Password reset, change password workflows
- **Role Management**: Assign and update user roles (buyer, seller, admin)
- **Account Operations**: Suspend, activate, delete user accounts
- **Security Operations**: 2FA setup, security breach reporting

**Events Published**:
- `UserRegistered`: New user account created
- `UserProfileUpdated`: User information changed
- `UserVerified`: Email or phone verified
- `UserRoleChanged`: User role modified
- `UserSuspended`: Account suspended
- `UserDeleted`: Account deleted

**Events Consumed**:
- `OrderCompleted`: Update user order history
- `PaymentProcessed`: Update user transaction history

**Database Tables**:
- `User`: Core user information
- `UserAddress`: User addresses
- `Session`: Authentication sessions
- `PasswordResetToken`: Password reset tokens
- `EmailVerificationToken`: Email verification tokens
- `AuditLog`: User activity audit trail

---

### 2. Auth Service Operations

**Core Responsibilities**: Authentication, authorization, token management

**Key Operations**:
- **User Authentication**: Login with credentials validation
- **Token Management**: JWT generation, validation, refresh
- **Session Management**: Create, validate, expire sessions
- **Authorization**: Role-based access control (RBAC)
- **OAuth Integration**: Third-party authentication (Google, Facebook)
- **API Key Management**: Generate and validate API keys

**Events Published**:
- `UserLoggedIn`: Successful authentication
- `UserLoggedOut`: Session terminated
- `TokenRefreshed`: Access token refreshed
- `AuthenticationFailed`: Failed login attempt

**Events Consumed**:
- `UserRegistered`: Create authentication credentials
- `UserSuspended`: Invalidate all user sessions
- `PasswordChanged`: Update authentication credentials

**Integration Points**:
- User Service: Fetch user credentials and roles
- Session Service: Session storage and validation

---

### 3. Catalog Service Operations

**Core Responsibilities**: Product catalog, search, pricing, seller listings

**Key Operations**:
- **Product Management**: CRUD operations for products
- **Product Publishing**: Multi-step saga for product activation
  - Validation (data completeness, category rules)
  - Media processing (image optimization, CDN upload)
  - Inventory verification (stock availability check)
  - Search indexing (Elasticsearch/Algolia)
  - Notification (followers, watchers)
- **Product Matching**: Identify duplicate products across sellers
  - Fingerprint generation (title, brand, attributes)
  - Similarity scoring (fuzzy matching, ML algorithms)
  - Match confirmation workflow
- **Buy Box Computation**: Determine primary seller for product
  - Scoring algorithm (price, rating, fulfillment speed)
  - Alternative sellers ranking
- **Search Operations**: Product search with filters, facets, sorting
- **Pricing Operations**: Price updates, bulk pricing, dynamic pricing
- **Bulk Operations**: Batch product updates, imports, exports

**Events Published**:
- `ProductCreated`: New product added
- `ProductPublished`: Product activated and visible
- `ProductUnpublished`: Product deactivated
- `PriceUpdated`: Product price changed
- `BuyBoxComputed`: Primary seller determined
- `ProductMatched`: Duplicate product identified
- `ProductInventoryVerificationRequested`: Request stock check

**Events Consumed**:
- `ProductInventoryVerified`: Inventory service confirms stock
- `ProductInventoryFailed`: Insufficient stock
- `OrderCreated`: Update product sales metrics
- `ReviewCreated`: Update product ratings

**Sagas**:
- **ProductPublishingSaga**: Orchestrates product activation
  - Steps: validate → process_media → verify_inventory → index_search → publish → notify
  - Compensation: Rollback each step on failure

**Database Tables**:
- `Product`: Core product information
- `ProductMedia`: Images, videos, documents
- `ProductAttribute`: Dynamic product attributes
- `ProductMatch`: Product matching relationships
- `BuyBoxResult`: Buy box computation results
- `SellerListing`: Seller-specific product listings

---

### 4. Order Service Operations

**Core Responsibilities**: Order lifecycle, fulfillment orchestration

**Key Operations**:
- **Order Creation**: Create new orders from checkout
- **Order Fulfillment**: Multi-service saga orchestration
  - Stock reservation (Inventory Service)
  - Payment processing (Payment Service)
  - Delivery scheduling (Logistics Service)
  - Notification sending (Notification Service)
- **Order Status Management**: Track order through lifecycle
  - States: pending → confirmed → processing → shipped → delivered → completed
- **Order Cancellation**: Cancel orders with compensation
- **COD Management**: Cash-on-delivery eligibility and tracking
- **Order Tracking**: Real-time order status updates
- **Order History**: User order history and analytics

**Events Published**:
- `OrderCreated`: New order placed
- `OrderConfirmed`: Payment successful
- `OrderCancelled`: Order cancelled
- `OrderShipped`: Order dispatched
- `OrderDelivered`: Order delivered
- `OrderCompleted`: Order finalized

**Events Consumed**:
- `PaymentProcessed`: Confirm order payment
- `PaymentFailed`: Cancel order
- `StockReserved`: Inventory confirmed
- `StockReservationFailed`: Cancel order
- `DeliveryScheduled`: Update order with delivery info

**Sagas**:
- **OrderFulfillmentSaga**: Orchestrates order processing
  - Steps: reserve_stock → process_payment → schedule_delivery
  - Compensation: release_stock → refund_payment → cancel_delivery

**Database Tables**:
- `Order`: Core order information
- `OrderItem`: Order line items
- `OrderStatus`: Order status history
- `OrderTracking`: Delivery tracking information
- `CODDispute`: Cash-on-delivery disputes

---

### 5. Payment Service Operations

**Core Responsibilities**: Payment processing, fraud detection, refunds

**Key Operations**:
- **Payment Processing**: Process payments via payment gateways
  - Card payments (Pesapal)
  - Mobile money (M-Pesa, Airtel Money)
  - Bank transfers
  - Wallet payments
- **Fraud Detection**: Real-time fraud analysis
  - Transaction pattern analysis
  - Velocity checks
  - Blacklist verification
  - Risk scoring
- **Refund Processing**: Full and partial refunds
- **Settlement**: Batch settlement to sellers
- **Payment Method Management**: Store and manage payment methods
- **Transaction History**: Payment audit trail

**Events Published**:
- `PaymentProcessed`: Payment successful
- `PaymentFailed`: Payment declined
- `PaymentRefunded`: Refund processed
- `FraudDetected`: Suspicious transaction flagged
- `SettlementCompleted`: Batch settlement done

**Events Consumed**:
- `OrderCreated`: Initiate payment
- `OrderCancelled`: Process refund
- `DisputeRaised`: Hold payment

**Engines**:
- **FraudEngine**: Analyzes transactions for fraud indicators
- **PaymentProcessingEngine**: Routes payments to appropriate gateway
- **SettlementEngine**: Calculates and processes seller payouts

**Database Tables**:
- `Payment`: Payment transactions
- `Refund`: Refund records
- `PaymentMethod`: Stored payment methods
- `FraudCheck`: Fraud detection results
- `Settlement`: Settlement batches

---

### 6. Inventory Service Operations

**Core Responsibilities**: Stock management, warehouse operations

**Key Operations**:
- **Stock Management**: Track inventory levels
- **Stock Reservation**: Reserve stock for orders
- **Stock Release**: Release reserved stock (cancellation)
- **Reorder Point Management**: Automatic reorder triggers
- **Warehouse Management**: Multi-warehouse inventory
- **Stock Adjustment**: Manual stock corrections
- **Inventory Audit**: Stock reconciliation

**Events Published**:
- `StockReserved`: Stock allocated to order
- `StockReleased`: Stock returned to available
- `StockLevelLow`: Reorder point reached
- `StockAdjusted`: Manual adjustment made
- `ProductInventoryVerified`: Stock verification response

**Events Consumed**:
- `OrderCreated`: Reserve stock
- `OrderCancelled`: Release stock
- `OrderDelivered`: Deduct stock
- `ProductInventoryVerificationRequested`: Verify stock availability

**Policies**:
- **InventoryPolicies**: Business rules for stock management
  - Minimum stock levels
  - Reorder points
  - Safety stock calculations
  - Maximum stock thresholds

**Database Tables**:
- `Inventory`: Stock levels by product/warehouse
- `StockReservation`: Reserved stock records
- `StockMovement`: Inventory transaction history
- `Warehouse`: Warehouse information

---

### 7. Logistics Service Operations

**Core Responsibilities**: Delivery operations, route optimization, courier management

**Key Operations**:
- **Delivery Scheduling**: Assign deliveries to couriers
  - Intelligent courier selection (location, availability, performance)
  - Multi-stop route optimization
- **Route Optimization**: Calculate optimal delivery routes
  - Algorithms: Dijkstra, A*, Genetic, Ant Colony
  - Real-time traffic integration
  - Weather consideration
  - ETA calculation
- **Real-Time Tracking**: GPS-based delivery tracking
  - Live location updates
  - Customer notifications
  - Delivery proof (photos, signatures)
- **Courier Management**: Courier operations
  - Performance analytics
  - Earnings calculation
  - Availability management
  - Rating system
- **Delivery Analytics**: Performance metrics and insights

**Events Published**:
- `DeliveryScheduled`: Delivery assigned to courier
- `DeliveryStarted`: Courier started delivery
- `DeliveryCompleted`: Delivery finished
- `DeliveryCancelled`: Delivery cancelled
- `CourierLocationUpdated`: GPS location update

**Events Consumed**:
- `OrderConfirmed`: Schedule delivery
- `OrderCancelled`: Cancel delivery

**Engines**:
- **LogisticsEngine**: Delivery orchestration
- **RouteOptimizationEngine**: Multi-algorithm routing
- **RealTimeTrackingEngine**: GPS tracking and ETA
- **PerformanceAnalyticsEngine**: Courier metrics
- **EarningsManagementEngine**: Commission calculations

**Database Tables**:
- `Delivery`: Delivery records
- `Courier`: Courier information
- `Route`: Optimized routes
- `DeliveryTracking`: GPS tracking history
- `CourierEarnings`: Earnings records

---

### 8. Checkout Service Operations

**Core Responsibilities**: Shopping cart, checkout process

**Key Operations**:
- **Cart Management**: Shopping cart CRUD
  - Add items
  - Remove items
  - Update quantities
  - Clear cart
- **Checkout Initiation**: Start checkout process
  - Validate cart items
  - Calculate totals
  - Apply discounts
  - Reserve inventory
- **Checkout Confirmation**: Finalize checkout
  - Create order
  - Process payment
  - Clear cart

**Events Published**:
- `CartCreated`: New cart created
- `CartItemAdded`: Item added to cart
- `CartItemRemoved`: Item removed
- `CheckoutInitiated`: Checkout started
- `CheckoutCompleted`: Checkout finished

**Events Consumed**:
- `ProductPriceUpdated`: Update cart prices
- `ProductUnpublished`: Remove from carts

**Sagas**:
- **OrderFulfillmentSaga**: Checkout to order conversion

**Database Tables**:
- `Cart`: Shopping carts
- `CartItem`: Cart line items
- `CheckoutSession`: Checkout sessions

---

### 9. Wallet Service Operations

**Core Responsibilities**: Digital wallet, balance management

**Key Operations**:
- **Balance Management**: Track wallet balances
- **Top-Up**: Add funds to wallet
- **Withdrawal**: Withdraw funds
- **Transfer**: Peer-to-peer transfers
- **Transaction History**: Wallet transaction log

**Events Published**:
- `WalletCreated`: New wallet created
- `WalletCredited`: Funds added
- `WalletDebited`: Funds deducted
- `TransferCompleted`: P2P transfer done

**Events Consumed**:
- `UserRegistered`: Create wallet
- `PaymentRefunded`: Credit wallet
- `CommissionEarned`: Credit seller wallet

**Database Tables**:
- `Wallet`: Wallet accounts
- `WalletTransaction`: Transaction history
- `WalletTransfer`: Transfer records

---

### 10. Commission Service Operations

**Core Responsibilities**: Commission calculations, earnings tracking

**Key Operations**:
- **Commission Calculation**: Calculate platform fees
  - Percentage-based
  - Tiered pricing
  - Category-specific rates
- **Earnings Tracking**: Track seller earnings
- **Commission Rules**: Manage commission policies

**Events Published**:
- `CommissionCalculated`: Commission computed
- `CommissionEarned`: Seller earned commission

**Events Consumed**:
- `OrderCompleted`: Calculate commission
- `OrderRefunded`: Reverse commission

**Database Tables**:
- `CommissionRule`: Commission policies
- `CommissionTransaction`: Commission records

---

## Inter-Service Communication

### Communication Patterns

#### 1. Event-Driven Communication (Primary)
Services communicate asynchronously through domain events using the EventBus.

```typescript
// Publishing an event
await eventBus.publish('OrderCreated', {
  orderId: '123',
  userId: 'user-456',
  totalAmount: 100.00
}, metadata);

// Subscribing to an event
await eventBus.subscribe('OrderCreated', async (envelope) => {
  // Handle event
  await inventoryService.reserveStock(envelope.data);
});
```

#### 2. Saga Orchestration (Complex Workflows)
For multi-step transactions requiring coordination and compensation.

```typescript
// Saga orchestrates multiple services
class OrderFulfillmentSaga extends DistributedSagaOrchestrator {
  defineSteps() {
    return [
      { name: 'StockReservation', execute: ..., compensate: ... },
      { name: 'Payment', execute: ..., compensate: ... },
      { name: 'Delivery', execute: ..., compensate: ... }
    ];
  }
}
```

#### 3. Direct Repository Access (Within Service)
Services access their own data through repositories.

```typescript
// Within Order Service
const order = await orderRepository.findById(orderId);
```

### Event Contracts

Events are defined in `shared-contracts/` for type safety:

```typescript
// shared-contracts/order-service-contracts.ts
export namespace OrderService {
  export namespace Events {
    export interface OrderCreated {
      orderId: UUID;
      userId: UUID;
      items: Array<{...}>;
      totalAmount: Money;
      createdAt: Date;
    }
  }
}
```

---

## Event-Driven Architecture

### EventBus Implementation

The system uses an in-memory EventBus that can be replaced with Kafka/RabbitMQ for production.

```typescript
// shared/events/eventBus.ts
export class EventBus extends EventEmitter {
  async publish(eventType: string, data: any, metadata?: any): Promise<void>
  async subscribe(eventType: string, handler: Function): Promise<void>
}
```

### Event Flow Example: Order Creation

```
1. User clicks "Place Order"
   ↓
2. Checkout Service → publishes CheckoutCompleted event
   ↓
3. Order Service → subscribes to CheckoutCompleted
   ↓
4. Order Service → starts OrderFulfillmentSaga
   ↓
5. Saga Step 1: Publish StockReservation.Command
   ↓
6. Inventory Service → subscribes to StockReservation.Command
   ↓
7. Inventory Service → reserves stock → publishes StockReserved event
   ↓
8. Saga Step 2: Publish Payment.Command
   ↓
9. Payment Service → processes payment → publishes PaymentProcessed event
   ↓
10. Saga Step 3: Publish Delivery.Command
    ↓
11. Logistics Service → schedules delivery → publishes DeliveryScheduled event
    ↓
12. Saga completes → Order Service publishes OrderCompleted event
    ↓
13. Multiple services react to OrderCompleted:
    - Analytics Service: Update metrics
    - Notification Service: Send confirmation
    - Wallet Service: Credit seller
    - Commission Service: Calculate fees
```

---

## Saga Orchestration

### Saga Pattern Overview

Sagas manage distributed transactions across multiple services with automatic compensation on failure.

### Saga Lifecycle

```
1. START → Initialize saga with context
2. RUNNING → Execute steps sequentially
3. STEP SUCCESS → Move to next step
4. STEP FAILURE → Trigger compensation
5. COMPENSATING → Execute compensation in reverse order
6. COMPENSATED → All compensations complete
7. COMPLETED → All steps successful
```

### Saga Components

#### 1. Saga Orchestrator
Base class for all sagas providing:
- Step execution
- Compensation logic
- Event publishing
- State management
- Error handling

#### 2. Saga Steps
Each step has:
- `execute`: Forward operation
- `compensate`: Rollback operation

#### 3. Saga Log Repository
Persists saga state for recovery:
- Saga status
- Current step
- Execution history
- Error information

### Example: Product Publishing Saga

```typescript
class ProductPublishingSaga extends DistributedSagaOrchestrator {
  defineSteps() {
    return [
      {
        name: 'validate_product',
        execute: async (context) => {
          // Validate product data
        },
        compensate: async (context) => {
          // No compensation needed
        }
      },
      {
        name: 'process_media',
        execute: async (context) => {
          // Process images, videos
        },
        compensate: async (context) => {
          // Delete processed media
        }
      },
      {
        name: 'request_inventory_verification',
        execute: async (context) => {
          // Publish event to Inventory Service
          await this.publishCommand('ProductInventoryVerificationRequested', {...});
        },
        compensate: async (context) => {
          // Cancel verification request
        }
      },
      {
        name: 'update_search_index',
        execute: async (context) => {
          // Index product in search engine
        },
        compensate: async (context) => {
          // Remove from search index
        }
      },
      {
        name: 'publish_product',
        execute: async (context) => {
          // Set product status to published
        },
        compensate: async (context) => {
          // Revert to original status
        }
      }
    ];
  }
}
```

### Compensation Strategy

When a step fails, the saga executes compensation in reverse order:

```
Success Flow:
Step 1 → Step 2 → Step 3 → Step 4 → Complete

Failure Flow (Step 3 fails):
Step 1 → Step 2 → Step 3 (FAIL)
         ↓
Compensate Step 2 → Compensate Step 1 → Compensated
```

---

## Data Flow Patterns

### Pattern 1: Simple CRUD Operation

```
Client Request
    ↓
API Controller
    ↓
Use Case
    ↓
Domain Entity (validation)
    ↓
Repository
    ↓
Database
    ↓
Response to Client
```

### Pattern 2: Event-Driven Update

```
Service A: State Change
    ↓
Publish Domain Event
    ↓
EventBus
    ↓
Service B: Subscribe to Event
    ↓
Update Service B State
    ↓
Publish New Event (optional)
```

### Pattern 3: Saga-Orchestrated Transaction

```
Client Request
    ↓
Use Case starts Saga
    ↓
Saga Step 1: Publish Command
    ↓
Service A: Execute & Publish Reply
    ↓
Saga Step 2: Publish Command
    ↓
Service B: Execute & Publish Reply
    ↓
Saga Step 3: Publish Command
    ↓
Service C: Execute & Publish Reply
    ↓
Saga Complete: Publish Success Event
    ↓
Response to Client
```

### Pattern 4: Query with Aggregation

```
Client Request
    ↓
API Controller
    ↓
Query Use Case
    ↓
Multiple Repository Calls (parallel)
    ├─ Repository A
    ├─ Repository B
    └─ Repository C
    ↓
Aggregate Results
    ↓
Map to DTO
    ↓
Response to Client
```

---

## Deployment & Operations

### Single Container Deployment

All services run in a single Node.js process:

```
Docker Container (Port 3000)
├── Express App
│   ├── /api/user → User Service
│   ├── /api/auth → Auth Service
│   ├── /api/catalog → Catalog Service
│   ├── /api/order → Order Service
│   ├── /api/payment → Payment Service
│   └── ... (all other services)
├── Shared EventBus
├── Shared Database Connection Pool
└── Shared Redis Connection
```

### Health Checks

```
GET /health       → Liveness probe (process running)
GET /ready        → Readiness probe (dependencies healthy)
```

### Monitoring

Each service logs structured events:
- Request/Response logging
- Event publishing/consumption
- Saga execution steps
- Error tracking
- Performance metrics

---

## Summary

The Maysar Express Backend is a sophisticated e-commerce platform that:

1. **Modular Architecture**: 25+ services with clear boundaries
2. **Event-Driven**: Asynchronous communication via EventBus
3. **Saga Pattern**: Distributed transaction management with compensation
4. **Clean Architecture**: Separation of concerns across layers
5. **Production-Ready**: Comprehensive error handling, logging, monitoring
6. **Scalable Design**: Ready for microservices decomposition

Each service operates independently while coordinating through events and sagas, ensuring data consistency and system reliability.
