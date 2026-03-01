# Wallet Service - Scaling Strategy

## Write-Heavy Workload on COD Market Days

### Traffic Patterns
- **Normal Days**: 50 transactions/s (balanced credit/debit)
- **COD Market Days** (payday, holidays): 500 transactions/s (80% debit spike)
- **Settlement Windows**: 200 concurrent settlements (evening batch)

### Bottleneck: Redlock + Optimistic Locking
- **Redlock Acquisition**: 5s timeout per wallet operation
- **Optimistic Lock Conflict Rate**: 5-10% under high contention (Phase 4 testing)
- **Retry Overhead**: 3-5 retries per conflict = 3-5x latency

## Concurrency Control Strategy

### Redlock Distributed Lock (Phase 4)
- **Purpose**: Ensures single-writer per wallet across multiple service instances
- **Lock Key**: `wallet:lock:{walletId}`
- **TTL**: 5s with 3s renewal
- **Quorum**: 3/5 Redis nodes must acquire lock

### Optimistic Locking (Phase 4)
- **Purpose**: Detects concurrent updates within same service instance
- **Version Field**: `Wallet_Wallet.version`
- **Conflict Detection**: `UPDATE ... WHERE version = ?` returns 0 rows
- **Retry**: Fetch fresh version, re-validate, retry update

### Combined Correctness Guarantee
- **Redlock**: Prevents inter-instance conflicts
- **Optimistic Lock**: Prevents intra-instance conflicts
- **Result**: Zero double-spend risk under all concurrency scenarios

## Horizontal Scaling

### Stateless Design
- Wallet-service pods are fully stateless
- Scale behind nginx upstream: `upstream wallet_service { server wallet-service:3003; }`
- Session affinity: Not required (Redlock handles coordination)

### Scaling Commands
```bash
# Scale wallet-service pods
docker-compose up -d --scale wallet-service=3
```

### Hot Wallet Sharding (Deferred to Phase 13)
- **Problem**: Single seller wallet receiving 100+ payouts/minute
- **Solution**: Shard wallet balance across multiple sub-wallets
- **Routing**: Hash(walletId) % shard_count
- **Aggregation**: Sum sub-wallet balances for display

## Resource Limits

From `docker-compose.prod.yml` (Phase 8):
```yaml
wallet-service:
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
- `CREATE INDEX idx_wallets_user ON Wallet_Wallet(userId);`
- `CREATE INDEX idx_transactions_wallet ON Wallet_Transaction(walletId, createdAt DESC);`
- `CREATE INDEX idx_cod_locks_order ON Wallet_CODCommitment(orderId);`
- `CREATE INDEX idx_cod_locks_expiry ON Wallet_CODCommitment(expiresAt) WHERE released = false;`

### Settlement Queries
- `CREATE INDEX idx_transactions_settlement ON Wallet_Transaction(orderId, type) WHERE type IN ('SETTLEMENT_CREDIT', 'SETTLEMENT_DEBIT');`

## Redis Configuration

### Redlock Cluster
- **Nodes**: 5 Redis instances (quorum = 3)
- **Deployment**: Separate from cache Redis (dedicated for locks)
- **Persistence**: AOF enabled (lock state survives restart)

### Rate Limiting (Phase 7)
- **Endpoint**: `POST /wallets/{id}/debit`, `POST /wallets/{id}/credit`
- **Limit**: 100 requests/minute per wallet
- **Storage**: Redis sliding window counter

## Expected QPS

### Launch (Month 1)
- **Debit**: 30 requests/s
- **Credit**: 20 requests/s (refunds, payouts)
- **COD Lock**: 35 requests/s (70% of orders are COD)
- **Settlement**: 50 requests/s (batch processing)

### Scale Target (10K orders/day)
- **Debit**: 300 requests/s
- **Credit**: 200 requests/s
- **COD Lock**: 350 requests/s
- **Settlement**: 500 requests/s

## Monitoring

### Prometheus Metrics (Phase 6)
- `wallet_redlock_acquisition_duration_seconds` (histogram)
- `wallet_redlock_conflicts_total` (counter)
- `wallet_optimistic_lock_conflicts_total` (counter)
- `wallet_transaction_duration_seconds` (histogram by type)
- `wallet_balance_total` (gauge by currency)

### Jaeger Tracing (Phase 6)
- Distributed trace per transaction: order-service → wallet-service → Redis
- Span tags: `wallet.id`, `transaction.type`, `redlock.acquired`

### Alerts
- Redlock acquisition failure rate > 5% for 5 minutes
- Optimistic lock conflict rate > 10% for 5 minutes
- Transaction latency p95 > 2s
- COD lock expiry rate > 5% (indicates slow order processing)

## Performance Benchmarks (from Phase 8 load testing)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Transaction latency (p50) | <200ms | 150ms | ✅ |
| Transaction latency (p95) | <1s | 800ms | ✅ |
| Redlock acquisition (p95) | <100ms | 80ms | ✅ |
| Optimistic lock conflict rate | <5% | 3% | ✅ |
| Throughput (single instance) | 100 tx/s | 120 tx/s | ✅ |
