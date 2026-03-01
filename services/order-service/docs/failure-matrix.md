# Order Service - Failure Matrix

## OrderFulfillmentSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| StockReservation | Out of stock | None (order cancelled) | 30s | 3 retries |
| StockReservation | Inventory service timeout | Release partial reservations | 30s | 5 retries |
| StockReservation | Redlock acquisition timeout | Retry with backoff | 10s | 5 retries |
| PaymentCapture | Gateway timeout | Void authorization | 60s | 3 retries |
| PaymentCapture | Insufficient funds | Cancel order, release stock | N/A | 0 (immediate) |
| PaymentCapture | Fraud threshold exceeded | Cancel order, flag account | N/A | 0 (immediate) |
| PaymentCapture | COD wallet lock failure | Release stock, cancel order | 15s | 3 retries |
| LogisticsAssignment | No courier available | Hold order, retry in 5m | 15s | 10 retries |
| LogisticsAssignment | Delivery zone unsupported | Cancel order, refund payment | N/A | 0 (immediate) |
| CommissionCalculation | Calculation service down | Use cached rates | 10s | 5 retries |

## PaymentSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Fraud assessment | Service unavailable | Allow with manual review flag | 10s | 3 retries |
| COD wallet lock | Insufficient wallet balance | Reject order | N/A | 0 (immediate) |
| COD wallet lock | Optimistic lock conflict | Retry with backoff | 5s | 5 retries |
| Payment capture | Duplicate idempotency key | Return existing payment | N/A | 0 (idempotent) |

## SettlementSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Delivery verification | Delivery not confirmed | Delay settlement 24h | N/A | Manual review |
| Commission calculation | Rate mismatch | Use order-time snapshot | 10s | 3 retries |
| Wallet debit (COD) | Customer wallet empty | Debt collection flow | 30s | Manual review |
| Wallet credit (seller) | Seller account suspended | Hold funds in escrow | N/A | Manual review |
| Wallet credit (enabler) | Enabler not found | Return to platform wallet | N/A | Manual review |

## TrainingSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Task assignment | Enabler unavailable | Reassign to next enabler | 15s | 5 retries |
| Completion verification | Quality check failed | Withhold completion commission | N/A | Manual review |

## Recovery Worker Configuration

**Poll Interval**: 60s  
**Stalled Saga Threshold**: 5 minutes without state update  
**Max Concurrent Recoveries**: 10  
**Leader Election**: Redis distributed lock (Phase 4)

## Dead-Letter Processing

**Table**: `Order_SagaDeadLetter`  
**Retention**: 90 days  
**Manual Review Queue**: Admin dashboard flag  
**Replay Mechanism**: `POST /admin/sagas/{id}/replay` endpoint
