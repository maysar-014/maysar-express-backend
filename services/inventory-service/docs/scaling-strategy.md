# Inventory Service - Scaling Strategy

## Hot-Item Contention Mitigation

### Problem: Popular Products Under High Load
- **Scenario**: Flash sale, trending product, limited stock
- **Load Test Result** (Phase 4): 500 concurrent users → 15% Redlock conflict rate
- **Bottleneck**: Single Redlock per product variant serializes all reservations

### Current Mitigation (Phase 4)
- **Redlock Retry**: 3 attempts with 100ms backoff
- **Success Rate**: 95% of conflicts resolved via retry
- **Final Failure Rate**: 0.8% (acceptable at launch)

### Future Optimization (Deferred to Phase 13)
1. **Redis Sharding**: Shard hot items across multiple Redis instances
   - Hash(productVariantId) % shard_count
   - Reduces contention by distributing locks
2. **Queue-Based Reservation**: Queue requests for hot items
   - Worker processes queue at controlled rate
   - Eliminates contention, trades latency for throughput
3. **Optimistic Reservation**: Reserve without lock, validate on commit
   - Higher conflict rate, but no lock contention
   - Suitable for high-stock items

## Horizontal Scaling

### Stateless Design
- Inventory-service pods are fully stateless
- Scale behind nginx upstream: `upstream inventory_service { server inventory-service:3004; }`
- Session affinity: Not required (Redlock handles coordination)

### Scaling Commands
```bash
# Scale inventory-service pods
docker-compose up -d --scale inventory-service=3
```

### Reservation Expiry Cleanup Job
- **Single-leader requirement**: Only one instance runs cleanup job
- **Leader election**: Redis distributed lock (Phase 4)
  - Lock key: `inventory:cleanup:leader`
  - TTL: 60s with 45s renewal
  - Failover: Automatic on leader crash

## Resource Limits

From `docker-compose.prod.yml` (Phase 8):
```yaml
inventory-service:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

## Database Indexes

### High-Traffic Queries
- `CREATE INDEX idx_stock_variant ON Inventory_Stock(productVariantId);`
- `CREATE INDEX idx_reservations_order ON Inventory_Reservation(orderId);`
- `CREATE INDEX idx_reservations_expiry ON Inventory_Reservation(expiresAt, status) WHERE status = 'ACTIVE';`
- `CREATE INDEX idx_reservations_variant ON Inventory_Reservation(productVariantId, status);`

### Cleanup Job Query
- `CREATE INDEX idx_reservations_expired ON Inventory_Reservation(expiresAt) WHERE status = 'ACTIVE' AND expiresAt < NOW();`

## Redis Configuration

### Redlock Cluster
- **Nodes**: 5 Redis instances (quorum = 3)
- **Deployment**: Shared with wallet-service Redlock cluster
- **Persistence**: AOF enabled (lock state survives restart)

### Stock Cache
- **Key Pattern**: `inventory:stock:{productVariantId}`
- **TTL**: None (updated on every reservation/release)
- **Consistency**: Redis updated first, database second (eventual consistency)
- **Reconciliation Job**: Runs daily to sync Redis from database

## Expected QPS

### Launch (Month 1)
- **Reserve**: 50 requests/s (matches order creation rate)
- **Commit**: 40 requests/s (80% order completion rate)
- **Release**: 10 requests/s (20% order cancellation rate)
- **Expiry Cleanup**: 100 reservations/5m (background job)

### Scale Target (10K orders/day)
- **Reserve**: 500 requests/s
- **Commit**: 400 requests/s
- **Release**: 100 requests/s
- **Expiry Cleanup**: 1000 reservations/5m

## Monitoring

### Prometheus Metrics (Phase 6)
- `inventory_redlock_acquisition_duration_seconds` (histogram)
- `inventory_redlock_conflicts_total` (counter)
- `inventory_reservation_duration_seconds` (histogram)
- `inventory_reservations_expired_total` (counter)
- `inventory_stock_available` (gauge by productVariantId)
- `inventory_stock_reserved` (gauge by productVariantId)

### Jaeger Tracing (Phase 6)
- Distributed trace per reservation: order-service → inventory-service → Redis
- Span tags: `product.variant.id`, `reservation.id`, `redlock.acquired`

### Alerts
- Redlock acquisition failure rate > 5% for 5 minutes
- Redlock conflict rate > 20% for 5 minutes (hot item alert)
- Reservation expiry rate > 10% for 10 minutes (slow order processing)
- Stock mismatch count > 10 (reconciliation needed)

## Performance Benchmarks (from Phase 8 load testing)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Reservation latency (p50) | <150ms | 120ms | ✅ |
| Reservation latency (p95) | <500ms | 400ms | ✅ |
| Redlock acquisition (p95) | <100ms | 80ms | ✅ |
| Redlock conflict rate (normal load) | <5% | 2% | ✅ |
| Redlock conflict rate (hot item) | <20% | 15% | ✅ |
| Throughput (single instance) | 100 reservations/s | 120 reservations/s | ✅ |

## Load Shedding Strategy

### Circuit Breaker for Hot Items
- **Trigger**: Redlock conflict rate > 30% for 1 minute
- **Action**: Return 503 Service Unavailable with Retry-After header
- **Duration**: 60s
- **Fallback**: Queue reservation for async processing

### Rate Limiting (Phase 7)
- **Endpoint**: `POST /reservations`
- **Limit**: 100 requests/minute per product variant
- **Storage**: Redis sliding window counter
- **Response**: 429 Too Many Requests
