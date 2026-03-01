# Payment Service - Scaling Strategy

## Critical Bottleneck: External Payment Gateway Latency

### Gateway Performance Characteristics
- **Average Latency**: 800ms - 1.5s per capture request
- **Timeout**: 60s (configured in saga)
- **Rate Limit**: 100 requests/second (gateway-imposed)

### Mitigation: Circuit Breaker Pattern (Phase 7)
- **Failure Threshold**: 5 consecutive failures
- **Open Duration**: 60s
- **Half-Open Test**: 3 requests before fully closing
- **Fallback**: Queue payment for async processing

## Optimistic Locking for Concurrency

### Version Field Strategy (Phase 4)
- `Payment_Payment.version` column prevents double-capture
- Conflict detection:
  ```sql
  UPDATE Payment_Payment 
  SET status = 'CAPTURED', version = version + 1 
  WHERE id = ? AND version = ?
  ```
- Conflict rate: <1% under normal load (from Phase 4 testing)

### Retry Logic
- Optimistic lock conflict → fetch fresh version → retry
- Max retries: 5
- Backoff: 100ms, 200ms, 400ms, 800ms, 1600ms

## Horizontal Scaling

### Stateless Design
- Payment-service pods are fully stateless
- Scale behind nginx upstream: `upstream payment_service { server payment-service:3002; }`
- Session affinity: Not required (idempotency keys handle duplicates)

### Scaling Commands
```bash
# Scale payment-service pods
docker-compose up -d --scale payment-service=3
```

## Resource Limits

From `docker-compose.prod.yml` (Phase 8):
```yaml
payment-service:
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
- `CREATE INDEX idx_payments_order ON Payment_Payment(orderId);`
- `CREATE INDEX idx_payments_status ON Payment_Payment(status, createdAt DESC);`
- `CREATE INDEX idx_payments_gateway_txn ON Payment_Payment(gatewayTransactionId);`

### Fraud Assessment
- `CREATE INDEX idx_fraud_customer ON Payment_FraudAssessment(customerId, createdAt DESC);`
- `CREATE INDEX idx_fraud_risk_score ON Payment_FraudAssessment(riskScore) WHERE riskScore > 70;`

## Expected QPS

### Launch (Month 1)
- **Payment Capture**: 50 requests/s (matches order creation rate)
- **Fraud Assessment**: 50 requests/s (inline with capture)
- **Refunds**: 5 requests/s (10% refund rate)

### Scale Target (10K orders/day)
- **Payment Capture**: 500 requests/s peak
- **Gateway Constraint**: 100 requests/s → requires 5 gateway accounts or queueing

## Gateway Queueing Strategy

### Async Processing for High Load
1. Synchronous capture attempt (timeout: 5s)
2. If timeout → queue payment in Redis
3. Background worker processes queue (rate: 100/s per gateway account)
4. Emit `PaymentCaptured` event on success

### Queue Configuration
- Redis list: `payment:capture:queue`
- Worker poll interval: 100ms
- Max queue size: 10,000 (circuit breaker opens if exceeded)

## Monitoring

### Prometheus Metrics (Phase 6)
- `payment_capture_duration_seconds` (histogram)
- `payment_gateway_errors_total` (counter by error code)
- `payment_fraud_score_distribution` (histogram)
- `payment_optimistic_lock_conflicts_total` (counter)

### Jaeger Tracing (Phase 6)
- Distributed trace per payment: order-service → payment-service → gateway
- Span tags: `payment.method`, `gateway.provider`, `fraud.risk_score`

### Alerts
- Gateway error rate > 5% for 5 minutes
- Circuit breaker open for > 2 minutes
- Fraud assessment latency > 2s (p95)
