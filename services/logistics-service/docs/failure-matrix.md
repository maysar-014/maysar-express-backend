# Logistics Service - Failure Matrix

## DeliverySaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Create Delivery | Duplicate delivery (same orderId) | Return existing (idempotent) | N/A | 0 (success) |
| Create Delivery | Database timeout | Retry with backoff | 5s | 5 retries |
| Find Courier | No courier available | Queue for manual assignment | 10s | Manual review |
| Find Courier | All couriers busy | Retry in 5 minutes | 10s | 10 retries |
| Find Courier | Database timeout | Retry with backoff | 10s | 5 retries |
| Assign Courier | Courier already assigned | Find next courier, retry | 5s | 3 retries |
| Assign Courier | Courier unavailable (went offline) | Find next courier, retry | 5s | 3 retries |
| Assign Courier | Database timeout | Restore courier, retry | 5s | 5 retries |
| Emit Event | Outbox write failure | Rollback, retry | 2s | 5 retries |
| Monitor Progress | Delivery window exceeded (24h) | Trigger DeliveryFailed | 24h | 0 (timeout) |
| Monitor Progress | Courier unresponsive | Reassign courier | 2h | 3 retries |

## CODDeliveryConfirmationSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Verify Completion | Delivery not completed | Delay confirmation 1h | N/A | Manual review |
| Verify COD | Courier did not confirm collection | Delay confirmation 1h | 5s | Manual review |
| Verify COD | Collected amount mismatch | Flag for manual review | N/A | Manual review |
| Emit Event | Outbox failure | Retry with backoff | 2s | 5 retries |
| Update Reputation | Order service unavailable | Retry with backoff | 10s | 5 retries |

## DeliveryFailureSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Record Failure | Database timeout | Retry with backoff | 5s | 5 retries |
| Emit Event | Outbox failure | Retry with backoff | 2s | 5 retries |
| Release Courier | Courier record not found | Log warning (already released) | 5s | 0 (non-critical) |
| Determine Retry | Retry limit exceeded (3 attempts) | Trigger return flow | N/A | 0 (automatic) |

## ReturnSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Create Return | Duplicate return (same orderId) | Return existing (idempotent) | N/A | 0 (success) |
| Create Return | Database timeout | Retry with backoff | 5s | 5 retries |
| Assign Courier | No courier available in seller zone | Queue for manual assignment | 10s | Manual review |
| Assign Courier | Courier unavailable | Find next courier, retry | 5s | 3 retries |
| Emit Event | Outbox failure | Rollback, retry | 2s | 5 retries |

## Courier Assignment Failure Modes

| Scenario | Failure Mode | Detection | Resolution | Prevention |
|----------|--------------|-----------|------------|------------|
| No courier available | All couriers busy or offline | Query returns empty | Queue for manual assignment | Recruit more couriers |
| Courier zone mismatch | Delivery address outside courier zone | Zone validation | Find courier in correct zone | Improve zone mapping |
| Courier reputation low | Courier rating <3.0 | Reputation filter | Skip low-rated couriers | Courier quality incentives |
| Courier unresponsive | No status update for 2h | Timeout handler | Reassign to new courier | Mobile app push notifications |

## Delivery Window Failure Modes

| Scenario | Failure Mode | Detection | Resolution | Prevention |
|----------|--------------|-----------|------------|------------|
| Window exceeded | Delivery not completed within 24h | Timeout handler | Trigger DeliveryFailed | Courier performance monitoring |
| Customer unavailable | Multiple delivery attempts failed | Courier report | Schedule retry or return | Customer notification (SMS) |
| Address incorrect | Courier cannot locate address | Courier report | Contact customer, update address | Address validation on order |
| GPS route failure | Maps service unavailable | Courier report | Manual routing | Offline maps (deferred - Phase 13) |

## COD Collection Failure Modes

| Scenario | Failure Mode | Detection | Resolution | Prevention |
|----------|--------------|-----------|------------|------------|
| Customer refuses payment | COD rejected at delivery | Courier report | Trigger return flow | COD reputation scoring |
| Amount mismatch | Collected ≠ order total | Validation check | Flag for manual review | Courier training |
| Courier fraud | Courier claims collection but no cash | Settlement audit | Suspend courier, investigate | GPS + photo proof (Phase 13) |
| Wallet settlement failure | Wallet service unavailable | Event timeout | Retry settlement | Circuit breaker (Phase 7) |

## Dead-Letter Processing

**Table**: `Logistics_SagaDeadLetter`  
**Retention**: 90 days  
**Manual Review Triggers**:
- No courier available (manual assignment queue)
- COD amount mismatch (fraud investigation)
- Delivery window exceeded (customer contact)
- Courier unresponsive (reassignment)

**Replay Mechanism**: `POST /admin/deliveries/{id}/retry` endpoint

## Monitoring & Alerts

### Critical Metrics (Phase 6)
- `logistics_courier_assignment_duration_seconds` (histogram)
- `logistics_courier_assignment_failures_total` (counter by reason)
- `logistics_delivery_completion_rate` (gauge)
- `logistics_delivery_window_exceeded_total` (counter)
- `logistics_cod_collection_failures_total` (counter by reason)

### Alert Thresholds
- Courier assignment failure rate > 10% for 10 minutes
- Delivery completion rate < 90% for 1 hour
- Delivery window exceeded rate > 5% for 1 hour
- COD collection failure rate > 5% for 10 minutes
