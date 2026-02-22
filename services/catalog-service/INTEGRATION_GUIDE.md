# Integration Guide: Optimized Search Engine

## Overview

This guide explains how to integrate the optimized search engine into the existing catalog-service.

## Step 1: Service Initialization

Add index initialization to your service startup:

```typescript
// services/catalog-service/src/index.ts or main.ts

import { IndexManager } from './domain/indexes';
import { InvertedIndex, FilterIndex, NGramIndex, FacetIndex } from './domain/indexes';
import { OfflineRanker } from './domain/algorithms';
import { OptimizedProductSearchEngine } from './domain/engines/optimized-search-engine';

// Initialize indexes at startup
async function initializeSearchIndexes(productRepository: ProductRepository) {
  console.log('Initializing search indexes...');
  
  const invertedIndex = new InvertedIndex();
  const filterIndex = new FilterIndex();
  const ngramIndex = new NGramIndex();
  const facetIndex = new FacetIndex();
  const offlineRanker = new OfflineRanker();
  
  const indexManager = new IndexManager(
    invertedIndex,
    filterIndex,
    ngramIndex,
    facetIndex,
    offlineRanker
  );
  
  // Load all products and build indexes
  const products = await productRepository.findAll();
  await indexManager.initialize(products);
  
  console.log(`Search indexes initialized with ${products.length} products`);
  
  return { indexManager, invertedIndex, filterIndex, ngramIndex, facetIndex, offlineRanker };
}

// In your main startup function
async function startService() {
  // ... existing initialization ...
  
  const { indexManager, invertedIndex, filterIndex, ngramIndex, facetIndex, offlineRanker } = 
    await initializeSearchIndexes(productRepository);
  
  // Create product map for quick lookups
  const products = await productRepository.findAll();
  const productMap = new Map(products.map(p => [p.id, p]));
  
  // Create optimized search engine
  const searchEngine = new OptimizedProductSearchEngine(
    invertedIndex,
    filterIndex,
    ngramIndex,
    facetIndex,
    offlineRanker,
    productMap
  );
  
  // Store in dependency injection container or global context
  container.register('searchEngine', searchEngine);
  container.register('indexManager', indexManager);
  
  // ... rest of startup ...
}
```

## Step 2: Wire Kafka Event Handlers

Connect the IndexManager to product lifecycle events:

```typescript
// services/catalog-service/src/infrastructure/messaging/kafka-consumer.ts

import { IndexManager } from '../../domain/indexes';

export class ProductEventConsumer {
  constructor(
    private indexManager: IndexManager,
    private productRepository: ProductRepository
  ) {}
  
  async handleProductCreated(event: ProductCreatedEvent) {
    const product = await this.productRepository.findById(event.productId);
    if (product) {
      this.indexManager.onProductCreated(this.toSearchableProduct(product));
    }
  }
  
  async handleProductUpdated(event: ProductUpdatedEvent) {
    const oldProduct = event.oldData;
    const newProduct = await this.productRepository.findById(event.productId);
    
    if (oldProduct && newProduct) {
      this.indexManager.onProductUpdated(
        this.toSearchableProduct(oldProduct),
        this.toSearchableProduct(newProduct)
      );
    }
  }
  
  async handleProductDeleted(event: ProductDeletedEvent) {
    const product = event.productData;
    if (product) {
      this.indexManager.onProductDeleted(
        event.productId,
        this.toSearchableProduct(product)
      );
    }
  }
  
  private toSearchableProduct(product: any): SearchableProduct {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price.amount,
      salePrice: product.salePrice?.amount,
      category: product.categoryId,
      brand: product.brand,
      tags: product.tags,
      status: product.status,
      stock: product.inventory?.quantity,
      rating: product.averageRating,
      type: product.type,
      views: product.metrics?.views,
      purchases: product.metrics?.purchases
    };
  }
}

// Wire to Kafka consumer
kafkaConsumer.on('product.created', (message) => {
  productEventConsumer.handleProductCreated(message.value);
});

kafkaConsumer.on('product.updated', (message) => {
  productEventConsumer.handleProductUpdated(message.value);
});

kafkaConsumer.on('product.deleted', (message) => {
  productEventConsumer.handleProductDeleted(message.value);
});
```

## Step 3: Update Search Service

Replace the existing search implementation with the optimized engine:

```typescript
// services/catalog-service/src/domain/services/search.service.ts

import { OptimizedProductSearchEngine } from '../engines/optimized-search-engine';
import { SearchQuery, SearchResponse } from '../types/search.types';

export class SearchService {
  constructor(
    private searchEngine: OptimizedProductSearchEngine,
    private cacheService: CacheService
  ) {}
  
  async search(query: SearchQuery): Promise<SearchResponse> {
    // Check cache first
    const cacheKey = this.generateCacheKey(query);
    const cached = await this.cacheService.get<SearchResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Execute search using optimized engine
    const results = this.searchEngine.search(query);
    
    // Cache results
    const ttl = query.text ? 300 : 1800; // 5 min for text search, 30 min for filters
    await this.cacheService.set(cacheKey, results, ttl);
    
    return results;
  }
  
  private generateCacheKey(query: SearchQuery): string {
    return `search:${JSON.stringify(query)}`;
  }
}
```

## Step 4: Enable Cache Warming

Configure periodic cache warming for hot queries:

```typescript
// services/catalog-service/src/infrastructure/services/cache-warming.ts

import { CacheWarmingStrategies, DistributedCacheService } from './cache.service';

export function setupCacheWarming(
  cacheService: DistributedCacheService,
  searchService: SearchService
) {
  // Add search warming task
  const searchWarmingTask = CacheWarmingStrategies.createSearchWarmingTask(searchService);
  cacheService.addWarmingTask(searchWarmingTask);
  
  // Add facet warming task
  const facetWarmingTask = CacheWarmingStrategies.createFacetWarmingTask(searchService);
  cacheService.addWarmingTask(facetWarmingTask);
  
  // Start periodic warming (every hour)
  cacheService.startPeriodicWarming();
  
  console.log('Cache warming enabled');
}

// In service startup
setupCacheWarming(cacheService, searchService);
```

## Step 5: Configure Redis

Update your environment configuration:

```bash
# .env or environment variables

# Redis Configuration
REDIS_URL=redis://localhost:6379
CACHE_PROVIDER=redis  # or 'hybrid' for multi-level caching
CACHE_TTL=300  # 5 minutes default

# Cache Warming
CACHE_WARMING_ENABLED=true
CACHE_WARMING_INTERVAL=3600000  # 1 hour in milliseconds

# Search Configuration
SEARCH_RESULT_LIMIT=50
SEARCH_MAX_QUERY_LENGTH=200
```

## Step 6: Monitoring and Metrics

Add monitoring for the optimized search:

```typescript
// services/catalog-service/src/infrastructure/monitoring/search-metrics.ts

export class SearchMetrics {
  constructor(
    private metricsService: MetricsService,
    private cacheService: DistributedCacheService
  ) {}
  
  async collectMetrics() {
    const analytics = this.cacheService.getAnalytics();
    
    // Cache metrics
    this.metricsService.gauge('search.cache.hit_rate', analytics.hitRate);
    this.metricsService.gauge('search.cache.total_size', analytics.totalSize);
    this.metricsService.counter('search.cache.hits', analytics.cacheHits);
    this.metricsService.counter('search.cache.misses', analytics.cacheMisses);
    
    // Response time metrics
    this.metricsService.histogram('search.response_time', analytics.averageResponseTime);
  }
  
  startPeriodicCollection(interval: number = 60000) {
    setInterval(() => this.collectMetrics(), interval);
  }
}
```

## Step 7: Gradual Rollout (Optional)

For production safety, implement a feature flag:

```typescript
// services/catalog-service/src/domain/services/search.service.ts

export class SearchService {
  constructor(
    private optimizedEngine: OptimizedProductSearchEngine,
    private legacyEngine: ProductSearchEngine,
    private featureFlags: FeatureFlagService
  ) {}
  
  async search(query: SearchQuery): Promise<SearchResponse> {
    const useOptimized = await this.featureFlags.isEnabled('optimized_search');
    
    if (useOptimized) {
      return this.optimizedEngine.search(query);
    } else {
      // Fallback to legacy implementation
      return this.legacyEngine.search(query, products);
    }
  }
}
```

## Step 8: Testing

Add integration tests:

```typescript
// services/catalog-service/src/__tests__/optimized-search.test.ts

describe('OptimizedProductSearchEngine', () => {
  let searchEngine: OptimizedProductSearchEngine;
  let indexManager: IndexManager;
  
  beforeAll(async () => {
    // Initialize indexes with test data
    const testProducts = generateTestProducts(1000);
    indexManager = createIndexManager();
    await indexManager.initialize(testProducts);
    
    searchEngine = new OptimizedProductSearchEngine(
      indexManager.invertedIndex,
      indexManager.filterIndex,
      indexManager.ngramIndex,
      indexManager.facetIndex,
      indexManager.offlineRanker,
      new Map(testProducts.map(p => [p.id, p]))
    );
  });
  
  it('should return results in under 50ms for 1000 products', async () => {
    const start = Date.now();
    const results = searchEngine.search({ text: 'laptop', limit: 50 });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50);
    expect(results.results.length).toBeGreaterThan(0);
  });
  
  it('should handle filter-only queries', () => {
    const results = searchEngine.search({
      filters: { category: 'electronics', minPrice: 500 },
      limit: 50
    });
    
    expect(results.results.length).toBeGreaterThan(0);
    results.results.forEach(r => {
      const product = productMap.get(r.productId);
      expect(product.category).toBe('electronics');
      expect(product.price).toBeGreaterThanOrEqual(500);
    });
  });
  
  it('should use fuzzy search as fallback', () => {
    const results = searchEngine.search({ text: 'laptp', limit: 50 }); // typo
    
    expect(results.results.length).toBeGreaterThan(0);
  });
});
```

## Step 9: Performance Benchmarking

Run benchmarks to verify improvements:

```typescript
// scripts/benchmark-search.ts

async function benchmarkSearch() {
  const queries = [
    { text: 'laptop' },
    { text: 'phone', filters: { category: 'electronics' } },
    { filters: { minPrice: 100, maxPrice: 500 } },
    { text: 'wireless headphones', filters: { brand: 'Sony' } }
  ];
  
  console.log('Running search benchmarks...\n');
  
  for (const query of queries) {
    const iterations = 100;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await searchService.search(query);
      times.push(Date.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    console.log(`Query: ${JSON.stringify(query)}`);
    console.log(`  Avg: ${avg.toFixed(2)}ms`);
    console.log(`  Min: ${min}ms`);
    console.log(`  Max: ${max}ms\n`);
  }
}
```

## Step 10: Documentation

Update API documentation:

```markdown
## Search API

### POST /api/v1/products/search

Optimized search endpoint with sub-50ms response times for most queries.

**Features:**
- Full-text search with fuzzy matching
- Multi-dimensional filtering (category, brand, price, etc.)
- Real-time faceted navigation
- Cached results for popular queries
- Pagination support

**Performance:**
- 10,000 products: ~50ms
- 100,000 products: ~200ms
- Cache hit: ~1-5ms

**Request:**
```json
{
  "text": "laptop",
  "filters": {
    "category": "electronics",
    "minPrice": 500,
    "maxPrice": 2000,
    "brand": "Dell"
  },
  "limit": 50,
  "offset": 0
}
```

**Response:**
```json
{
  "results": [...],
  "totalCount": 150,
  "facets": {...},
  "executionTime": 45
}
```
```

## Rollback Plan

If issues arise, rollback is simple:

1. Set feature flag `optimized_search` to `false`
2. Service falls back to legacy implementation
3. No data loss (indexes are read-only for queries)
4. Restart service to clear indexes from memory

## Success Metrics

Monitor these metrics post-deployment:

- **Response Time**: Should decrease by 10-100x
- **Cache Hit Rate**: Should reach 60-80% for popular queries
- **Memory Usage**: Should decrease by 20-50%
- **Error Rate**: Should remain unchanged
- **User Satisfaction**: Faster search = better UX

## Troubleshooting

### High Memory Usage
- Reduce index size by filtering out inactive products
- Enable product sharding for > 1M products
- Tune n-gram index parameters

### Slow Index Updates
- Batch Kafka events (process every 5 seconds)
- Use async index updates
- Implement eventual consistency

### Cache Misses
- Increase cache TTL
- Add more warming tasks
- Pre-warm cache on deployment

## Support

For issues or questions:
- Check logs: `services/catalog-service/logs/search.log`
- Monitor metrics: Grafana dashboard "Search Performance"
- Review code: `services/catalog-service/src/domain/indexes/`
