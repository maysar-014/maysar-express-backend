# Inventory Service - Sagas

## StockReservationSaga
**Purpose**: Atomically reserves stock with Redlock protection and TTL expiry

**Steps**:
1. **Acquire Redlock**
   - Lock key: `inventory:lock:{productVariantId}`
   - TTL: 5s with 3s renewal
   - Timeout: 5s
   - Compensation: Release lock on failure
   - **Failure Handling**: Retry with exponential backoff (Phase 4)

2. **Check Stock Availability**
   - Query: `SELECT availableStock FROM Inventory_Stock WHERE productVariantId = ? FOR UPDATE`
   - Timeout: 2s
   - Compensation: Release Redlock
   - **Validation**: `availableStock >= requestedQuantity`

3. **Decrement Available Stock**
   - Redis: `INCRBY inventory:stock:{productVariantId} -{quantity}` (atomic)
   - Database: `UPDATE Inventory_Stock SET availableStock = availableStock - ? WHERE productVariantId = ?`
   - Timeout: 5s
   - Compensation: Increment stock, release Redlock

4. **Create Reservation Record**
   - Insert into `Inventory_Reservation` with `expiresAt = NOW() + 15 minutes`
   - Timeout: 5s
   - Compensation: Delete reservation, increment stock, release Redlock

5. **Emit StockReserved Event**
   - Publish to outbox
   - Timeout: 2s
   - Compensation: Delete reservation, increment stock, release Redlock

6. **Release Redlock**
   - Unlock: `inventory:lock:{productVariantId}`
   - Timeout: 1s
   - Compensation: None (lock expires automatically)

**State Persistence**: `Inventory_SagaLog` table  
**Recovery**: Saga recovery worker polls every 60s  
**Dead-Letter**: After 5 retries → `Inventory_SagaDeadLetter`

**Idempotency**: Reservation keyed by `reserve-{orderId}-{productVariantId}`

---

## ReservationExpiryCleanupSaga
**Purpose**: Expires stale reservations and restores available stock

**Trigger**: Cron job every 5 minutes

**Steps**:
1. **Query Expired Reservations**
   - Query: `SELECT * FROM Inventory_Reservation WHERE expiresAt < NOW() AND status = 'ACTIVE'`
   - Timeout: 10s
   - Batch size: 100 reservations

2. **For Each Expired Reservation**:
   - **Acquire Redlock**: `inventory:lock:{productVariantId}`
   - **Increment Available Stock**: Redis + Database
   - **Mark Reservation Expired**: `UPDATE Inventory_Reservation SET status = 'EXPIRED'`
   - **Emit ReservationExpired Event**: Publish to outbox
   - **Release Redlock**

3. **Emit Batch Completion Metric**
   - Prometheus: `inventory_reservations_expired_total`

**Failure Handling**: Individual reservation failures logged, batch continues

---

## StockCommitSaga
**Purpose**: Permanently allocates reserved stock to completed order

**Steps**:
1. **Validate Reservation**
   - Query: `SELECT * FROM Inventory_Reservation WHERE id = ? AND status = 'ACTIVE'`
   - Timeout: 2s
   - Compensation: None (read-only)

2. **Mark Reservation Committed**
   - Update: `UPDATE Inventory_Reservation SET status = 'COMMITTED', committedAt = NOW()`
   - Timeout: 5s
   - Compensation: None (idempotent)

3. **Emit StockCommitted Event**
   - Publish to outbox
   - Timeout: 2s
   - Compensation: None (idempotent)

**Idempotency**: Commit keyed by `commit-{reservationId}`

---

## StockReleaseSaga
**Purpose**: Releases reservation and restores available stock (order cancellation)

**Steps**:
1. **Validate Reservation**
   - Query: `SELECT * FROM Inventory_Reservation WHERE id = ? AND status = 'ACTIVE'`
   - Timeout: 2s
   - Compensation: None (read-only)

2. **Acquire Redlock**
   - Lock key: `inventory:lock:{productVariantId}`
   - TTL: 5s
   - Timeout: 5s

3. **Increment Available Stock**
   - Redis: `INCRBY inventory:stock:{productVariantId} +{quantity}`
   - Database: `UPDATE Inventory_Stock SET availableStock = availableStock + ?`
   - Timeout: 5s
   - Compensation: Decrement stock, release Redlock

4. **Mark Reservation Released**
   - Update: `UPDATE Inventory_Reservation SET status = 'RELEASED', releasedAt = NOW()`
   - Timeout: 5s
   - Compensation: Decrement stock, release Redlock

5. **Emit StockReleased Event**
   - Publish to outbox
   - Timeout: 2s
   - Compensation: None (idempotent)

6. **Release Redlock**

**Idempotency**: Release keyed by `release-{reservationId}`

---

## Common Patterns

### Redlock Distributed Lock (Phase 4)
- **Lock Key**: `inventory:lock:{productVariantId}`
- **TTL**: 5s with 3s renewal
- **Retry**: 3 attempts with 100ms backoff
- **Failure**: `RedlockAcquisitionError` → retry saga

### Redis + Database Dual Write
- **Redis**: Fast cache for availability checks
- **Database**: Source of truth for reservations
- **Consistency**: Redis updated first, database second (eventual consistency acceptable)

### Idempotency Strategy (Phase 2)
- **Reservation Key**: `reserve-{orderId}-{productVariantId}`
- **Duplicate Detection**: Check `Inventory_Reservation` table
- **Response**: Return existing reservation (HTTP 200)

### Retry Policy (Phase 3)
- **Redlock timeout**: 3 retries with 100ms backoff
- **Database timeout**: 5 retries with exponential backoff
- **Dead-letter threshold**: 5 total retries
