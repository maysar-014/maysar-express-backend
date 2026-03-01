# Inventory Service - Failure Matrix

## StockReservationSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Redlock Acquisition | Lock timeout (5s) | None (retry) | 5s | 3 retries |
| Redlock Acquisition | Redis connection lost | Retry with backoff | 5s | 5 retries |
| Check Availability | Out of stock | Release Redlock, return 409 | N/A | 0 (immediate) |
| Check Availability | Database timeout | Release Redlock, retry | 2s | 5 retries |
| Decrement Stock | Redis INCRBY failure | Release Redlock, retry | 5s | 5 retries |
| Decrement Stock | Database update failure | Increment Redis, release Redlock | 5s | 5 retries |
| Decrement Stock | Negative stock (race condition) | Increment Redis, release Redlock | N/A | 0 (caught by check) |
| Create Reservation | Duplicate reservation ID | Return existing (idempotent) | N/A | 0 (success) |
| Create Reservation | Database timeout | Increment stock, release Redlock | 5s | 5 retries |
| Emit Event | Outbox write failure | Delete reservation, increment stock | 2s | 5 retries |
| Release Redlock | Redis timeout | Auto-expire (TTL) | 1s | 0 (non-critical) |

## ReservationExpiryCleanupSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Query Expired | Database timeout | Retry next cycle (5m) | 10s | 3 retries |
| Redlock Acquisition | Lock timeout | Skip reservation, continue batch | 5s | 0 (skip) |
| Increment Stock | Redis failure | Log error, continue batch | 5s | 0 (skip) |
| Increment Stock | Database failure | Log error, continue batch | 5s | 0 (skip) |
| Mark Expired | Database timeout | Log error, continue batch | 5s | 0 (skip) |
| Emit Event | Outbox failure | Log error, continue batch | 2s | 0 (skip) |

## StockCommitSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Validate Reservation | Reservation not found | Return 404 error | N/A | 0 (immediate) |
| Validate Reservation | Reservation expired | Return 409 error | N/A | 0 (immediate) |
| Validate Reservation | Reservation already committed | Return existing (idempotent) | N/A | 0 (success) |
| Mark Committed | Database timeout | Retry with backoff | 5s | 5 retries |
| Emit Event | Outbox failure | Retry with backoff | 2s | 5 retries |

## StockReleaseSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Validate Reservation | Reservation not found | Return 404 error | N/A | 0 (immediate) |
| Validate Reservation | Reservation already released | Return existing (idempotent) | N/A | 0 (success) |
| Redlock Acquisition | Lock timeout | Retry with backoff | 5s | 3 retries |
| Increment Stock | Redis failure | Release Redlock, retry | 5s | 5 retries |
| Increment Stock | Database failure | Decrement Redis, release Redlock | 5s | 5 retries |
| Mark Released | Database timeout | Decrement stock, release Redlock | 5s | 5 retries |
| Emit Event | Outbox failure | Rollback, release Redlock | 2s | 5 retries |

## Concurrency Failure Modes

| Scenario | Failure Mode | Detection | Resolution | Prevention |
|----------|--------------|-----------|------------|------------|
| Double-booking | Two concurrent reservations exceed stock | Redlock + availability check | Second reservation fails | Redlock serialization |
| Race condition | Simultaneous reserve/release | Redis INCRBY atomic | Correct final stock | Atomic operations |
| Redlock split-brain | Multiple locks acquired | Redis cluster partition | Lock expires, retry | Redlock quorum (3/5 nodes) |
| Stale Redis cache | Redis stock ≠ database stock | Periodic reconciliation job | Sync Redis from database | Dual-write pattern |

## Hot-Item Contention (from Phase 4 load testing)

### Observed Behavior
- **Load Test**: 500 concurrent users reserving same product variant
- **Redlock Conflict Rate**: 15% (75 of 500 requests)
- **Retry Success Rate**: 95% (71 of 75 retries succeed)
- **Final Failure Rate**: 0.8% (4 of 500 requests)

### Mitigation Strategies
1. **Redlock Retry**: 3 attempts with 100ms backoff (implemented - Phase 4)
2. **Redis Sharding**: Shard hot items across multiple Redis instances (deferred - Phase 13)
3. **Queue-Based Reservation**: Queue requests for hot items (deferred - Phase 13)

## Reservation TTL Expiry

| Scenario | Failure Mode | Detection | Resolution | Prevention |
|----------|--------------|-----------|------------|------------|
| Order processing slow | Reservation expires before payment | TTL check in commit saga | Extend TTL or re-reserve | 15m TTL (generous) |
| Cleanup job lag | Expired reservations not cleaned | Monitor cleanup job latency | Manual cleanup script | 5m job frequency |
| Zombie reservations | Cleanup job fails repeatedly | Dead-letter queue | Manual intervention | Saga recovery worker |

## Dead-Letter Processing

**Table**: `Inventory_SagaDeadLetter`  
**Retention**: 90 days  
**Manual Review Triggers**:
- Persistent Redlock acquisition failures (hot item)
- Redis-database stock mismatch (reconciliation needed)
- Reservation expiry cleanup failures (zombie reservations)

**Replay Mechanism**: `POST /admin/inventory/reservations/{id}/retry` endpoint

## Monitoring & Alerts

### Critical Metrics (Phase 6)
- `inventory_redlock_acquisition_failures_total` (counter)
- `inventory_redlock_conflicts_total` (counter)
- `inventory_reservation_duration_seconds` (histogram)
- `inventory_reservations_expired_total` (counter)
- `inventory_stock_mismatch_total` (counter, Redis vs. database)

### Alert Thresholds
- Redlock acquisition failure rate > 5% for 5 minutes
- Redlock conflict rate > 20% for 5 minutes (hot item alert)
- Reservation expiry rate > 10% for 10 minutes (slow order processing)
- Stock mismatch count > 10 (reconciliation needed)
