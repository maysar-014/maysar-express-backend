# Wallet Service - Failure Matrix

## WalletTransactionSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Redlock Acquisition | Lock timeout (5s) | None (retry) | 5s | 3 retries |
| Redlock Acquisition | Redis connection lost | Retry with backoff | 5s | 5 retries |
| Fetch Wallet | Wallet not found | Return 404 error | N/A | 0 (immediate) |
| Fetch Wallet | Database timeout | Retry with backoff | 2s | 5 retries |
| Validate Balance | Insufficient balance | Release Redlock, return 402 | N/A | 0 (immediate) |
| Update Balance | Optimistic lock conflict | Retry with fresh version | 5s | 5 retries |
| Update Balance | Database connection lost | Rollback, release Redlock | 5s | 5 retries |
| Insert Transaction | Duplicate transaction ID | Return existing (idempotent) | N/A | 0 (success) |
| Insert Transaction | Database timeout | Rollback, release Redlock | 5s | 5 retries |
| Emit Event | Outbox write failure | Rollback, release Redlock | 2s | 5 retries |
| Release Redlock | Redis timeout | Auto-expire (TTL) | 1s | 0 (non-critical) |

## CODSettlementSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Verify Delivery | Delivery not confirmed | Delay settlement 24h | N/A | Manual review |
| Calculate Commission | Service unavailable | Use order-time snapshot | 10s | 3 retries |
| Calculate Commission | Rate mismatch | Use order-time snapshot | N/A | Manual review |
| Debit Customer (COD) | Insufficient balance | Debt collection flow | 15s | Manual review |
| Debit Customer (COD) | Wallet suspended | Hold order in dispute | N/A | Manual review |
| Debit Customer (COD) | Redlock timeout | Retry with backoff | 15s | 5 retries |
| Credit Seller | Seller account suspended | Hold in escrow | N/A | Manual review |
| Credit Seller | Wallet not found | Create wallet, retry | 15s | 3 retries |
| Credit Seller | Redlock timeout | Retry with backoff | 15s | 5 retries |
| Credit Enabler | Enabler not found | Return to platform wallet | N/A | 0 (immediate) |
| Credit Enabler | Wallet suspended | Hold in escrow | N/A | Manual review |
| Record Revenue | Database timeout | Retry with backoff | 5s | 5 retries |

## Concurrency Failure Modes

| Scenario | Failure Mode | Detection | Resolution | Prevention |
|----------|--------------|-----------|------------|------------|
| Double-spend | Two concurrent debits exceed balance | Optimistic lock conflict | Second transaction fails | Redlock + version field |
| Race condition | Simultaneous credit/debit | Optimistic lock conflict | Retry with fresh version | Redlock serialization |
| Redlock split-brain | Multiple locks acquired | Redis cluster partition | Lock expires, retry | Redlock quorum (3/5 nodes) |
| Stale read | Read old balance after update | Version mismatch on update | Retry with fresh version | `FOR UPDATE` lock |

## COD Commitment Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Lock Creation | Insufficient balance | Reject order | N/A | 0 (immediate) |
| Lock Creation | Duplicate lock (same orderId) | Return existing lock | N/A | 0 (idempotent) |
| Lock Creation | Redlock timeout | Retry with backoff | 5s | 3 retries |
| Lock Expiry | TTL exceeded (15m) | Auto-release, cancel order | N/A | 0 (automatic) |
| Lock Release | Lock not found | Log warning (already released) | N/A | 0 (idempotent) |
| Lock Release | Redlock timeout | Retry with backoff | 5s | 3 retries |

## Optimistic Lock Conflict Resolution

### Conflict Rate (from Phase 4 testing)
- **Normal Load**: <1% of transactions
- **High Contention** (500 concurrent users): 5-10% of transactions
- **Hot Wallet** (single seller receiving many payouts): 15-20% of transactions

### Retry Strategy
1. Detect conflict: `UPDATE` returns 0 rows
2. Fetch fresh wallet with current version
3. Re-validate business logic (balance check)
4. Retry update with new version
5. Max retries: 5 (exponential backoff)

### Dead-Letter Threshold
- After 5 retries → `Wallet_SagaDeadLetter`
- Manual review for persistent conflicts (indicates hot wallet)

## Dead-Letter Processing

**Table**: `Wallet_SagaDeadLetter`  
**Retention**: 90 days  
**Manual Review Triggers**:
- Customer wallet debit failures (debt collection)
- Seller account suspended (escrow hold)
- Persistent optimistic lock conflicts (hot wallet)

**Replay Mechanism**: `POST /admin/wallets/transactions/{id}/retry` endpoint

## Monitoring & Alerts

### Critical Metrics (Phase 6)
- `wallet_redlock_acquisition_failures_total` (counter)
- `wallet_optimistic_lock_conflicts_total` (counter)
- `wallet_transaction_duration_seconds` (histogram)
- `wallet_settlement_failures_total` (counter by reason)

### Alert Thresholds
- Redlock acquisition failure rate > 5% for 5 minutes
- Optimistic lock conflict rate > 10% for 5 minutes
- Settlement failure rate > 2% for 10 minutes
- Customer debit failure rate > 5% (debt collection backlog)
