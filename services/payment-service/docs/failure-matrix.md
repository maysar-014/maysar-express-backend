# Payment Service - Failure Matrix

## PaymentProcessingSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Fraud Assessment | Service unavailable | Allow with manual review flag | 10s | 3 retries |
| Fraud Assessment | Risk score > threshold | Reject payment, cancel order | N/A | 0 (immediate) |
| COD Pre-Auth | Wallet service timeout | Retry with backoff | 15s | 3 retries |
| COD Pre-Auth | Insufficient wallet balance | Reject payment, cancel order | N/A | 0 (immediate) |
| COD Pre-Auth | Optimistic lock conflict | Retry with fresh version | 5s | 5 retries |
| Gateway Capture | Gateway timeout | Retry with idempotency key | 60s | 3 retries |
| Gateway Capture | Insufficient funds | Reject payment, release COD lock | N/A | 0 (immediate) |
| Gateway Capture | Card declined | Reject payment, release COD lock | N/A | 0 (immediate) |
| Gateway Capture | Duplicate idempotency key | Return existing payment (idempotent) | N/A | 0 (success) |
| Payment Update | Optimistic lock conflict | Retry with fresh version | 5s | 5 retries |
| Payment Update | Database connection lost | Retry with backoff | 10s | 5 retries |

## RefundSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Eligibility Check | Payment not found | Return 404 error | N/A | 0 (immediate) |
| Eligibility Check | Payment not captured | Return 400 error | N/A | 0 (immediate) |
| Eligibility Check | Refund amount exceeds captured | Return 400 error | N/A | 0 (immediate) |
| Gateway Refund | Gateway timeout | Retry with idempotency key | 60s | 3 retries |
| Gateway Refund | Refund window expired | Manual reconciliation | N/A | Manual review |
| Wallet Credit | Wallet service unavailable | Retry with backoff | 15s | 5 retries |
| Wallet Credit | Customer account suspended | Hold credit in escrow | N/A | Manual review |

## Circuit Breaker Thresholds (Phase 7)

| Dependency | Failure Threshold | Open Duration | Half-Open Test Requests |
|------------|------------------|---------------|------------------------|
| Payment Gateway | 5 consecutive failures | 60s | 3 requests |
| Fraud Service | 10 consecutive failures | 30s | 5 requests |
| Wallet Service | 5 consecutive failures | 30s | 3 requests |

## HTTP Status Mapping

| Failure Mode | HTTP Status | Retryable | Client Action |
|--------------|-------------|-----------|---------------|
| Gateway timeout | 504 Gateway Timeout | Yes | Retry with same idempotency key |
| Fraud threshold exceeded | 403 Forbidden | No | Cancel order |
| Insufficient funds | 402 Payment Required | No | Update payment method |
| Duplicate payment | 200 OK | N/A | Return existing payment |
| Optimistic lock conflict | 409 Conflict | Yes | Retry with fresh version |
| COD wallet lock failure | 402 Payment Required | No | Insufficient wallet balance |

## Dead-Letter Processing

**Table**: `Payment_SagaDeadLetter`  
**Retention**: 90 days  
**Manual Review Triggers**:
- Gateway refund failures (cannot be reversed)
- Fraud false positives (risk score > 70 but legitimate)
- Wallet credit failures (customer account issues)

**Replay Mechanism**: `POST /admin/payments/{id}/retry` endpoint
