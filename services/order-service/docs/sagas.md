# Order Service - Sagas

## OrderCoordinatorSaga
**Purpose**: Top-level orchestration of order creation through completion

**Steps**:
1. Validate order request
2. Create order record (PENDING state)
3. Trigger OrderFulfillmentSaga
4. Monitor saga completion
5. Finalize order state

**Compensation**: Cancel order, release all resources
**Idempotency**: Order creation keyed by `clientRequestId`
**Retry Policy**: Exponential backoff (Phase 3)

---

## OrderFulfillmentSaga
**Purpose**: Coordinates inventory, payment, and logistics for order fulfillment

**Steps**:
1. **StockReservation**: Call inventory-service `POST /reservations`
   - Compensation: `DELETE /reservations/{id}`
   - Timeout: 30s
   - Idempotency key: `order-{orderId}-reserve`

2. **PaymentCapture**: Call payment-service `POST /payments/capture`
   - Compensation: `POST /payments/{id}/refund`
   - Timeout: 60s (external gateway)
   - Idempotency key: `order-{orderId}-payment`

3. **LogisticsAssignment**: Call logistics-service `POST /deliveries`
   - Compensation: `DELETE /deliveries/{id}`
   - Timeout: 15s
   - Idempotency key: `order-{orderId}-delivery`

4. **CommissionCalculation**: Call commission-service `POST /calculations`
   - Compensation: None (read-only calculation)
   - Timeout: 10s

**State Persistence**: `Order_SagaLog` table
**Recovery**: `SagaRecoveryWorker` polls every 60s for stalled sagas (Phase 3)
**Dead-Letter**: After 5 retries → `Order_SagaDeadLetter` (Phase 3)

---

## PaymentSaga
**Purpose**: Handles payment processing with fraud checks and COD pre-auth

**Steps**:
1. Fraud assessment (payment-service)
2. COD wallet lock (wallet-service) if `codEnabled=true`
3. Payment gateway capture
4. Update order payment status

**Compensation**: Void payment, release wallet lock
**Validation Callbacks**: `validatePaymentCapture`, `validateWalletLock` (Phase 3)

---

## SettlementSaga
**Purpose**: Distributes funds to sellers, enablers, and platform after delivery

**Steps**:
1. Verify delivery completion
2. Calculate commission breakdown (8% seller, 15-20% enabler)
3. Debit customer wallet (COD) or confirm payment
4. Credit seller wallet
5. Credit enabler wallet (if applicable)
6. Record platform revenue

**Compensation**: Reverse all wallet transactions
**Concurrency**: Redlock on wallet operations (Phase 4)

---

## TrainingSaga
**Purpose**: Coordinates enabler training task lifecycle

**Steps**:
1. Assign training task to enabler
2. Track completion milestones
3. Verify quality standards
4. Release training commission (15% on assignment, 20% on completion)

**Compensation**: Cancel task, void commission
**Idempotency**: Task assignment keyed by `trainingId`

---

## Common Patterns

### Idempotency Strategy
All saga steps use `EventIdempotency.withIdempotency(key, handler)` (Phase 2)

### Retry Policy
- Initial delay: 1s
- Max delay: 16s
- Backoff multiplier: 2x
- Max retries: 5

### Dead-Letter Routing
Failed sagas after max retries → `Order_SagaDeadLetter` table with:
- Original saga state
- Failure reason
- Retry history
- Manual intervention flag
