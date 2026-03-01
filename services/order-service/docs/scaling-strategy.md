# Order Service - Scaling Strategy

## Read/Write Split

### Write Path (Primary)
- All order mutations: CREATE, UPDATE, state transitions
- Saga log writes
- Outbox event writes
- Target: Primary PostgreSQL instance

### Read Path (Replica)
- Order status polling: `GET /orders/{id}`
- Order history: `GET /orders?customerId={id}`
- Dashboard queries
- Target: Read replica with 1-2s replication lag acceptable

## Expected QPS

### Launch (Month 1)
- **Write**: 50 orders/s peak (4.3M orders/day)
- **Read**: 200 status polls/s
- **Saga Recovery**: 10 recoveries/minute background

### Scale Target (10K orders/day)
- **Write**: 500 orders/s peak
- **Read**: 2000 status polls/s
- **Database**: Vertical scaling to 4 vCPU, 16 GB RAM

## Horizontal Scaling

### Stateless Design
- Order-service pods are fully stateless
- Scale behind nginx upstream: `upstream order_service { server order-service:3001; }`
- Session affinity: Not required (idempotency keys handle duplicate requests)

### Saga Recovery Worker Constraint
- **Single-leader requirement**: Only one worker instance may run saga recovery
- **Leader election**: Redis distributed lock (Phase 4)
  - Lock key: `saga:recovery:leader`
  - TTL: 30s with 20s renewal
  - Failover: Automatic on leader crash

### Scaling Commands
```bash
# Scale order-service pods
docker-compose up -d --scale order-service=3

# Saga recovery worker runs as separate service
docker-compose up -d saga-recovery-worker
```

## Resource Limits

From `docker-compose.prod.yml` (Phase 8):
```yaml
order-service:
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
- `CREATE INDEX idx_orders_customer_created ON Order_Order(customerId, createdAt DESC);`
- `CREATE INDEX idx_orders_status ON Order_Order(status) WHERE status IN ('PENDING', 'PROCESSING');`
- `CREATE INDEX idx_saga_log_status ON Order_SagaLog(status, updatedAt) WHERE status = 'IN_PROGRESS';`

### Outbox Polling
- `CREATE INDEX idx_outbox_published ON Order_OutboxEvent(published, createdAt) WHERE published = false;`

## Bottleneck Analysis

### Current Bottlenecks
1. **Payment gateway latency**: 60s timeout on external calls
   - Mitigation: Circuit breaker pattern (Phase 7)
2. **Inventory Redlock contention**: 15% conflict rate under 500 concurrent users
   - Mitigation: Shard hot items across Redis instances
3. **Saga recovery worker**: Single-threaded by design
   - Mitigation: Acceptable at current scale; consider sharding by order ID range at 100K orders/day

### Monitoring
- Prometheus metrics: `/metrics` endpoint (Phase 6)
  - `order_creation_duration_seconds`
  - `saga_step_duration_seconds{step="StockReservation"}`
  - `saga_recovery_queue_size`
- Jaeger tracing: Distributed trace per order (Phase 6)
