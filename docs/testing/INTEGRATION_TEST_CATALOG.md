# Maysar Express Backend - Integration Test Catalog

**Version**: 1.0  
**Last Updated**: 2026-03-08  
**Purpose**: Comprehensive list of all system integrations for writing integration tests

---

## Table of Contents
1. [External Service Integrations](#external-service-integrations)
2. [Database Integrations](#database-integrations)
3. [Internal Service Integrations](#internal-service-integrations)
4. [Event Bus Integrations](#event-bus-integrations)
5. [Infrastructure Integrations](#infrastructure-integrations)
6. [Third-Party API Integrations](#third-party-api-integrations)
7. [Saga Orchestration Integrations](#saga-orchestration-integrations)

---

## External Service Integrations

### 1. Payment Gateway - PaymentGateway
**Service**: Payment Service  
**Integration Type**: REST API  
**Environment Variables**:
- `PAYMENT_GATEWAY_SECRET_KEY`
- `PAYMENT_GATEWAY_WEBHOOK_SECRET`
- `PAYMENT_GATEWAY_URL`
- `BASE_URL`

**Test Scenarios**:
- Payment initiation
- Payment callback handling
- IPN (Instant Payment Notification) webhook processing
- Payment status verification
- Refund processing
- Failed payment handling

---

### 2. SMS Gateway - Africa's Talking
**Service**: SMS Service / Notification Service  
**Integration Type**: REST API  
**Environment Variables**:
- `AFRICASTALKING_USERNAME`
- `AFRICASTALKING_API_KEY`
- `AFRICASTALKING_SENDER_ID`
- `SMS_SERVICE_API_KEY`
- `SMS_SERVICE_PROVIDER` (`africastalking`)

**Test Scenarios**:
- SMS sending
- Delivery status tracking
- Failed delivery handling
- Retry mechanism
- Rate limiting
- Message queuing

---

### 3. Email Service - SMTP
**Service**: Notification Service  
**Integration Type**: SMTP  
**Environment Variables**:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

**Test Scenarios**:
- Email template rendering
- Email sending
- Attachment handling
- Bounce handling
- Delivery tracking
- Bulk email sending

---

### 4. Push Notifications - Firebase
**Service**: Notification Service  
**Integration Type**: Firebase Cloud Messaging  
**Environment Variables**:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `NOTIFICATION_SERVICE_FIREBASE_KEY`

**Test Scenarios**:
- Push notification sending
- Device token management
- Topic subscription
- Notification delivery tracking
- Failed notification handling

---



### 6. Error Tracking - Sentry
**Service**: All Services  
**Integration Type**: SDK  
**Environment Variables**:
- `SENTRY_DSN`

**Test Scenarios**:
- Error capture
- Performance monitoring
- Transaction tracking
- Breadcrumb logging
- User context attachment

---

### 7. Analytics - Google Analytics
**Service**: Analytics Service  
**Integration Type**: REST API  
**Environment Variables**:
- `GOOGLE_ANALYTICS_ID`

**Test Scenarios**:
- Event tracking
- User behavior analytics
- Conversion tracking
- Custom dimension tracking

---

### 5. File Storage - Persistent Volumes
**Service**: Catalog Service, User Service, Compliance Service  
**Integration Type**: File System  
**Environment Variables**:
- `STORAGE_PATH` (mounted storage path)
- `MAX_FILE_SIZE`

**Test Scenarios**:
- File upload to volume
- File download from volume
- File deletion
- Directory management
- Storage quota handling
- File permissions

---

## Database Integrations

### 1. PostgreSQL - Primary Database
**Service**: All Services  
**Integration Type**: Prisma ORM  
**Environment Variables**:
- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

**Test Scenarios**:
- CRUD operations
- Transaction management
- Connection pooling
- Query optimization
- Migration execution
- Backup and restore
- Optimistic locking
- Concurrent access handling

**Models to Test**:
- User, Auth_User, User_User
- Order_Order, Order_OrderItem, Order_Payment, Order_Settlement
- Payment_Payment, Payment_Refund, Payment_WebhookEvent
- Wallet_Wallet, Wallet_Transaction, Wallet_Hold
- Product, ProductVariant, Category
- Inventory_StockItem, Inventory_Reservation
- Logistics_Courier, Logistics_Delivery
- Training_TrainingRecord, Training_CertificationRequirement
- Commission, Commission_Referral, Commission_Reward
- Notification, NotificationTemplate
- Support_Ticket, Support_TicketMessage
- All Outbox tables (per service)
- SagaLog, SagaStepLog, SagaDeadLetter
- EventLog, EventStore

---

### 2. Redis - Cache & Session Store
**Service**: All Services  
**Integration Type**: ioredis  
**Environment Variables**:
- `REDIS_URL`
- `REDIS_PASSWORD`

**Test Scenarios**:
- Cache set/get operations
- Session management
- Distributed locking
- Rate limiting
- Pub/Sub messaging
- TTL expiration
- Connection failover
- Cluster mode operations

---

## Internal Service Integrations

### 1. User Service
**Endpoints**:
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/:id/addresses` - Get user addresses
- `POST /api/users/:id/addresses` - Add address

**Events Published**:
- `UserCreated.v1`
- `UserUpdated.v1`
- `UserDeleted.v1`
- `UserAddressAdded.v1`

**Events Consumed**:
- `OrderCompleted.v1`
- `PaymentCompleted.v1`

---

### 2. Auth Service
**Endpoints**:
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/2fa/enable` - Enable 2FA
- `POST /api/auth/2fa/verify` - Verify 2FA

**Events Published**:
- `UserRegistered.v1`
- `UserLoggedIn.v1`
- `UserLoggedOut.v1`
- `EmailVerified.v1`
- `PasswordReset.v1`

---

### 3. Catalog Service
**Endpoints**:
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/search` - Search products
- `GET /api/categories` - List categories
- `GET /api/products/:id/buy-box` - Get buy box

**Events Published**:
- `ProductCreated.v1`
- `ProductUpdated.v1`
- `ProductDeleted.v1`
- `ProductPublished.v1`
- `BuyBoxUpdated.v1`

**Events Consumed**:
- `InventoryUpdated.v1`
- `OrderCreated.v1`

---

### 4. Order Service
**Endpoints**:
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/cancel` - Cancel order
- `GET /api/orders/buyer/:buyerId` - Get buyer orders
- `GET /api/orders/seller/:sellerId` - Get seller orders

**Events Published**:
- `OrderCreated.v1`
- `OrderConfirmed.v1`
- `OrderCancelled.v1`
- `OrderCompleted.v1`
- `OrderPaymentInitiated.v1`

**Events Consumed**:
- `PaymentSucceeded.v1`
- `PaymentFailed.v1`
- `InventoryReserved.v1`
- `InventoryReleased.v1`
- `DeliveryCompleted.v1`

---

### 5. Payment Service
**Endpoints**:
- `POST /api/payments` - Initiate payment
- `GET /api/payments/:id` - Get payment
- `POST /api/payments/:id/refund` - Refund payment
- `POST /api/payments/webhook` - Payment webhook
- `GET /api/payments/order/:orderId` - Get order payments

**Events Published**:
- `PaymentInitiated.v1`
- `PaymentSucceeded.v1`
- `PaymentFailed.v1`
- `RefundInitiated.v1`
- `RefundCompleted.v1`

**Events Consumed**:
- `OrderCreated.v1`
- `OrderCancelled.v1`

---

### 6. Inventory Service
**Endpoints**:
- `POST /api/inventory/stock` - Add stock
- `GET /api/inventory/stock/:sku` - Get stock
- `PUT /api/inventory/stock/:sku` - Update stock
- `POST /api/inventory/reserve` - Reserve inventory
- `POST /api/inventory/release` - Release reservation
- `GET /api/inventory/warehouses` - List warehouses

**Events Published**:
- `InventoryReserved.v1`
- `InventoryReleased.v1`
- `LowStockAlert.v1`
- `StockUpdated.v1`

**Events Consumed**:
- `OrderCreated.v1`
- `OrderCancelled.v1`
- `PaymentSucceeded.v1`

---

### 7. Logistics Service
**Endpoints**:
- `POST /api/logistics/deliveries` - Create delivery *(legacy)*
- `GET /api/logistics/deliveries/:id` - Get delivery *(legacy)*
- `PUT /api/logistics/deliveries/:id/status` - Update delivery status *(legacy)*
- `POST /api/logistics/couriers` - Create courier *(legacy)*
- `GET /api/logistics/couriers/:id` - Get courier *(legacy)*
- `PUT /api/logistics/couriers/:id/location` - Update courier location *(legacy)*
- `POST /api/logistics/v1/quote` - Single-seller delivery quote (three-engine path, 11-stage fallback)
- `POST /api/logistics/v1/fulfillment-options` - Ranked fulfillment options (feasibility-gated, fairness-filtered)
- `GET /api/logistics/internal/quotes/:quoteId` - Fetch quote (validation/consume flow)
- `PATCH /api/logistics/internal/quotes/:quoteId/consume` - Single-use consume
- `POST /api/logistics/internal/jobs/:jobId/match-drivers` - Ranked driver candidates (admin/system)
- `GET /api/logistics/internal/kpis` - Operational KPI snapshot (admin/system)

**Events Published** (outbox `logistics_OutboxEvent`):
- `shipment.created`
- `delivery.consolidated`
- `DriverAssigned`, `GoodsLoaded`, `ShipmentDeparted`, `DeliveryAttempted`, `DeliveryCompleted`, `DeliveryFailed` *(DeliveryJob transitions)*
- *(legacy)* `DeliveryAssigned.v1`, `DeliveryPickedUp.v1`, `DeliveryInTransit.v1`, `DeliveryCompleted.v1`, `DeliveryFailed.v1`

**Events Consumed**:
- `OrderConfirmed.v1`
- `PaymentSucceeded.v1`

**Integration suites (opt-in, HQ-tests)**:
- `services/checkout-service/src/tests/integration/multi-seller-consolidation.integration.test.ts` — consolidation orchestrator plan() + DeliveryGroup + `delivery.consolidated` (4/4)
- `services/logistics-service/src/application/use-cases/__tests__/digest-settlement.test.ts` — settlement lifecycle: attribution → completion ledger → ledger-only settlement (4/4)
- `services/logistics-service/src/api/routes/quote.routes.test.ts` — quote e2e over HTTP (7/7)

---

### 8. Wallet Service
**Endpoints**:
- `POST /api/wallets` - Create wallet
- `GET /api/wallets/:userId` - Get wallet
- `POST /api/wallets/:userId/credit` - Credit wallet
- `POST /api/wallets/:userId/debit` - Debit wallet
- `POST /api/wallets/:userId/freeze` - Freeze funds
- `POST /api/wallets/:userId/unfreeze` - Unfreeze funds
- `GET /api/wallets/:userId/transactions` - Get transactions

**Events Published**:
- `WalletCreated.v1`
- `WalletCredited.v1`
- `WalletDebited.v1`
- `FundsFrozen.v1`
- `FundsUnfrozen.v1`

**Events Consumed**:
- `OrderCreated.v1`
- `PaymentSucceeded.v1`
- `RefundCompleted.v1`

---

### 9. Notification Service
**Endpoints**:
- `POST /api/notifications` - Send notification
- `GET /api/notifications/:userId` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/templates` - Create template
- `GET /api/notifications/templates` - List templates

**Events Published**:
- `NotificationSent.v1`
- `NotificationDelivered.v1`
- `NotificationFailed.v1`

**Events Consumed**:
- `OrderCreated.v1`
- `PaymentSucceeded.v1`
- `DeliveryCompleted.v1`
- `UserRegistered.v1`

---

### 10. Commission Service
**Endpoints**:
- `POST /api/commission/calculate` - Calculate commission
- `PUT /api/commission/:id/approve` - Approve commission
- `GET /api/commission/:id` - Get commission
- `GET /api/commission/sellers/:sellerId` - Get seller commissions

**Events Published**:
- `CommissionCalculated.v1`
- `CommissionPaid.v1`
- `CommissionAdjusted.v1`

**Events Consumed**:
- `OrderCompleted.v1`
- `DeliveryCompleted.v1`

---

### 11. Training Service
**Endpoints**:
- `POST /api/training/modules` - Create module
- `GET /api/training/modules` - List modules
- `POST /api/training/records` - Start training
- `PUT /api/training/records/:id/complete` - Complete training
- `GET /api/training/records/:learnerId` - Get learner records
- `GET /api/training/leaderboard` - Get leaderboard

**Events Published**:
- `TrainingStarted.v1`
- `TrainingCompleted.v1`
- `TrainingFailed.v1`
- `LearnerEligibilityChanged.v1`
- `BadgeAwarded.v1`

**Events Consumed**:
- `UserRegistered.v1`

---

### 12. Compliance Service
**Endpoints**:
- `POST /api/compliance/kyc` - Submit KYC
- `GET /api/compliance/kyc/:userId` - Get KYC status
- `PUT /api/compliance/kyc/:id/verify` - Verify KYC
- `POST /api/compliance/aml-check` - AML check
- `GET /api/compliance/data-retention` - Get retention policies

**Events Published**:
- `KYCSubmitted.v1`
- `KYCApproved.v1`
- `KYCRejected.v1`
- `AMLCheckCompleted.v1`

**Events Consumed**:
- `UserRegistered.v1`
- `PaymentInitiated.v1`

---

### 13. Support Service
**Endpoints**:
- `POST /api/support/tickets` - Create ticket
- `GET /api/support/tickets/:id` - Get ticket
- `POST /api/support/tickets/:id/messages` - Add message
- `PUT /api/support/tickets/:id/status` - Update status
- `POST /api/support/tickets/:id/assign` - Assign agent

**Events Published**:
- `TicketCreated.v1`
- `TicketAssigned.v1`
- `TicketResolved.v1`
- `TicketClosed.v1`

**Events Consumed**:
- `OrderCreated.v1`
- `PaymentFailed.v1`
- `DeliveryFailed.v1`

---

### 14. Analytics Service
**Endpoints**:
- `POST /api/analytics/events` - Track event
- `GET /api/analytics/seller/:sellerId/metrics` - Get seller metrics
- `GET /api/analytics/enabler/:enablerId/metrics` - Get enabler metrics
- `GET /api/analytics/dashboard` - Get dashboard data

**Events Published**:
- `AnalyticsEventProcessed.v1`
- `MetricsUpdated.v1`

**Events Consumed**:
- All domain events for analytics

---

### 15. Enabler Service
**Endpoints**:
- `POST /api/enablers` - Create enabler profile
- `GET /api/enablers/:id` - Get enabler
- `POST /api/enablers/:id/listings` - Create product listing
- `GET /api/enablers/:id/orders` - Get enabler orders
- `GET /api/enablers/:id/commissions` - Get commissions

**Events Published**:
- `EnablerRegistered.v1`
- `EnablerApproved.v1`
- `ProductListingCreated.v1`
- `EnablerOrderCreated.v1`

**Events Consumed**:
- `OrderCreated.v1`
- `OrderCompleted.v1`

---

### 16. Campaign Service
**Endpoints**:
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign
- `PUT /api/campaigns/:id` - Update campaign
- `POST /api/campaigns/:id/activate` - Activate campaign
- `POST /api/campaigns/:id/deactivate` - Deactivate campaign

**Events Published**:
- `CampaignCreated.v1`
- `CampaignActivated.v1`
- `CampaignDeactivated.v1`
- `PriceUpdated.v1`

**Events Consumed**:
- `ProductCreated.v1`
- `OrderCreated.v1`

---

### 17. Community Service
**Endpoints**:
- `POST /api/community/posts` - Create post
- `GET /api/community/posts/:id` - Get post
- `POST /api/community/posts/:id/comments` - Add comment
- `POST /api/community/posts/:id/like` - Like post
- `POST /api/community/discussions` - Create discussion
- `POST /api/community/challenges` - Create challenge

**Events Published**:
- `PostCreated.v1`
- `CommentAdded.v1`
- `PostLiked.v1`
- `DiscussionCreated.v1`

**Events Consumed**:
- `UserRegistered.v1`

---

### 18. Business Registry Service
**Endpoints**:
- `POST /api/businesses` - Register business
- `GET /api/businesses/:id` - Get business
- `PUT /api/businesses/:id` - Update business
- `POST /api/businesses/:id/documents` - Upload document
- `PUT /api/businesses/:id/verify` - Verify business

**Events Published**:
- `BusinessRegistered.v1`
- `BusinessVerified.v1`
- `BusinessRejected.v1`

**Events Consumed**:
- `UserRegistered.v1`

---

### 19. Checkout Service
**Endpoints**:
- `POST /api/checkout/cart` - Create cart
- `POST /api/checkout/cart/:id/items` - Add item to cart
- `DELETE /api/checkout/cart/:id/items/:itemId` - Remove item
- `POST /api/checkout/sessions` - Create checkout session
- `POST /api/checkout/sessions/:id/complete` - Complete checkout

**Events Published**:
- `CartCreated.v1`
- `CartItemAdded.v1`
- `CheckoutStarted.v1`
- `CheckoutCompleted.v1`

**Events Consumed**:
- `ProductUpdated.v1`
- `InventoryUpdated.v1`

---

### 20. Payout Service
**Endpoints**:
- `POST /api/payouts` - Create payout
- `GET /api/payouts/:id` - Get payout
- `PUT /api/payouts/:id/process` - Process payout
- `GET /api/payouts/user/:userId` - Get user payouts

**Events Published**:
- `PayoutCreated.v1`
- `PayoutProcessed.v1`
- `PayoutFailed.v1`

**Events Consumed**:
- `CommissionPaid.v1`
- `OrderCompleted.v1`

---

## Event Bus Integrations

### In-Memory Event Bus
**Implementation**: `shared/events/eventBus.ts`  
**Type**: Synchronous, In-Process

**Test Scenarios**:
- Event publishing
- Event subscription
- Multiple subscribers per event
- Event handler failure handling
- Dead letter queue management
- Event ordering
- Idempotency handling
- Correlation ID propagation

**Key Events to Test**:
- Order lifecycle events
- Payment events
- Inventory events
- Notification events
- Saga events
- User events

---

## Infrastructure Integrations

### 1. Outbox Pattern
**Implementation**: `shared/outbox/`  
**Services**: All services with database

**Test Scenarios**:
- Event persistence in outbox
- Outbox processor polling
- Event publishing from outbox
- Retry mechanism
- Dead letter handling
- Transaction consistency
- Concurrent processing
- Idempotency

---

### 2. Saga Orchestration
**Implementation**: `shared/saga/saga.orchestrator.ts`  
**Services**: Order, Payment, Inventory, Logistics

**Test Scenarios**:
- Saga initiation
- Step execution
- Step failure and compensation
- Saga completion
- Saga recovery
- Dead letter routing
- Concurrent saga execution
- Saga state persistence

**Sagas to Test**:
- Order Fulfillment Saga
- Payment Processing Saga
- Refund Saga
- Inventory Reservation Saga
- COD Order Saga

---

### 3. Distributed Locking
**Implementation**: `shared/locking/redis-lock.ts`  
**Backend**: Redis

**Test Scenarios**:
- Lock acquisition
- Lock release
- Lock timeout
- Deadlock prevention
- Concurrent lock attempts
- Lock renewal

---

### 4. Rate Limiting
**Implementation**: `shared/middleware/redis-rate-limit.store.ts`  
**Backend**: Redis

**Test Scenarios**:
- Request rate limiting
- Per-user rate limiting
- Per-IP rate limiting
- Rate limit reset
- Distributed rate limiting

---

### 5. Idempotency
**Implementation**: `shared/middleware/idempotency.ts`  
**Backend**: Redis/Database

**Test Scenarios**:
- Duplicate request detection
- Idempotency key validation
- Response caching
- TTL expiration
- Concurrent duplicate requests

---

### 6. CSRF Protection
**Implementation**: `shared/middleware/csrf.middleware.ts`

**Test Scenarios**:
- Token generation
- Token validation
- Token expiration
- Double-submit cookie pattern

---

### 7. Metrics & Monitoring
**Implementation**: `shared/metrics/metrics.factory.ts`  
**Backend**: Prometheus

**Test Scenarios**:
- Counter metrics
- Histogram metrics
- Gauge metrics
- Custom metrics
- Metric labels
- Metric export

---

### 8. Distributed Tracing
**Implementation**: `shared/tracing/openTelemetry.ts`  
**Backend**: Jaeger

**Test Scenarios**:
- Span creation
- Span propagation
- Trace context
- Distributed trace correlation
- Performance tracking

---

### 9. Audit Logging
**Implementation**: `shared/audit/audit.service.ts`

**Test Scenarios**:
- Audit log creation
- User action tracking
- System event logging
- Audit log querying
- Compliance reporting

---

### 10. PII Encryption
**Implementation**: `shared/encryption/pii-encryption.service.ts`

**Test Scenarios**:
- Data encryption
- Data decryption
- Key rotation
- HMAC generation
- Encrypted data storage

---

### 11. Internationalization (i18n)
**Implementation**: `shared/i18n/i18n.ts`

**Test Scenarios**:
- Language detection
- Translation loading
- Locale switching
- Fallback language
- Pluralization
- Date/time formatting

---

## Third-Party API Integrations

### 1. Google Auth
**Service**: Auth Service  
**Integration Type**: OAuth 2.0

**Test Scenarios**:
- OAuth flow
- Token validation
- User info retrieval
- Token refresh

---

### 2. Maps Service Integration
**Service**: Maps Service, Logistics Service  
**Integration Type**: REST API

**Test Scenarios**:
- Geocoding
- Reverse geocoding
- Distance calculation
- Route optimization
- Location tracking

---

## Saga Orchestration Integrations

### Order Fulfillment Saga
**Services Involved**: Order, Payment, Inventory, Logistics, Commission

**Steps**:
1. Create Order
2. Reserve Inventory
3. Process Payment
4. Assign Delivery
5. Calculate Commission

**Compensation Steps**:
1. Cancel Commission
2. Cancel Delivery
3. Refund Payment
4. Release Inventory
5. Cancel Order

**Test Scenarios**:
- Happy path completion
- Payment failure compensation
- Inventory unavailable compensation
- Delivery assignment failure
- Partial compensation
- Saga recovery after crash

---

### Payment Processing Saga
**Services Involved**: Payment, Wallet, Order

**Steps**:
1. Validate Payment Method
2. Freeze Wallet Funds (if wallet payment)
3. Process Payment
4. Update Order Status

**Compensation Steps**:
1. Revert Order Status
2. Refund Payment
3. Unfreeze Wallet Funds

---

### Refund Saga
**Services Involved**: Payment, Wallet, Order, Inventory

**Steps**:
1. Validate Refund Request
2. Process Refund
3. Credit Wallet (if applicable)
4. Release Inventory
5. Update Order Status

**Compensation Steps**:
1. Revert Order Status
2. Re-reserve Inventory
3. Debit Wallet
4. Reverse Refund

---

### COD Order Saga
**Services Involved**: Order, Wallet, Logistics, Payment

**Steps**:
1. Create Order
2. Freeze COD Commitment
3. Assign Delivery
4. Confirm Delivery
5. Process COD Payment
6. Release Commitment

**Compensation Steps**:
1. Reverse Payment
2. Cancel Delivery
3. Release Commitment
4. Cancel Order

---

## Integration Test Priorities

### Priority 1 (Critical Path)
1. Order creation → Payment → Inventory → Delivery flow
2. User registration → Auth → Email verification
3. Payment gateway integration (PaymentGateway)
4. Wallet operations (credit/debit/freeze)
5. Outbox pattern event publishing
6. Saga orchestration (Order Fulfillment)

### Priority 2 (High Impact)
1. SMS/Email notifications
2. Inventory reservation and release
3. Commission calculation
4. Refund processing
5. Redis caching and locking
6. Database transactions and rollbacks

### Priority 3 (Medium Impact)
1. Analytics event tracking
2. Support ticket creation
3. Training module completion
4. Campaign activation
5. Community post creation
6. File upload to S3

### Priority 4 (Low Impact)
1. Metrics collection
2. Audit logging
3. i18n translations
4. CSRF protection
5. Rate limiting
6. Distributed tracing

---

## Test Data Requirements

### Users
- Buyers (with/without wallet)
- Sellers (verified/unverified)
- Couriers (active/inactive)
- Enablers (different tiers)
- Support agents

### Products
- Physical products
- Digital products
- Products with variants
- Out-of-stock products
- Products with campaigns

### Orders
- COD orders
- Wallet payment orders
- Card payment orders
- Cancelled orders
- Completed orders

### Payments
- Successful payments
- Failed payments
- Pending payments
- Refunded payments

---

## Environment Setup for Integration Tests

### Required Services
```yaml
services:
  - PostgreSQL (test database)
  - Redis (test instance)
  - Jaeger (optional, for tracing)
  - Prometheus (optional, for metrics)
```

### Test Containers
```typescript
// Use @testcontainers/postgresql for isolated DB tests
// Use ioredis-mock for Redis tests
// Use nock for HTTP mocking
```

### Mock Services
- Payment gateway (PaymentGateway mock)
- SMS gateway (Africa's Talking mock)
- Email service (SMTP mock)
- Firebase (FCM mock)
- S3 (localstack or mock)

### Credential Safety Gate
- Jest global setup auto-loads `.env.test` from repository root when present.
- Test startup fails fast if production-like credentials/endpoints are detected for:
  - PaymentGateway
  - Africa's Talking
  - SMTP
  - Firebase
  - Sentry
  - AWS
  - Database/Redis URLs
- Use `.env.test.example` as the canonical template for test-only and sandbox values.

---

## Integration Test Patterns

### 1. Service-to-Service Integration
```typescript
// Test direct API calls between services
// Verify request/response contracts
// Test error handling
```

### 2. Event-Driven Integration
```typescript
// Test event publishing
// Test event consumption
// Test event ordering
// Test idempotency
```

### 3. Database Integration
```typescript
// Test CRUD operations
// Test transactions
// Test concurrent access
// Test optimistic locking
```

### 4. External API Integration
```typescript
// Test API calls with mocks
// Test retry logic
// Test timeout handling
// Test circuit breaker
```

### 5. Saga Integration
```typescript
// Test saga execution
// Test compensation
// Test recovery
// Test dead letter handling
```

---

## Test Execution Strategy

### Unit Tests
- Run in isolation
- Mock all external dependencies
- Fast execution

### Integration Tests
- Use test containers
- Real database/Redis
- Mock external APIs
- Slower execution

### E2E Tests
- Full system integration
- Real external services (staging)
- Slowest execution

---

## Continuous Integration

### Test Stages
1. **Unit Tests** - Every commit
2. **Integration Tests** - Every PR
3. **E2E Tests** - Before deployment
4. **Performance Tests** - Weekly
5. **Security Tests** - Weekly

### Test Coverage Goals
- Unit Tests: 80%+
- Integration Tests: 60%+
- E2E Tests: Critical paths only

---

## Constitution Compliance Gate

This catalog is enforced together with:
- `architecture_constitution.md`
- `testing-constitution.md`

### Repository Commands
- Audit mode (report only): `npm run test:integration:audit`
- TypeScript guard (integration tests only): `npm run test:integration:typecheck`
- Enforce mode (CI/PR blocking): `npm run test:integration:enforce`

### Enforced Rules (Automated)
1. Integration tests must live in constitutional locations:
   - `src/infrastructure/**`
   - `src/api/routes/**`
   - `src/application/sagas/**`
   - `**/__tests__/integration/**` or `**/tests/integration/**`
2. Integration tests must not be placed in `domain/**`.
3. Integration tests must not mock internal module implementations.
4. Integration tests must contain explicit assertions.
5. Every service in `services/*` must have at least one integration test.
6. Priority 1 catalog flows must be covered:
   - Order -> Payment -> Inventory -> Delivery
   - User/Auth verification flow
   - PaymentGateway integration
   - Wallet operations
   - Outbox pattern
   - Order fulfillment saga

### Generated Reports
- JSON: `reports/testing/integration-constitution-report.json`
- Markdown: `reports/testing/INTEGRATION_CONSTITUTION_GAP_REPORT.md`

---

## Notes

- All integration tests should be idempotent
- Use unique test data per test run
- Clean up test data after each test
- Use transaction rollback where possible
- Mock external services to avoid rate limits
- Use test-specific environment variables
- Implement proper test isolation
- Use factories for test data generation

---

**End of Integration Test Catalog**


