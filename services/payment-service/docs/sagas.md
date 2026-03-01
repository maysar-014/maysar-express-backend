# Payment Service - Sagas

## PaymentProcessingSaga
**Purpose**: Orchestrates payment capture with fraud checks and COD pre-authorization

**Steps**:
1. **Fraud Assessment**
   - Call internal fraud engine: `POST /fraud/assess`
   - Timeout: 10s
   - Compensation: None (read-only)
   - Idempotency key: `fraud-{paymentId}`
   - **Decision Logic**:
     - Risk score < 30: Auto-approve
     - Risk score 30-70: Manual review queue
     - Risk score > 70: Auto-reject

2. **COD Pre-Authorization** (if `method=COD`)
   - Call wallet-service: `POST /wallets/{customerId}/cod-lock`
   - Timeout: 15s
   - Compensation: `DELETE /wallets/{customerId}/cod-lock/{lockId}`
   - Idempotency key: `cod-lock-{orderId}`
   - **Failure Handling**: If lock fails, reject payment immediately

3. **Payment Gateway Capture**
   - Call external gateway: `POST /gateway/capture`
   - Timeout: 60s (external dependency)
   - Compensation: `POST /gateway/void` (if within void window)
   - Idempotency key: `gateway-{paymentId}`
   - **Circuit Breaker**: Fail fast after 5 consecutive gateway timeouts (Phase 7)

4. **Payment Record Update**
   - Update `Payment_Payment` with `version` increment (optimistic locking - Phase 4)
   - Emit `PaymentCaptured` event
   - Compensation: Emit `PaymentFailed` event

**State Persistence**: `Payment_SagaLog` table  
**Recovery**: Saga recovery worker polls every 60s  
**Dead-Letter**: After 3 retries → `Payment_SagaDeadLetter`

**Validation Callbacks** (Phase 3):
- `validateFraudScore`: Ensures risk score within acceptable range
- `validateWalletLock`: Confirms COD lock acquired before gateway call
- `validateGatewayResponse`: Parses gateway response, handles partial captures

---

## RefundSaga
**Purpose**: Processes refunds with gateway coordination and wallet credit

**Steps**:
1. **Validate Refund Eligibility**
   - Check payment state (must be CAPTURED or SETTLED)
   - Verify refund amount ≤ captured amount
   - Timeout: 5s

2. **Gateway Refund**
   - Call external gateway: `POST /gateway/refund`
   - Timeout: 60s
   - Compensation: Manual reconciliation (gateway refunds are not reversible)
   - Idempotency key: `refund-{paymentId}-{timestamp}`

3. **Wallet Credit** (if COD order)
   - Call wallet-service: `POST /wallets/{customerId}/credit`
   - Timeout: 15s
   - Compensation: `POST /wallets/{customerId}/debit` (reversal)

4. **Update Payment Record**
   - Set payment state to REFUNDED
   - Emit `RefundCompleted` event

**Compensation**: Gateway refunds cannot be reversed; manual reconciliation required

---

## Common Patterns

### Optimistic Locking
All payment updates use `version` field:
```sql
UPDATE Payment_Payment 
SET status = 'CAPTURED', version = version + 1 
WHERE id = ? AND version = ?
```
Conflict → `OptimisticLockError` → retry with fresh version (Phase 4)

### Idempotency Strategy
- `EventIdempotency.withIdempotency(key, handler)` (Phase 2)
- Duplicate payment capture returns existing record (HTTP 200)

### Retry Policy
- Gateway calls: 3 retries with exponential backoff
- Internal calls: 5 retries
- Circuit breaker: Open after 5 consecutive failures (Phase 7)

### Dead-Letter Routing
Failed sagas → `Payment_SagaDeadLetter` with:
- Gateway error codes
- Fraud assessment details
- Retry history
- Manual review flag
