# Catalog Matching Engine

> Intelligent duplicate detection system for marketplace products

## Quick Start

### Installation
```bash
cd services/catalog-service
npm install
```

### Database Setup
```bash
# Run migration
npx prisma migrate dev

# Backfill existing products (optional)
npm run backfill:fingerprints
```

### Usage

```typescript
import { CatalogMatchingEngine } from './domain/engines/catalog-matching.engine';
import { MatchProductUseCase } from './application/use-cases/match-product.use-case';

// Match a product
const result = await matchProductUseCase.execute({
  brand: 'Apple',
  model: 'iPhone 15',
  categoryId: 'cat-123',
  identifiers: { gtin: '0012345678905' },
  sellerId: 'seller-456'
});

if (result.matchFound && !result.confirmationRequired) {
  // Auto-merge
  console.log(`Matched to product: ${result.matchedProductId}`);
} else if (result.confirmationRequired) {
  // Request seller confirmation
  console.log(`Confirmation needed: ${result.confirmationId}`);
} else {
  // Create new product
  console.log('No match found, create new product');
}
```

## Features

- ✅ **Multi-tier Matching**: Exact → Strong → Possible → No Match
- ✅ **Identifier Support**: GTIN, MPN, ISBN
- ✅ **Fingerprint Matching**: Deterministic product signatures
- ✅ **Fuzzy Matching**: 85%+ similarity detection
- ✅ **Seller Confirmation**: Interactive workflow for ambiguous matches
- ✅ **Audit Trail**: Complete decision history
- ✅ **Event-Driven**: Domain events for all matching outcomes

## Architecture

```
Domain Layer
├── algorithms/          # Pure functions (normalization, fingerprint, similarity)
├── value-objects/       # ProductIdentifiers, ProductFingerprint, MatchResult
├── entities/            # Product (extended with matching fields)
├── engines/             # CatalogMatchingEngine, MatchCriteriaBuilder
├── policies/            # CatalogMatchingPolicy
└── events/              # Domain events

Application Layer
├── dto/                 # Request/Response contracts
└── use-cases/           # MatchProduct, ConfirmMatch, CreateWithMatching

Infrastructure Layer
├── repositories/        # Prisma implementations
└── messaging/           # Event publishers

API Layer
├── controllers/         # HTTP handlers
└── routes/              # Express routes
```

## Matching Strategy

| Level | Trigger | Score | Action | Example |
|-------|---------|-------|--------|---------|
| **EXACT** | Identifier match | 100 | Auto-merge | Same GTIN |
| **STRONG** | Fingerprint match | 95 | Auto-merge | Same normalized product |
| **POSSIBLE** | Similarity >85% | 85-95 | Confirm | "iPhone 15" vs "iPhone 15 Pro" |
| **NO_MATCH** | No candidates | 0 | Create new | Genuinely new product |

## API Endpoints

### Match Product
```http
POST /api/catalog/products/match
```

### Confirm Match
```http
POST /api/catalog/products/match/confirm/:confirmationId
```

### Get Pending Confirmations
```http
GET /api/catalog/products/match/pending
```

### Get Audit Trail
```http
GET /api/catalog/products/match/audit/:productId
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- normalization.algorithm.test

# Run with coverage
npm test -- --coverage
```

## Configuration

```env
# .env
CATALOG_SIMILARITY_THRESHOLD=0.85
CATALOG_CONFIRMATION_TIMEOUT_HOURS=24
CATALOG_MAX_CANDIDATES=5
CATALOG_MATCHING_ENABLED=true
```

## Documentation

- [Technical Documentation](./docs/CATALOG_MATCHING_ENGINE.md) - Complete technical reference
- [Seller Guide](./docs/SELLER_MATCHING_GUIDE.md) - User-facing documentation
- [API Reference](./docs/API.md) - Endpoint specifications

## Performance

- **Identifier Match**: O(1) - Direct index lookup
- **Fingerprint Match**: O(1) - Index lookup
- **Similarity Match**: O(n) - Where n = products in category with same brand

**Optimization**: Similarity search limited to same-brand products within category

## Migration Guide

### From Existing System

1. **Run Migration**
   ```bash
   npx prisma migrate deploy
   ```

2. **Backfill Fingerprints**
   ```bash
   npm run backfill:fingerprints
   ```

3. **Enable Feature Flag**
   ```env
   CATALOG_MATCHING_ENABLED=true
   ```

4. **Monitor Metrics**
   - Match rate
   - Auto-merge rate
   - False positive rate

## Contributing

### Adding New Matching Criteria

1. Update `MatchCriteria` interface in `match-result.value-object.ts`
2. Extend `MatchCriteriaBuilder` to populate new criteria
3. Update `CatalogMatchingEngine` matching logic
4. Add tests

### Improving Normalization

1. Update `NormalizationAlgorithm`
2. Add brand mappings to canonical names
3. Test with real product data
4. Consider fingerprint version bump if changes are significant

## License

MIT

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/maysar-backend/issues)
- **Email**: support@marketplace.com
- **Docs**: [Full Documentation](./docs/)
