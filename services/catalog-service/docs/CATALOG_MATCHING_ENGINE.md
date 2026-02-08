# Catalog Matching Engine - Technical Documentation

## Overview

The Catalog Matching Engine is a sophisticated system designed to prevent duplicate product entries in the marketplace catalog. It uses a multi-tier matching strategy combining exact identifier matching, fingerprint-based matching, and fuzzy similarity matching.

## Architecture

### Clean Architecture Layers

```
┌─────────────────────────────────────────┐
│          API Layer (HTTP)               │
│  Controllers, Routes, Middleware        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      Application Layer (Use Cases)      │
│  MatchProduct, ConfirmMatch, DTOs       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      Domain Layer (Business Logic)      │
│  Algorithms, Engines, Policies, Events  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   Infrastructure Layer (External)       │
│  Prisma Repositories, EventBus          │
└─────────────────────────────────────────┘
```

## Matching Strategy

### 1. Exact Match (Score: 100)
**Trigger**: Identical product identifiers (GTIN, MPN, or ISBN)

**Action**: Auto-merge without confirmation

**Use Case**: Same product from different sellers

**Example**:
```typescript
Candidate: { gtin: "0012345678905" }
Existing:  { gtin: "0012345678905" }
Result: EXACT match → Auto-merge
```

### 2. Strong Match (Score: 95)
**Trigger**: Identical fingerprint within same category

**Action**: Auto-merge without confirmation

**Use Case**: Same product with minor description variations

**Fingerprint Composition**:
- Normalized brand
- Normalized model
- Category ID
- Core attributes (processor, capacity, etc.)
- Excludes: color, size, seller-specific data

**Example**:
```typescript
Candidate: { brand: "Apple", model: "iPhone 15", category: "phones" }
Existing:  { brand: "APPLE", model: "iphone 15", category: "phones" }
Result: STRONG match (same fingerprint) → Auto-merge
```

### 3. Possible Match (Score: 85-95)
**Trigger**: High similarity (>85%) in brand + model within category

**Action**: Request seller confirmation

**Use Case**: Similar but potentially different products

**Example**:
```typescript
Candidate: { brand: "Apple", model: "iPhone 15 Pro" }
Existing:  { brand: "Apple", model: "iPhone 15 Pro Max" }
Similarity: 92%
Result: POSSIBLE match → Requires confirmation
```

### 4. No Match (Score: 0)
**Trigger**: No candidates meet matching criteria

**Action**: Create new product

**Use Case**: Genuinely new product

## Core Components

### Algorithms

#### NormalizationAlgorithm
Ensures consistent data representation:

```typescript
normalizeText("  HELLO World!  ") 
// → "hello world"

normalizeIdentifier("12-34-56", "GTIN") 
// → "00000000123456"

normalizeBrand("Hewlett Packard") 
// → "hp"
```

#### FingerprintAlgorithm
Generates deterministic product signatures:

```typescript
generateFingerprint({
  brand: "Apple",
  model: "iPhone 15",
  categoryId: "phones",
  attributes: { storage: "256GB" }
})
// → "a1b2c3d4..." (SHA-256 hash)
```

**Versioning**: Fingerprints include version number for algorithm evolution

#### SimilarityAlgorithm
Calculates string similarity:

```typescript
calculateStringSimilarity("iPhone 15 Pro", "iPhone 15 Pro Max")
// → 0.92 (92% similar)

// Combines:
// - Levenshtein distance (60% weight)
// - Jaccard similarity (40% weight)
```

### Value Objects

#### ProductIdentifiers
```typescript
const ids = new ProductIdentifiers({
  gtin: "123456",
  mpn: "ABC-123",
  isbn: "978-0-123456-78-9"
});

ids.hasAnyIdentifier() // → true
ids.equals(otherIds)    // → true if any match
```

#### ProductFingerprint
```typescript
const fp = ProductFingerprint.generate({
  brand: "Apple",
  model: "iPhone 15",
  categoryId: "phones"
});

fp.matches(otherFp) // → true if identical
```

#### MatchResult
```typescript
const result = new MatchResult({
  level: MatchLevel.EXACT,
  score: 100,
  matchedProductId: "prod-123",
  criteria: { identifierMatch: true },
  requiresConfirmation: false
});

result.shouldAutoMerge() // → true
```

### Engines

#### CatalogMatchingEngine
Main matching orchestrator:

```typescript
const result = CatalogMatchingEngine.matchProduct(
  candidate,
  existingProducts
);

// Returns MatchResult with:
// - level: EXACT | STRONG | POSSIBLE | NO_MATCH
// - score: 0-100
// - matchedProductId (if found)
// - criteria (what matched)
// - requiresConfirmation (boolean)
```

**Algorithm**:
1. Check identifier equality → EXACT
2. Check fingerprint equality → STRONG
3. Calculate similarity → POSSIBLE (if >85%)
4. Default → NO_MATCH

#### MatchCriteriaBuilder
Builds transparent audit trail:

```typescript
const criteria = MatchCriteriaBuilder.buildCriteria(
  candidate,
  existingProduct
);

// Returns:
{
  identifierMatch: true,
  matchedField: "gtin",
  fingerprintMatch: false,
  brandMatch: true,
  modelMatch: true,
  similarityScore: 0.92
}
```

### Policies

#### CatalogMatchingPolicy
Business rules for decision-making:

```typescript
CatalogMatchingPolicy.canAutoMerge(result)
// → true for EXACT/STRONG, false otherwise

CatalogMatchingPolicy.requiresSellerConfirmation(result)
// → true for POSSIBLE matches

CatalogMatchingPolicy.getConfirmationTimeout()
// → 24 hours
```

## API Endpoints

### Match Product
```http
POST /api/catalog/products/match
Content-Type: application/json

{
  "brand": "Apple",
  "model": "iPhone 15",
  "categoryId": "cat-123",
  "identifiers": {
    "gtin": "0012345678905"
  },
  "attributes": {
    "storage": "256GB",
    "color": "Black"
  }
}
```

**Response (Exact Match)**:
```json
{
  "matchFound": true,
  "confirmationRequired": false,
  "matchedProductId": "prod-456",
  "matchLevel": "EXACT"
}
```

**Response (Possible Match)**:
```json
{
  "matchFound": false,
  "confirmationRequired": true,
  "matchLevel": "POSSIBLE",
  "confirmationId": "conf-789",
  "candidates": [{
    "productId": "prod-456",
    "brand": "Apple",
    "model": "iPhone 15 Pro Max",
    "similarityScore": 0.92,
    "matchedFields": ["brand", "model"]
  }]
}
```

### Confirm Match
```http
POST /api/catalog/products/match/confirm/:confirmationId
Content-Type: application/json

{
  "choice": "confirm",
  "selectedProductId": "prod-456"
}
```

**Response**:
```json
{
  "success": true,
  "actionTaken": "merged",
  "finalProductId": "prod-456"
}
```

## Database Schema

### Catalog_Product Extensions
```prisma
model Catalog_Product {
  // ... existing fields
  
  gtin                String?  @db.VarChar(14)
  mpn                 String?  @db.VarChar(100)
  isbn                String?  @db.VarChar(13)
  fingerprint         String?  @db.VarChar(64)
  fingerprintVersion  Int?     @default(1)
  brand               String?  @db.VarChar(100)
  model               String?  @db.VarChar(100)
  
  @@index([gtin])
  @@index([mpn])
  @@index([isbn])
  @@unique([categoryId, fingerprint])
}
```

### Catalog_ProductMatchAudit
```prisma
model Catalog_ProductMatchAudit {
  id                  String   @id @default(uuid())
  candidateProductId  String
  matchedProductId    String?
  matchLevel          Catalog_MatchLevel
  matchScore          Decimal  @db.Decimal(5, 2)
  matchingCriteria    Json
  decision            Catalog_MatchDecision
  decidedBy           Catalog_MatchDecidedBy
  sellerId            String
  metadata            Json?
  createdAt           DateTime @default(now())
}
```

### Catalog_MatchConfirmation
```prisma
model Catalog_MatchConfirmation {
  id                String                      @id @default(uuid())
  auditId           String
  sellerId          String
  candidateProducts Json
  status            Catalog_ConfirmationStatus
  sellerChoice      String?
  expiresAt         DateTime
  respondedAt       DateTime?
  createdAt         DateTime                    @default(now())
}
```

## Events

### Domain Events
```typescript
// Published on successful match
ProductMatchFoundEvent {
  sellerId: string
  candidate: ProductCandidate
  matchResult: MatchResult
}

// Published when confirmation needed
ProductMatchConfirmationRequiredEvent {
  sellerId: string
  candidate: ProductCandidate
  matchResult: MatchResult
  confirmationId: string
}

// Published on seller confirmation
ProductMatchConfirmedEvent {
  sellerId: string
  confirmationId: string
  confirmedProductId: string
}

// Published on seller rejection
ProductMatchRejectedEvent {
  sellerId: string
  confirmationId: string
}

// Published on new product creation
NewProductCreatedEvent {
  productId: string
  sellerId: string
  matchResult: MatchResult
}
```

## Testing

### Unit Tests
- **Algorithms**: 3 test files (normalization, fingerprint, similarity)
- **Value Objects**: 1 test file (identifiers, fingerprint, match result)
- **Engines**: 1 test file (matching engine)
- **Policies**: 1 test file (matching policy)

### Integration Tests
- **Use Cases**: End-to-end workflow testing with mocked repositories

### Running Tests
```bash
cd services/catalog-service
npm test
```

## Performance Considerations

### Indexing Strategy
- **GTIN/MPN/ISBN**: Individual indexes for fast identifier lookups
- **Fingerprint + Category**: Composite unique index for fingerprint matching
- **Brand + Category**: Composite index for similarity search

### Query Optimization
1. **Identifier Match**: Direct index lookup (O(1))
2. **Fingerprint Match**: Index lookup (O(1))
3. **Similarity Match**: Category + brand filter, then in-memory similarity (O(n) where n = products in category with same brand)

### Scalability
- Fingerprint generation is CPU-bound but cacheable
- Similarity calculations limited to same-brand products
- Audit records can be archived after 90 days

## Configuration

### Environment Variables
```env
# Matching thresholds
CATALOG_SIMILARITY_THRESHOLD=0.85
CATALOG_CONFIRMATION_TIMEOUT_HOURS=24
CATALOG_MAX_CANDIDATES=5

# Feature flags
CATALOG_MATCHING_ENABLED=true
CATALOG_AUTO_MERGE_ENABLED=true
```

## Monitoring & Metrics

### Key Metrics
- **Match Rate**: % of products finding matches
- **Auto-Merge Rate**: % of EXACT/STRONG matches
- **Confirmation Rate**: % of POSSIBLE matches
- **False Positive Rate**: Incorrect auto-merges (requires manual review)
- **Confirmation Response Time**: Time to seller decision

### Alerts
- High false positive rate (>1%)
- Low confirmation response rate (<50%)
- Fingerprint collision rate (>0.01%)

## Migration & Deployment

### Database Migration
```bash
cd services/catalog-service
npx prisma migrate dev --name add_catalog_matching
```

### Backfill Fingerprints
```bash
npm run backfill:fingerprints
```

### Feature Flag Rollout
1. Deploy with `CATALOG_MATCHING_ENABLED=false`
2. Backfill existing products
3. Enable for 10% of sellers
4. Monitor metrics
5. Gradual rollout to 100%

## Troubleshooting

### Common Issues

**Issue**: Fingerprint collisions
**Solution**: Review category-specific attributes, consider version bump

**Issue**: Low similarity scores for same products
**Solution**: Review normalization rules, add brand mappings

**Issue**: High confirmation abandonment
**Solution**: Reduce confirmation timeout, improve UI clarity

## Future Enhancements

1. **ML-based matching**: Train model on confirmed matches
2. **Image similarity**: Compare product images
3. **Attribute extraction**: Auto-extract brand/model from titles
4. **Bulk matching**: Match entire seller catalogs at once
5. **Cross-category matching**: Detect miscategorized products
