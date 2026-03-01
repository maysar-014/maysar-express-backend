# Catalog Service - Events

## Events Emitted

### ProductPublished
- **Topic**: `product.published`
- **Payload**: `{ productId, sellerId, title, category, basePrice, variants[] }`
- **Consumers**: inventory-service (create stock records), search-indexer
- **Durability**: Persisted in `Catalog_OutboxEvent`

### BuyBoxUpdated
- **Topic**: `buybox.updated`
- **Payload**: `{ productId, winnerListingId, winnerSellerId, price, score, previousWinnerId }`
- **Consumers**: search-indexer (update featured listing), analytics-service

### PriceChanged
- **Topic**: `price.changed`
- **Payload**: `{ listingId, productId, oldPrice, newPrice, reason, adjustmentFactor }`
- **Consumers**: notification-service (price drop alerts), analytics-service

### CampaignActivated
- **Topic**: `campaign.activated`
- **Payload**: `{ campaignId, name, discountPercentage, eligibleProducts[], startDate, endDate }`
- **Consumers**: notification-service, order-service (apply discounts)

### MatchConfirmed
- **Topic**: `catalog.match.confirmed`
- **Payload**: `{ listingId, matchedProductId, confidence, mergedBy }`
- **Consumers**: analytics-service, seller-notification-service

## Events Consumed

### StockReserved
- **Topic**: `inventory.reserved`
- **Source**: inventory-service
- **Handler**: Updates listing availability status
- **Idempotency**: `EventIdempotency.withIdempotency` (Phase 2)

### StockCommitted
- **Topic**: `inventory.committed`
- **Source**: inventory-service
- **Handler**: Increments sold count, triggers buy-box recalculation

### OrderCompleted
- **Topic**: `order.completed`
- **Source**: order-service
- **Handler**: Updates seller rating, triggers buy-box recalculation

### SellerRatingUpdated
- **Topic**: `seller.rating.updated`
- **Source**: review-service
- **Handler**: Triggers buy-box recalculation for seller's listings

## Retry Policy
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (Phase 3)
- Dead-letter threshold: 5 retries
- Dead-letter topic: `catalog.dlq`

## Idempotency Strategy
- Product publish keyed by `publish-{sellerId}-{productId}`
- Buy-box update keyed by `buybox-{productId}-{timestamp}`
- Price change keyed by `price-{listingId}-{newPrice}`

## Cache Invalidation
- **Buy-Box Cache**: Invalidated on `StockCommitted`, `SellerRatingUpdated`, `PriceChanged`
- **TTL**: 60s (automatic expiry)
- **Warm-Up**: Pre-compute buy-box for top 1000 products on service start
