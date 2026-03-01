# Catalog Service - Service Overview

## Purpose
Owns product discovery, matching, buy-box computation, pricing, and campaigns. Consolidated from separate pricing and campaign services (Phase 10). Drives marketplace liquidity through intelligent seller selection and competitive pricing.

## Key Domain Concepts

### Buy Box
- **Definition**: Single winning seller selected from competing listings for same product
- **Algorithm**: Weighted scoring (price 40%, rating, availability, recency)
- **Purpose**: Increases conversion rate by 15-25% vs. unranked list
- **Cache**: 60s TTL in Redis per product

### Catalog Matching
- **Engine**: `CatalogMatchingEngine` deduplicates listings
- **Confidence Threshold**: 0.85 for auto-merge
- **Data Moat**: Improves with each listing added

### Search & Discovery
- **Engines**: `SearchEngine`, `OptimizedSearchEngine`
- **Performance**: 50-100 QPS/instance, 128 MB heap cap
- **Indexes**: B-Tree on `productId`, `productVariantId` (Phase 8)

### Pricing
- **Strategies**: Competitive, Cost-Plus, Dynamic
- **Wholesale Tiers**: Volume-based discounts
- **Adjustment Engine**: Real-time price optimization

## Primary Dependencies
- **inventory-service**: Stock availability for buy-box eligibility
- **order-service**: Sales data for pricing optimization
- **Redis**: Buy-box winner cache, search index

## Entry Point
`services/catalog-service/src/index.ts`

## Key Engines
- `BuyBoxEngine`: Seller selection algorithm
- `CatalogMatchingEngine`: Duplicate detection
- `SearchEngine`: Product discovery
- `PricingEngine`: Price optimization

## Database Schema
- `Catalog_Product`: Product master data
- `Catalog_ProductVariant`: SKU-level variants
- `Catalog_Listing`: Seller listings (many per product)
- `Catalog_BuyBox`: Cached buy-box winners
- `Catalog_Campaign`: Promotional campaigns
- `Catalog_OutboxEvent`: Event durability (Phase 1)

## Configuration
- Event Bus: InMemoryEventBus with retry/backoff
- Outbox: Transactional outbox per service
- Redis: Buy-box cache, search index
- PostgreSQL: Primary data store with B-Tree indexes (Phase 8)

## Performance Envelope (Phase 8)
- **QPS**: 50-100 per instance
- **Heap**: 128 MB cap
- **Latency**: p95 < 200ms (buy-box computation)
