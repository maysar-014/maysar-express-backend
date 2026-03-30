# Maysar Express Backend - E2E Test Catalog

**Version**: 1.0  
**Last Updated**: 2026-03-08  
**Purpose**: Comprehensive list of end-to-end test scenarios

---

## Table of Contents
1. [User Journeys](#user-journeys)
2. [Business Flows](#business-flows)
3. [Critical Paths](#critical-paths)
4. [Error Scenarios](#error-scenarios)
5. [Performance Scenarios](#performance-scenarios)

---

## User Journeys

### 1. Buyer Journey - Standard Purchase
**Flow**: Registration → Browse → Add to Cart → Checkout → Payment → Delivery

**Steps**:
1. Register new buyer account
2. Verify email
3. Browse products by category
4. Search for specific product
5. View product details
6. Add product to cart
7. Update cart quantity
8. Proceed to checkout
9. Add shipping address
10. Select payment method (Card/Wallet/COD)
11. Complete payment
12. Receive order confirmation
13. Track order status
14. Receive delivery
15. Rate order

**Expected Results**:
- User created in database
- Email verification sent
- Products displayed correctly
- Cart persists across sessions
- Payment processed successfully
- Order status updates in real-time
- Notifications sent at each stage
- Commission calculated for seller

---

### 2. Buyer Journey - COD Purchase
**Flow**: Login → Browse → Checkout → COD Payment → Delivery Confirmation

**Steps**:
1. Login as existing buyer
2. Check COD eligibility
3. Browse products
4. Add to cart
5. Select COD payment
6. Wallet commitment frozen
7. Order assigned to courier
8. Courier picks up order
9. Courier delivers order
10. Buyer confirms delivery with OTP
11. COD payment processed
12. Wallet commitment released

**Expected Results**:
- COD eligibility checked
- Wallet funds frozen
- Delivery OTP generated
- GPS proof captured
- Payment settled after delivery
- Commitment released

---

### 3. Seller Journey - Product Listing
**Flow**: Registration → KYC → Product Upload → Order Management

**Steps**:
1. Register as seller
2. Submit business documents
3. Complete KYC verification
4. Create product listing
5. Upload product images
6. Set pricing and inventory
7. Publish product
8. Receive order notification
9. Confirm order
10. Update order status
11. Receive payment settlement
12. View analytics dashboard

**Expected Results**:
- Seller account created
- KYC documents uploaded
- Product published to catalog
- Buy box algorithm applied
- Order notifications sent
- Payment settled correctly
- Analytics updated

---

### 4. Courier Journey - Delivery
**Flow**: Login → Accept Delivery → Pickup → Deliver → Confirm

**Steps**:
1. Login as courier
2. View available deliveries
3. Accept delivery assignment
4. Navigate to pickup location
5. Update location in real-time
6. Confirm pickup
7. Navigate to delivery location
8. Attempt delivery
9. Collect COD payment (if applicable)
10. Confirm delivery with OTP
11. Capture GPS proof
12. Complete delivery
13. View earnings

**Expected Results**:
- Delivery assigned
- Location tracked
- Pickup confirmed
- COD collected
- OTP verified
- GPS proof stored
- Earnings calculated

---

### 5. Enabler Journey - Product Promotion
**Flow**: Registration → Approval → List Products → Earn Commission

**Steps**:
1. Register as enabler
2. Submit business details
3. Get approved
4. Browse seller products
5. Create product listing
6. Share product link
7. Customer purchases via link
8. Order tracked to enabler
9. Commission calculated
10. Commission paid out
11. View performance metrics

**Expected Results**:
- Enabler profile created
- Tier assigned
- Product listings created
- Orders attributed correctly
- Commission calculated with bonuses
- Payout processed
- Analytics tracked

---

## Business Flows

### 1. Order Fulfillment Flow
**Services**: Order → Payment → Inventory → Logistics → Commission

**Steps**:
1. Order created
2. Inventory reserved
3. Payment processed
4. Seller notified
5. Seller confirms
6. Delivery assigned
7. Courier picks up
8. Order in transit
9. Order delivered
10. Payment settled
11. Commission calculated
12. Order completed

**Saga Steps**:
- CreateOrder
- ReserveInventory
- ProcessPayment
- AssignDelivery
- CalculateCommission

**Compensation Tested**:
- Payment failure → Release inventory → Cancel order
- Inventory unavailable → Refund payment → Cancel order
- Delivery failure → Refund → Release inventory

---

### 2. Refund Flow
**Services**: Order → Payment → Wallet → Inventory

**Steps**:
1. Customer requests refund
2. Seller approves refund
3. Refund initiated
4. Payment gateway processes refund
5. Wallet credited (if applicable)
6. Inventory released
7. Order status updated
8. Customer notified
9. Commission reversed

**Expected Results**:
- Refund processed
- Wallet credited
- Inventory available
- Commission adjusted

---

### 3. Training & Certification Flow
**Services**: Training → User → Compliance

**Steps**:
1. User enrolls in training
2. Training module started
3. Progress tracked
4. Assessment completed
5. Score calculated
6. Certificate issued (if passed)
7. Eligibility updated
8. Badge awarded
9. Leaderboard updated

**Expected Results**:
- Training record created
- Progress saved
- Certificate generated
- Eligibility checked
- Badge awarded

---

### 4. Campaign Activation Flow
**Services**: Campaign → Catalog → Pricing

**Steps**:
1. Seller creates campaign
2. Campaign configured
3. Products selected
4. Pricing rules applied
5. Campaign scheduled
6. Campaign activated
7. Product prices updated
8. Buy box recalculated
9. Campaign metrics tracked
10. Campaign ends
11. Prices reverted

**Expected Results**:
- Campaign created
- Prices updated
- Buy box adjusted
- Metrics collected
- Prices reverted

---

### 5. KYC Verification Flow
**Services**: Compliance → User → Business Registry

**Steps**:
1. User submits KYC documents
2. Documents uploaded to S3
3. AML check performed
4. Admin reviews documents
5. KYC approved/rejected
6. User notified
7. Account status updated
8. Business verified (if applicable)

**Expected Results**:
- Documents stored
- AML check completed
- Status updated
- Notifications sent

---

## Critical Paths

### 1. Payment Processing
**Scenario**: End-to-end payment with Pesapal

**Steps**:
1. Initiate payment
2. Redirect to Pesapal
3. Complete payment
4. Receive IPN callback
5. Verify payment
6. Update order status
7. Send confirmation

**Test Cases**:
- Successful payment
- Failed payment
- Timeout payment
- Duplicate IPN
- Invalid signature

---

### 2. Inventory Management
**Scenario**: Concurrent inventory operations

**Steps**:
1. Multiple orders for same product
2. Inventory reservations
3. Stock updates
4. Low stock alerts
5. Reorder triggers

**Test Cases**:
- Race conditions
- Overselling prevention
- Reservation expiry
- Stock reconciliation

---

### 3. Wallet Operations
**Scenario**: Complex wallet transactions

**Steps**:
1. Credit wallet
2. Freeze funds
3. Debit frozen funds
4. Unfreeze remaining
5. Transfer between wallets
6. Refund to wallet

**Test Cases**:
- Insufficient balance
- Concurrent transactions
- Optimistic locking
- Transaction rollback

---

### 4. Saga Recovery
**Scenario**: Saga failure and recovery

**Steps**:
1. Start order saga
2. Simulate service failure
3. Saga compensation triggered
4. Verify rollback
5. Resume saga
6. Complete successfully

**Test Cases**:
- Payment failure compensation
- Inventory failure compensation
- Partial compensation
- Dead letter routing

---

### 5. Event Processing
**Scenario**: Event-driven workflow

**Steps**:
1. Publish domain event
2. Multiple subscribers consume
3. Outbox processor publishes
4. Event handlers execute
5. Side effects triggered
6. Audit log created

**Test Cases**:
- Event ordering
- Idempotency
- Retry mechanism
- Dead letter queue

---

## Error Scenarios

### 1. Payment Gateway Timeout
**Steps**:
1. Initiate payment
2. Gateway times out
3. Retry mechanism triggered
4. Circuit breaker opens
5. Fallback executed
6. User notified

---

### 2. Database Connection Loss
**Steps**:
1. Start transaction
2. Connection lost
3. Transaction rolled back
4. Connection pool recovers
5. Retry successful

---

### 3. Redis Cache Failure
**Steps**:
1. Cache miss
2. Database query
3. Cache update fails
4. Request completes
5. Cache recovers
6. Data synced

---

### 4. Service Unavailable
**Steps**:
1. Call downstream service
2. Service unavailable
3. Circuit breaker opens
4. Fallback response
5. Service recovers
6. Circuit breaker closes

---

### 5. Concurrent Order Cancellation
**Steps**:
1. Order created
2. Payment processing
3. User cancels order
4. Race condition handled
5. Correct state achieved

---

## Performance Scenarios

### 1. High Load Order Processing
**Metrics**:
- 1000 orders/minute
- Response time < 2s
- 99% success rate

---

### 2. Concurrent Inventory Updates
**Metrics**:
- 100 concurrent updates
- No overselling
- Consistent state

---

### 3. Bulk Notification Sending
**Metrics**:
- 10,000 notifications
- Delivery rate > 95%
- Processing time < 5min

---

### 4. Search Performance
**Metrics**:
- 1000 concurrent searches
- Response time < 500ms
- Relevance score > 0.8

---

### 5. Analytics Dashboard Load
**Metrics**:
- Real-time metrics
- Load time < 3s
- Data accuracy 100%

---

## Test Execution Matrix

| Scenario | Priority | Frequency | Duration | Dependencies |
|----------|----------|-----------|----------|--------------|
| Buyer Purchase | P0 | Every deploy | 5min | All services |
| COD Order | P0 | Every deploy | 7min | Order, Payment, Wallet, Logistics |
| Seller Listing | P1 | Daily | 4min | Catalog, Auth, Compliance |
| Refund Flow | P1 | Daily | 6min | Payment, Wallet, Order |
| Campaign | P2 | Weekly | 3min | Campaign, Catalog |
| Training | P2 | Weekly | 5min | Training, User |
| Payment Timeout | P1 | Daily | 2min | Payment |
| Saga Recovery | P1 | Daily | 8min | All saga services |
| High Load | P2 | Weekly | 30min | All services |

---

## Test Data Setup

### Users
```typescript
- 10 buyers (various states)
- 5 sellers (verified)
- 3 couriers (active)
- 2 enablers (different tiers)
- 1 admin
```

### Products
```typescript
- 50 products (various categories)
- 10 with campaigns
- 5 low stock
- 3 out of stock
```

### Orders
```typescript
- 20 completed orders
- 5 pending orders
- 3 cancelled orders
```

---

## Environment Requirements

### Services
- All required modules running
- PostgreSQL database
- Redis cache
- Jaeger tracing
- Prometheus metrics

### External Services
- Pesapal sandbox
- Africa's Talking test account
- SMTP test server
- Firebase test project
- Railway volumes (file storage)

### Test Tools
- Supertest for API calls
- Playwright for UI (if applicable)
- K6 for load testing
- Postman for manual testing

---

## Success Criteria

### Functional
- All critical paths pass
- Error scenarios handled
- Data consistency maintained
- Notifications delivered

### Performance
- Response times within SLA
- Throughput meets requirements
- No memory leaks
- Graceful degradation

### Reliability
- 99.9% uptime
- Automatic recovery
- No data loss
- Audit trail complete

---

## Test Execution Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific journey
npm run test:e2e -- --testNamePattern="Buyer Journey"

# Run critical paths only
npm run test:e2e -- --testPathPattern="critical"

# Run with coverage
npm run test:e2e:coverage

# Run performance tests
npm run test:performance
```

---

## CI/CD Integration

### Pre-deployment
1. Run smoke tests (5 min)
2. Run critical paths (15 min)
3. Run full E2E suite (30 min)

### Post-deployment
1. Health checks
2. Smoke tests
3. Monitor metrics

### Rollback Triggers
- E2E failure rate > 5%
- Response time > 5s
- Error rate > 1%

---

**End of E2E Test Catalog**

