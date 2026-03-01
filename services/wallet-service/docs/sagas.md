# Wallet Service - Sagas

## WalletTransactionSaga
**Purpose**: Ensures atomic debit/credit operations with Redlock and optimistic locking

**Steps**:
1. **Acquire Redlock**
   - Lock key: `wallet:lock:{walletId}`
   - TTL: 5s with 3s renewal
   - Timeout: 5s
   - Compensation: Release lock on failure
   - **Failure Handling**: Retry with exponential backoff (Phase 4)

2. **Fetch Wallet with Version**
   - Query: `SELECT * FROM Wallet_Wallet WHERE id = ? FOR UPDATE`
   - Timeout: 2s
   - Compensation: Release Redlock

3. **Validate Balance** (for debits)
   - Check: `availableBalance >= debitAmount`
   - Timeout: N/A (in-memory)
   - Compensation: Release Redlock, return insufficient balance error

4. **Update Wallet Balance**
   - Query: `UPDATE Wallet_Wallet SET balance = ?, version = version + 1 WHERE id = ? AND version = ?`
   - Timeout: 5s
   - Compensation: Rollback transaction, release Redlock
   - **Optimistic Lock Conflict**: Retry with fresh version (Phase 4)

5. **Insert Transaction Record**
   - Insert into `Wallet_Transaction` (immutable log)
   - Timeout: 5s
   - Compensation: Rollback transaction, release Redlock

6. **Emit Event**
   - Publish `WalletDebited` or `WalletCredited` to outbox
   - Timeout: 2s
   - Compensation: Rollback transaction, release Redlock

7. **Release Redlock**
   - Unlock: `wallet:lock:{walletId}`
   - Timeout: 1s
   - Compensation: None (lock expires automatically)

**State Persistence**: `Wallet_SagaLog` table  
**Recovery**: Saga recovery worker polls every 60s  
**Dead-Letter**: After 5 retries → `Wallet_SagaDeadLetter`

---

## CODSettlementSaga
**Purpose**: Distributes funds to sellers, enablers, and platform after COD delivery

**Steps**:
1. **Verify Delivery Completion**
   - Check: `DeliveryCompleted` event received
   - Timeout: N/A (event-driven)
   - Compensation: None (read-only)

2. **Calculate Commission Breakdown**
   - Call commission-service: `POST /calculations`
   - Timeout: 10s
   - Compensation: None (read-only)
   - **Breakdown**:
     - Seller: 92% of order value (after 8% commission)
     - Enabler: 15-20% of task value (if applicable)
     - Platform: 8% base + enabler share

3. **Debit Customer Wallet** (COD orders)
   - Execute `WalletTransactionSaga` (debit)
   - Timeout: 15s
   - Compensation: None (customer already received goods)
   - **Failure Handling**: If insufficient balance → debt collection flow

4. **Credit Seller Wallet**
   - Execute `WalletTransactionSaga` (credit)
   - Timeout: 15s
   - Compensation: Debit seller wallet (reversal)
   - **Failure Handling**: If seller account suspended → hold in escrow

5. **Credit Enabler Wallet** (if applicable)
   - Execute `WalletTransactionSaga` (credit)
   - Timeout: 15s
   - Compensation: Debit enabler wallet (reversal)
   - **Failure Handling**: If enabler not found → return to platform wallet

6. **Record Platform Revenue**
   - Insert into `Wallet_PlatformRevenue` table
   - Timeout: 5s
   - Compensation: None (accounting record)

7. **Emit SettlementCompleted Event**
   - Publish to outbox
   - Timeout: 2s
   - Compensation: None (idempotent)

**State Persistence**: `Wallet_SagaLog` table  
**Recovery**: Saga recovery worker with 24h timeout for customer debit  
**Dead-Letter**: Customer wallet debit failures → manual review queue

---

## Common Patterns

### Redlock Distributed Lock (Phase 4)
- **Lock Key**: `wallet:lock:{walletId}`
- **TTL**: 5s with 3s renewal
- **Retry**: 3 attempts with 100ms backoff
- **Failure**: `RedlockAcquisitionError` → retry saga

### Optimistic Locking (Phase 4)
- **Version Field**: `Wallet_Wallet.version`
- **Conflict Detection**: `UPDATE ... WHERE version = ?`
- **Retry**: Fetch fresh version, retry update
- **Max Retries**: 5

### Idempotency Strategy (Phase 2)
- **Transaction Key**: `wallet-{walletId}-{transactionId}`
- **Duplicate Detection**: Check `Wallet_Transaction` table
- **Response**: Return existing transaction (HTTP 200)

### Retry Policy (Phase 3)
- **Redlock timeout**: 3 retries with 100ms backoff
- **Optimistic lock conflict**: 5 retries with exponential backoff
- **Database timeout**: 5 retries with exponential backoff
- **Dead-letter threshold**: 5 total retries

### Compensation Validation (Phase 3)
- `validateBalanceSufficiency`: Ensures debit amount ≤ available balance
- `validateWalletState`: Ensures wallet not suspended/frozen
- `validateTransactionLimits`: Enforces daily/monthly limits
