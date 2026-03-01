# Catalog Service - Scaling Strategy

## Performance Envelope (Phase 8)

### Per-Instance Capacity
- **QPS**: 50-100 requests/second
- **Heap**: 128 MB cap
- **Latency Targets**:
  - Product search (p95): <200ms
  - Buy-box computation (p95): <200ms
  - Catalog matching (p95): <500ms

### Bottlenecks
1. **Buy-Box Computation**: O(n log n) per product (n = competing listings)
2. **Catalog Matching**: O(m) per product (m = existing products in category)
3. **Search Index**: Full-text search on large catalog

## Buy-Box Caching Strategy

### Cache Configuration
- **Storage**: Redis
- **Key Pattern**: `buybox:{productId}`
- **TTL**: 60s
- **Warm-Up**: Pre-compute top 1000 products on service start

### Cache Invalidation Triggers
- `StockCommitted` event (inventory change)
- `SellerRatingUpdated` event (rating change)
- `PriceChanged` event (price change)
- `ListingActivated` event (new competitor)

### Cache Hit Rate Target
- **Target**: 90% hit rate
- **Current**: 85% (from Phase 8 testing)
- **Impact**: 10x latency reduction (20ms cached vs. 200ms computed)

## Database Indexes (Phase 8)

### B-Tree Indexes
- `CREATE INDEX idx_products_id ON Catalog_Product(productId);`
- `CREATE INDEX idx_variants_id ON Catalog_ProductVariant(productVariantId);`
- `CREATE INDEX idx_listings_product ON Catalog_Listing(productId, status) WHERE status = 'ACTIVE';`
- `CREATE INDEX idx_listings_seller ON Catalog_Listing(sellerId, status);`
- `CREATE INDEX idx_buybox_product ON Catalog_BuyBox(productId);`

### Composite Indexes
- `CREATE INDEX idx_listings_buybox ON Catalog_Listing(productId, price, rating, status) WHERE status = 'ACTIVE';`
- `CREATE INDEX idx_products_category ON Catalog_Product(category, createdAt DESC);`

## Horizontal Scaling

### Stateless Design
- Catalog-service pods are fully stateless
- Scale behind nginx upstream: `upstream catalog_service { server catalog-service:3005; }`
- Session affinity: Not required (Redis cache shared)

### Scaling Commands
```bash
# Scale catalog-service pods
docker-compose up -d --scale catalog-service=3
```

### Buy-Box Warm-Up Job
- **Single-leader requirement**: Only one instance runs warm-up on start
- **Leader election**: Redis distributed lock
  - Lock key: `catalog:warmup:leader`
  - TTL: 300s (5 minutes)
  - Failover: Not critical (cache will populate on-demand)

## Resource Limits

From `docker-compose.prod.yml` (Phase 8):
```yaml
catalog-service:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

## Expected QPS

### Launch (Month 1)
- **Product Search**: 100 requests/s
- **Product Detail**: 50 requests/s (buy-box lookup)
- **Product Publish**: 5 requests/s
- **Buy-Box Recalculation**: 10 requests/s (event-driven)

### Scale Target (10K orders/day)
- **Product Search**: 1000 requests/s
- **Product Detail**: 500 requests/s
- **Product Publish**: 50 requests/s
- **Buy-Box Recalculation**: 100 requests/s

## Search Engine Optimization

### OptimizedSearchEngine Strategy
- **Sharding**: Shard catalog by category (10 shards)
- **Bulk Reindex**: Run nightly to sync with database
- **Incremental Update**: Real-time updates on product publish

### Sharding Configuration
```typescript
const shard = hash(category) % 10;
const searchIndex = `catalog:search:shard:${shard}`;
```

### Reindex Procedure
1. Create new index: `catalog:search:shard:{n}:new`
2. Bulk load from database (batch size: 1000)
3. Atomic swap: `RENAME catalog:search:shard:{n}:new catalog:search:shard:{n}`
4. Delete old index

## Catalog Matching Optimization

### Current Performance
- **Latency**: 500ms (p95) for 10,000 products in category
- **Algorithm**: Fuzzy string matching + attribute comparison
- **Bottleneck**: O(m) comparison (m = products in category)

### Optimization (Deferred to Phase 13)
1. **Pre-Filter by Category**: Reduce m from 10,000 to 500
2. **Inverted Index**: Index by brand, model, key attributes
3. **Approximate Matching**: Use MinHash for fast similarity
4. **Target Latency**: <100ms (p95)

## Monitoring

### Prometheus Metrics (Phase 6)
- `catalog_search_duration_seconds` (histogram)
- `catalog_buybox_computation_duration_seconds` (histogram)
- `catalog_buybox_cache_hit_rate` (gauge)
- `catalog_matching_duration_seconds` (histogram)
- `catalog_matching_confidence` (histogram)
- `catalog_products_total` (gauge)
- `catalog_listings_total` (gauge by status)

### Jaeger Tracing (Phase 6)
- Distributed trace per request: API → catalog-service → Redis/PostgreSQL
- Span tags: `product.id`, `buybox.cached`, `search.shard`

### Alerts
- Buy-box cache hit rate < 80% for 10 minutes
- Buy-box computation latency p95 > 500ms for 5 minutes
- Catalog matching latency p95 > 1s for 5 minutes
- Search query latency p95 > 500ms for 5 minutes

## Performance Benchmarks (from Phase 8 load testing)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Product search (p50) | <100ms | 80ms | ✅ |
| Product search (p95) | <200ms | 150ms | ✅ |
| Buy-box computation (p50) | <100ms | 90ms | ✅ |
| Buy-box computation (p95) | <200ms | 180ms | ✅ |
| Buy-box cache hit rate | >85% | 85% | ✅ |
| Catalog matching (p95) | <500ms | 450ms | ✅ |
| Throughput (single instance) | 50 QPS | 60 QPS | ✅ |

## Load Shedding Strategy

### Circuit Breaker for Catalog Matching
- **Trigger**: Matching latency p95 > 1s for 1 minute
- **Action**: Skip matching, create new product
- **Duration**: 60s
- **Fallback**: Manual review queue for potential duplicates

### Rate Limiting (Phase 7)
- **Endpoint**: `POST /products` (product publish)
- **Limit**: 100 requests/minute per seller
- **Storage**: Redis sliding window counter
- **Response**: 429 Too Many Requests
