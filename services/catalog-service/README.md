# Catalog Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Product discovery, buy-box computation, catalog matching, pricing, and promotional campaigns. Consolidated from separate pricing and campaign services.

## Purpose

The Catalog Service drives marketplace liquidity through intelligent seller selection and competitive pricing. It owns product discovery (search, browse), the buy-box algorithm that selects the winning seller for each product, catalog deduplication via the matching engine, dynamic pricing strategies, and promotional campaigns.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # BuyBoxEngine, CatalogMatchingEngine, PricingEngine, SearchEngine
├── application/      # Use cases: SearchProducts, ComputeBuyBox, CreateListing, RunCampaign
├── infrastructure/   # Prisma repositories, Redis cache, Meilisearch adapter
└── api/              # Express routes and controllers
```

## Key Domain Concepts

- **Buy Box**: Single winning seller selected per product via weighted scoring (price 40%, rating, availability, recency). 60s Redis TTL. Increases conversion 15–25%.
- **Catalog Matching**: `CatalogMatchingEngine` deduplicates listings with 0.85 confidence threshold for auto-merge.
- **Search**: `OptimizedSearchEngine` targeting 50–100 QPS/instance, 128 MB heap cap, p95 < 200ms.
- **Pricing Strategies**: Competitive, Cost-Plus, Dynamic with wholesale tier discounts.
- **Campaigns**: Promotional campaigns linked to listings.

## Dependencies

| Service | Reason |
|---------|--------|
| inventory-service | Stock availability for buy-box eligibility |
| order-service | Sales data for pricing optimization |
| Redis | Buy-box winner cache, search index |

## API Endpoints

```
GET    /api/catalog/products              # Search and browse products
GET    /api/catalog/products/:id          # Get product details with buy-box winner
POST   /api/catalog/listings              # Create seller listing
PUT    /api/catalog/listings/:id          # Update listing
GET    /api/catalog/products/:id/buy-box  # Get current buy-box winner
POST   /api/catalog/campaigns             # Create promotional campaign
GET    /api/catalog/campaigns/:id         # Get campaign details
GET    /health                            # Health check
```

## Database Schema

| Model | Description |
|-------|-------------|
| `Catalog_Product` | Product master data |
| `Catalog_ProductVariant` | SKU-level variants |
| `Catalog_Listing` | Seller listings (many per product) |
| `Catalog_BuyBox` | Cached buy-box winners |
| `Catalog_Campaign` | Promotional campaigns |
| `Catalog_OutboxEvent` | Event durability |

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:catalog-service
npm run test:catalog-service:unit
npm run test:catalog-service:integration
npm run test:catalog-service:coverage
```

## Documentation

| File | Description |
|------|-------------|
| [docs/service-overview.md](docs/service-overview.md) | Purpose, domain concepts, dependencies |
| [docs/events.md](docs/events.md) | Published and consumed events |
| [docs/sagas.md](docs/sagas.md) | Saga definitions |
| [docs/failure-matrix.md](docs/failure-matrix.md) | Failure modes and compensations |
| [docs/scaling-strategy.md](docs/scaling-strategy.md) | Scaling approach |
| [docs/revenue-impact.md](docs/revenue-impact.md) | Business value |
| [docs/modeling/](docs/modeling/) | Sequence diagrams, state machines, use cases |
