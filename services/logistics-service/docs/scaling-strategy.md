# Logistics Service - Scaling Strategy

## Courier Assignment: Stateless Scaling

### Assignment Algorithm
- **Zone-Based Matching**: Filter couriers by delivery zone
- **Reputation Scoring**: Sort by courier rating (DESC)
- **Availability Check**: Redis cache for real-time availability
- **Fallback**: Manual assignment queue if no courier available

### Horizontal Scaling
- Logistics-service pods are fully stateless
- Scale behind nginx upstream: `upstream logistics_service { server logistics-service:3006; }`
- Session affinity: Not required (Redis cache shared)

### Scaling Commands
```bash
# Scale logistics-service pods
docker-compose up -d --scale logistics-service=3
```

## COD Confirmation Throughput

### Bottleneck: Wallet Service Redlock Contention
- **COD Confirmation** triggers `CODSettlementSaga` in wallet-service
- **Wallet Redlock**: Serializes settlement operations per wallet
- **Throughput Bound**: Wallet-service Redlock contention (from wallet-service scaling-strategy.md)

### Mitigation
- **Batch Settlement**: Group multiple COD confirmations per seller wallet
- **Async Processing**: Queue COD confirmations, process in background
- **Target**: 500 settlements/s (matches scale target)

## Resource Limits

From `docker-compose.prod.yml` (Phase 8):
```yaml
logistics-service:
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
- `CREATE INDEX idx_deliveries_order ON Logistics_Delivery(orderId);`
- `CREATE INDEX idx_deliveries_courier ON Logistics_Delivery(courierId, state);`
- `CREATE INDEX idx_deliveries_state ON Logistics_Delivery(state, createdAt DESC);`
- `CREATE INDEX idx_courier_zone ON Courier(zone, available) WHERE available = true;`

### Courier Assignment Query
- `CREATE INDEX idx_courier_assignment ON Courier(zone, reputation DESC, available) WHERE available = true;`

## Redis Configuration

### Courier Availability Cache
- **Key Pattern**: `courier:available:{courierId}`
- **TTL**: 60s (refreshed by courier mobile app)
- **Consistency**: Redis updated on courier status change

### Rate Limiting (Phase 7)
- **Endpoint**: `POST /deliveries` (delivery creation)
- **Limit**: 100 requests/minute per order
- **Storage**: Redis sliding window counter

## Expected QPS

### Launch (Month 1)
- **Delivery Creation**: 50 requests/s (matches order creation rate)
- **Courier Assignment**: 50 requests/s
- **Delivery Status Update**: 100 requests/s (courier mobile app)
- **COD Confirmation**: 35 requests/s (70% of orders are COD)

### Scale Target (10K orders/day)
- **Delivery Creation**: 500 requests/s
- **Courier Assignment**: 500 requests/s
- **Delivery Status Update**: 1000 requests/s
- **COD Confirmation**: 350 requests/s

## Monitoring

### Prometheus Metrics (Phase 6)
- `logistics_courier_assignment_duration_seconds` (histogram)
- `logistics_courier_assignment_failures_total` (counter by reason)
- `logistics_delivery_completion_rate` (gauge)
- `logistics_delivery_duration_seconds` (histogram)
- `logistics_cod_collection_rate` (gauge)

### Jaeger Tracing (Phase 6)
- Distributed trace per delivery: order-service → logistics-service → wallet-service
- Span tags: `delivery.id`, `courier.id`, `cod.enabled`

### Alerts
- Courier assignment failure rate > 10% for 10 minutes
- Delivery completion rate < 90% for 1 hour
- COD collection failure rate > 5% for 10 minutes
- Courier availability < 50% for 30 minutes (courier shortage)

## Performance Benchmarks (from Phase 8 load testing)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Courier assignment (p50) | <200ms | 150ms | ✅ |
| Courier assignment (p95) | <500ms | 400ms | ✅ |
| Delivery creation (p50) | <100ms | 80ms | ✅ |
| Delivery creation (p95) | <300ms | 250ms | ✅ |
| COD confirmation (p95) | <1s | 800ms | ✅ |
| Throughput (single instance) | 50 deliveries/s | 60 deliveries/s | ✅ |

## Load Shedding Strategy

### Circuit Breaker for Wallet Service
- **Trigger**: Wallet service error rate > 10% for 1 minute
- **Action**: Queue COD confirmations for async processing
- **Duration**: 60s
- **Fallback**: Manual settlement reconciliation

### Rate Limiting (Phase 7)
- **Endpoint**: `POST /deliveries`
- **Limit**: 100 requests/minute per order
- **Storage**: Redis sliding window counter
- **Response**: 429 Too Many Requests
