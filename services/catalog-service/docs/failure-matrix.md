# Catalog Service - Failure Matrix

## ProductPublishingSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Validate Data | Missing required fields | Return 400 error | N/A | 0 (immediate) |
| Validate Data | Invalid category | Return 400 error | N/A | 0 (immediate) |
| Catalog Matching | Matching engine timeout | Skip matching, create new product | 10s | 3 retries |
| Catalog Matching | Ambiguous matches (multiple high confidence) | Flag for manual review | N/A | Manual review |
| Create Product | Duplicate product ID | Return existing (idempotent) | N/A | 0 (success) |
| Create Product | Database timeout | Retry with backoff | 5s | 5 retries |
| Create Listing | Duplicate listing | Return existing (idempotent) | N/A | 0 (success) |
| Create Listing | Seller not found | Return 404 error | N/A | 0 (immediate) |
| Buy-Box Calculation | No eligible listings | Skip (no winner) | N/A | 0 (expected) |
| Buy-Box Calculation | Computation timeout | Retry with backoff | 5s | 3 retries |
| Emit Event | Outbox write failure | Rollback, retry | 2s | 5 retries |

## CampaignLifecycleSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Validate Config | Invalid discount percentage | Return 400 error | N/A | 0 (immediate) |
| Validate Config | Date range invalid | Return 400 error | N/A | 0 (immediate) |
| Validate Config | No eligible products | Return 400 error | N/A | 0 (immediate) |
| Apply Pricing | Database timeout | Revert prices, retry | 30s | 3 retries |
| Apply Pricing | Partial batch failure | Revert all, retry | 30s | 3 retries |
| Schedule Deactivation | Scheduler unavailable | Manual deactivation | 5s | Manual review |
| Revert Pricing | Database timeout | Retry with backoff | 30s | 5 retries |

## BulkProductUpdateSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Validate Request | Product IDs not found | Return 404 error | N/A | 0 (immediate) |
| Validate Request | Invalid update fields | Return 400 error | N/A | 0 (immediate) |
| Batch Update | Database timeout | Revert to snapshot, retry | 60s | 3 retries |
| Batch Update | Partial batch failure | Log failures, continue | 60s | 0 (continue) |
| Buy-Box Recalc | Computation timeout | Log error, continue | 120s | 0 (continue) |
| Emit Event | Outbox failure | Retry with backoff | 2s | 5 retries |

## BuyBoxRecalculationSaga Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Fetch Listings | No active listings | Skip (no winner) | N/A | 0 (expected) |
| Fetch Listings | Database timeout | Retry with backoff | 5s | 5 retries |
| Filter Eligible | Inventory service timeout | Use cached availability | 10s | 3 retries |
| Filter Eligible | All listings out-of-stock | Skip (no winner) | N/A | 0 (expected) |
| Compute Winner | Tie score (multiple winners) | Select by listing ID (deterministic) | N/A | 0 (resolved) |
| Compute Winner | Computation error | Log error, use previous winner | 5s | 3 retries |
| Update Cache | Redis timeout | Skip cache, update database only | 2s | 0 (non-critical) |
| Update Cache | Database timeout | Retry with backoff | 2s | 5 retries |
| Emit Event | Outbox failure | Retry with backoff | 2s | 5 retries |

## Catalog Matching Failure Modes

| Scenario | Failure Mode | Detection | Resolution | Prevention |
|----------|--------------|-----------|------------|------------|
| Low confidence | No matches found (confidence <0.70) | Threshold check | Create new product | Lower threshold (manual review) |
| Ambiguous match | Multiple matches ≥0.85 confidence | Duplicate high scores | Flag for manual review | Improve matching algorithm |
| False positive | Incorrect auto-merge | Seller report | Manual split, refund affected orders | Raise threshold to 0.90 |
| Matching timeout | Engine takes >10s | Timeout handler | Skip matching, create new product | Optimize matching algorithm |

## Buy-Box Computation Failure Modes

| Scenario | Failure Mode | Detection | Resolution | Prevention |
|----------|--------------|-----------|------------|------------|
| No eligible listings | All listings out-of-stock or inactive | `filterEligible` returns empty | Display "Out of Stock" | Notify sellers to restock |
| Price deviation | Winner price >5% above median | Scoring algorithm | Lower score, may lose buy-box | Price optimization alerts |
| Stale cache | Redis cache outdated | TTL expiry (60s) | Recompute on cache miss | Invalidate on relevant events |
| Computation timeout | Complex scoring takes >5s | Timeout handler | Use previous winner | Optimize scoring algorithm |

## Search Index Failure Modes

| Step | Failure Mode | Compensation | Recovery Worker Timeout | Dead-Letter Threshold |
|------|--------------|--------------|------------------------|----------------------|
| Index Update | Search service unavailable | Queue for retry | 10s | 5 retries |
| Index Update | Partial index failure | Log error, continue | 10s | 0 (continue) |
| Search Query | Index stale | Fallback to database query | N/A | 0 (fallback) |
| Search Query | Query timeout | Return cached results | 5s | 0 (fallback) |

## Dead-Letter Processing

**Table**: `Catalog_SagaDeadLetter`  
**Retention**: 90 days  
**Manual Review Triggers**:
- Ambiguous catalog matches (multiple high confidence)
- Campaign pricing failures (partial batch)
- Buy-box computation persistent failures

**Replay Mechanism**: `POST /admin/catalog/sagas/{id}/retry` endpoint

## Monitoring & Alerts

### Critical Metrics (Phase 6)
- `catalog_matching_duration_seconds` (histogram)
- `catalog_matching_confidence` (histogram)
- `buybox_computation_duration_seconds` (histogram)
- `buybox_cache_hit_rate` (gauge)
- `catalog_publish_failures_total` (counter by reason)

### Alert Thresholds
- Catalog matching timeout rate > 5% for 5 minutes
- Buy-box computation timeout rate > 5% for 5 minutes
- Buy-box cache hit rate < 80% for 10 minutes
- Product publish failure rate > 2% for 5 minutes
