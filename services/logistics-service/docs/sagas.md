# Logistics Service - Sagas

## DeliverySaga
**Purpose**: Orchestrates courier assignment and delivery lifecycle

**Steps**:
1. **Create Delivery Record**
   - Insert into `Logistics_Delivery` with PENDING state
   - Timeout: 5s
   - Compensation: Delete delivery record
   - Idempotency key: `delivery-{orderId}`

2. **Find Available Courier**
   - Query: `SELECT * FROM Courier WHERE zone = ? AND available = true ORDER BY reputation DESC LIMIT 10`
   - Timeout: 10s
   - Compensation: Delete delivery record
   - **Fallback**: If no courier available, queue for manual assignment

3. **Assign Courier**
   - Insert into `Logistics_CourierAssignment`
   - Update courier availability: `available = false`
   - Timeout: 5s
   - Compensation: Delete assignment, restore courier availability, delete delivery

4. **Emit CourierAssigned Event**
   - Publish to outbox
   - Timeout: 2s
   - Compensation: Delete assignment, restore courier, delete delivery

5. **Monitor Delivery Progress**
   - Poll courier status updates (mobile app)
   - Timeout: 24h (delivery window)
   - Compensation: Trigger `DeliveryFailed` if window exceeded

6. **On Delivery Completion**:
   - Update delivery state to COMPLETED
   - Emit `DeliveryCompleted` event
   - If COD order: Emit `CODCollected` event

**State Persistence**: `Logistics_SagaLog` table  
**Recovery**: Saga recovery worker polls every 60s  
**Dead-Letter**: After 5 retries → `Logistics_SagaDeadLetter`

---

## CODDeliveryConfirmationSaga
**Purpose**: Verifies COD collection and triggers wallet settlement

**Steps**:
1. **Verify Delivery Completion**
   - Check: `Logistics_Delivery.state = 'COMPLETED'`
   - Timeout: 2s
   - Compensation: None (read-only)

2. **Verify COD Collection**
   - Check: Courier confirmed cash collection via mobile app
   - Timeout: 5s
   - Compensation: None (read-only)
   - **Validation**: Collected amount matches order total

3. **Emit CODCollected Event**
   - Publish to outbox
   - Timeout: 2s
   - Compensation: None (idempotent)
   - **Trigger**: Wallet-service `CODSettlementSaga`

4. **Update Order COD Reputation**
   - Call order-service: `POST /orders/{id}/cod-reputation`
   - Timeout: 10s
   - Compensation: None (idempotent)

**Idempotency**: COD collection keyed by `cod-{deliveryId}`

---

## DeliveryFailureSaga
**Purpose**: Handles delivery failures and triggers compensation

**Steps**:
1. **Record Failure Reason**
   - Update `Logistics_Delivery.state = 'FAILED'`
   - Store failure reason (customer unavailable, address incorrect, etc.)
   - Timeout: 5s

2. **Emit DeliveryFailed Event**
   - Publish to outbox
   - Timeout: 2s
   - **Trigger**: Order-service compensation (refund, cancel)

3. **Release Courier Assignment**
   - Update courier availability: `available = true`
   - Timeout: 5s

4. **Determine Retry or Return**
   - If retryable (customer unavailable): Schedule retry in 4h
   - If not retryable (address incorrect): Trigger `ReturnInitiated` event

**Compensation**: If delivery fails, trigger return saga and release inventory

---

## ReturnSaga
**Purpose**: Handles product returns and restocking

**Steps**:
1. **Create Return Record**
   - Insert into `Logistics_Return`
   - Timeout: 5s

2. **Assign Return Courier**
   - Find available courier in seller zone
   - Timeout: 10s
   - Compensation: Delete return record

3. **Emit ReturnInitiated Event**
   - Publish to outbox
   - Timeout: 2s
   - **Trigger**: Order-service refund flow, inventory-service restock

4. **On Return Completion**:
   - Update return state to COMPLETED
   - Emit `ReturnCompleted` event

**Idempotency**: Return keyed by `return-{orderId}`

---

## Common Patterns

### Idempotency Strategy (Phase 2)
- **Delivery Creation**: `delivery-{orderId}`
- **Courier Assignment**: `assign-{deliveryId}`
- **COD Collection**: `cod-{deliveryId}`
- **Return Initiation**: `return-{orderId}`

### Retry Policy (Phase 3)
- **Courier Assignment**: 5 retries with exponential backoff
- **Delivery Monitoring**: 24h timeout, then trigger failure
- **COD Verification**: 3 retries (critical for settlement)

### Compensation Validation (Phase 3)
- `validateCourierAvailability`: Ensures courier not already assigned
- `validateDeliveryWindow`: Ensures delivery within 24h window
- `validateCODAmount`: Ensures collected amount matches order total
