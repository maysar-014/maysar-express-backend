# Design Document: Product Review System

## Overview

The Product Review and Rating System adds buyer-generated reviews and star ratings to the Maysar marketplace. Buyers who have received a delivered order can submit a rating (1–5) and an optional comment for any product in that order. Reviews are publicly visible on product pages, contribute to aggregate rating metrics surfaced on product listings, and can be moderated by platform administrators.

The feature is implemented entirely within the **catalog-service**, following the existing Domain-Driven Design (DDD) layered architecture: domain entities and interfaces, application use cases, infrastructure repositories, and API controllers/routes. No new microservice is introduced.

### Key Design Decisions

1. **Single-service ownership** — All review logic lives in the catalog-service. Purchase verification queries the shared Prisma database directly (cross-schema query on `Order_Order` / `Order_OrderItem`), avoiding a synchronous inter-service call.
2. **Aggregate enrichment at query time** — `averageRating`, `reviewCount`, and `ratingDistribution` are computed by a single aggregation query when a product is fetched, rather than being maintained as denormalized columns. This keeps the data consistent without requiring event-driven updates.
3. **Moderation status drives visibility** — The `VISIBLE` / `FLAGGED` / `HIDDEN` enum is the single source of truth for whether a review appears in listings and aggregates. `FLAGGED` reviews remain visible to buyers but are surfaced to admins for action.
4. **Database-level uniqueness** — A `@@unique([productId, buyerId])` constraint on `Catalog_ProductReview` prevents duplicate reviews even under concurrent submissions.
5. **Seller check before purchase check** — The `SubmitProductReviewUseCase` applies the seller self-review guard first, so sellers always receive `REVIEW_SELLER_PROHIBITED` regardless of their order history.

---

## Architecture

The feature follows the same layered structure used by all other catalog-service features:

```
┌─────────────────────────────────────────────────────────────────┐
│  API Layer (Express)                                            │
│  ReviewController  ←  review.routes.ts                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Application Layer                                              │
│  SubmitProductReviewUseCase                                     │
│  GetProductReviewsUseCase                                       │
│  ModerateReviewUseCase                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Domain Layer                                                   │
│  ProductReview (entity)                                         │
│  ProductReviewRepository (interface)                            │
│  ReviewModerationLog (entity)                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Infrastructure Layer                                           │
│  PrismaProductReviewRepository                                  │
│  (cross-schema queries: Order_Order, Order_OrderItem)           │
└─────────────────────────────────────────────────────────────────┘
```

### Aggregate Enrichment Flow

```
GET /products/:id
       │
       ▼
GetProductUseCase.execute()
       │
       ├─► productRepository.findById()          → product record
       │
       └─► reviewRepository.getAggregateStats()  → { averageRating, reviewCount, ratingDistribution }
                                                    (single SQL GROUP BY query)
```

---

## Components and Interfaces

### Domain Entity: `ProductReview`

```typescript
interface ProductReview {
  id: string;
  productId: string;
  buyerId: string;
  rating: number;           // integer [1, 5]
  comment: string | null;   // max 2000 chars
  moderationStatus: 'VISIBLE' | 'FLAGGED' | 'HIDDEN';
  submittedAt: Date;
  updatedAt: Date;
}
```

### Domain Entity: `ReviewModerationLog`

```typescript
interface ReviewModerationLog {
  id: string;
  reviewId: string;
  adminId: string;
  previousStatus: 'VISIBLE' | 'FLAGGED' | 'HIDDEN';
  newStatus: 'VISIBLE' | 'FLAGGED' | 'HIDDEN';
  actionAt: Date;
}
```

### Repository Interface: `ProductReviewRepository`

```typescript
interface ProductReviewRepository {
  // Write
  save(review: ProductReview): Promise<ProductReview>;

  // Read
  findById(reviewId: string): Promise<ProductReview | null>;
  findByProductId(productId: string, options: ReviewListOptions): Promise<PaginatedReviews>;
  findByBuyerAndProduct(buyerId: string, productId: string): Promise<ProductReview | null>;

  // Aggregates
  getAggregateStats(productId: string): Promise<ReviewAggregateStats>;

  // Moderation
  updateModerationStatus(
    reviewId: string,
    newStatus: ModerationStatus,
    adminId: string,
    previousStatus: ModerationStatus
  ): Promise<ProductReview>;
}

interface ReviewListOptions {
  page: number;           // min 1
  limit: number;          // min 1, max 50
  sortBy: 'submittedAt' | 'rating';
}

interface PaginatedReviews {
  reviews: ReviewPublicDto[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

interface ReviewAggregateStats {
  averageRating: number | null;
  reviewCount: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}
```

### Use Case: `SubmitProductReviewUseCase`

Input: `{ productId, buyerId, rating, comment? }`

Execution steps:
1. Load product from `ProductRepository` → 404 if not found
2. **Seller check**: if `product.sellerId === buyerId` → throw `REVIEW_SELLER_PROHIBITED` (403)
3. **Duplicate check**: `reviewRepository.findByBuyerAndProduct()` → throw `REVIEW_ALREADY_EXISTS` (409) if found
4. **Purchase check**: query `Order_Order` joined with `Order_OrderItem` where `buyerId`, `productId`, `status = DELIVERED` → throw `REVIEW_PURCHASE_REQUIRED` (403) if none found
5. **Validation**: rating ∈ [1,5], comment ≤ 2000 chars → throw 422 if invalid
6. Persist review with `moderationStatus = VISIBLE`, `submittedAt = now()`
7. Return created review (HTTP 201)

### Use Case: `GetProductReviewsUseCase`

Input: `{ productId, page, limit, sortBy? }`

Execution steps:
1. Validate pagination params (page ≥ 1, 1 ≤ limit ≤ 50) → 422 if invalid
2. `reviewRepository.findByProductId()` filtering `moderationStatus = VISIBLE`
3. Sort by `submittedAt DESC` (default) or `rating DESC` (when `sortBy=rating`)
4. Enrich each review with `displayName` derived from user profile
5. Return paginated response with metadata

### Use Case: `ModerateReviewUseCase`

Input: `{ reviewId, newStatus, adminId }`

Execution steps:
1. Verify caller has `ADMIN` role → 403 `INSUFFICIENT_PERMISSIONS` if not
2. Load review → 404 if not found
3. Record previous status
4. Update `moderationStatus` and write `ReviewModerationLog` entry in a single transaction
5. Return updated review

### Controller: `ReviewController`

Handles HTTP request/response mapping for all three use cases. Follows the same pattern as `ProductController` — validates request shape, delegates to use case, maps result to HTTP response.

### Display Name Resolution

```typescript
function resolveDisplayName(user: { firstName?: string; lastName?: string; email: string }): string {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }
  return user.email.split('@')[0];
}
```

---

## Data Models

### Prisma Schema Additions

```prisma
enum Catalog_ModerationStatus {
  VISIBLE
  FLAGGED
  HIDDEN
}

model Catalog_ProductReview {
  id               String                    @id @default(cuid()) @db.VarChar(64)
  productId        String                    @db.VarChar(64)
  buyerId          String                    @db.VarChar(64)
  rating           Int
  comment          String?
  moderationStatus Catalog_ModerationStatus  @default(VISIBLE)
  submittedAt      DateTime                  @default(now()) @db.Timestamp(6)
  updatedAt        DateTime                  @updatedAt @db.Timestamp(6)

  moderationLogs   Catalog_ReviewModerationLog[]

  @@unique([productId, buyerId])
  @@index([productId, moderationStatus])
  @@index([buyerId])
  @@map("catalog_product_reviews")
}

model Catalog_ReviewModerationLog {
  id             String                   @id @default(cuid()) @db.VarChar(64)
  reviewId       String                   @db.VarChar(64)
  adminId        String                   @db.VarChar(64)
  previousStatus Catalog_ModerationStatus
  newStatus      Catalog_ModerationStatus
  actionAt       DateTime                 @default(now()) @db.Timestamp(6)

  review         Catalog_ProductReview    @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@index([reviewId])
  @@index([adminId])
  @@map("catalog_review_moderation_logs")
}
```

### Purchase Verification Query

```sql
SELECT COUNT(*) FROM orders o
JOIN order_items oi ON oi."orderId" = o.id
WHERE o."buyerId" = $1
  AND oi."productId" = $2
  AND o.status = 'DELIVERED'
LIMIT 1;
```

This query uses the existing `Order_Order` (mapped to `orders`) and `Order_OrderItem` (mapped to `order_items`) tables. The catalog-service Prisma client has access to these tables because all models share the same database.

### Aggregate Stats Query

```sql
SELECT
  ROUND(AVG(rating)::numeric, 2)  AS "averageRating",
  COUNT(*)                         AS "reviewCount",
  COUNT(*) FILTER (WHERE rating = 1) AS "dist1",
  COUNT(*) FILTER (WHERE rating = 2) AS "dist2",
  COUNT(*) FILTER (WHERE rating = 3) AS "dist3",
  COUNT(*) FILTER (WHERE rating = 4) AS "dist4",
  COUNT(*) FILTER (WHERE rating = 5) AS "dist5"
FROM catalog_product_reviews
WHERE "productId" = $1
  AND "moderationStatus" = 'VISIBLE';
```

### DTO: `ReviewPublicDto`

```typescript
interface ReviewPublicDto {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string;
  submittedAt: string;   // ISO 8601 UTC
}
```

No `buyerId`, `email`, or other PII is included in this DTO.

### Product DTO Enrichment

`GetProductUseCase` is updated to call `reviewRepository.getAggregateStats(productId)` and merge the result into the response:

```typescript
// Added to ProductDetailsDto
ratings: {
  average: number | null;   // averageRating
  count: number;            // reviewCount
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
};
```

`SearchProductsUseCase` is updated to batch-fetch aggregate stats for all products in the result set and merge `averageRating` and `reviewCount` into each `SearchResult`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Rating Boundary Invariant

*For any* integer rating value `r`, the review submission SHALL be accepted if and only if `r` is in the inclusive range [1, 5]; for all other values (including non-integers, values < 1, and values > 5), the submission SHALL be rejected with HTTP 422.

**Validates: Requirements 1.1, 1.2, 10.5**

---

### Property 2: Average Rating Invariant

*For any* non-empty set of VISIBLE ratings `{r₁, r₂, …, rₙ}` for a product, the returned `averageRating` SHALL equal `round(sum(rᵢ) / n, 2)` (arithmetic mean rounded to two decimal places).

**Validates: Requirements 6.1, 10.1**

---

### Property 3: Distribution Sum Invariant

*For any* product, the sum of all values in `ratingDistribution` (keys 1 through 5) SHALL equal `reviewCount`.

**Validates: Requirements 6.4, 6.5, 10.2**

---

### Property 4: Empty State Invariant

*For any* product with zero VISIBLE reviews, the returned `averageRating` SHALL be `null` and `reviewCount` SHALL be `0`, and all `ratingDistribution` values SHALL be `0`.

**Validates: Requirements 6.3, 10.6**

---

### Property 5: Pagination Completeness

*For any* fixed set of VISIBLE reviews for a product and any valid `limit` value in [1, 50], iterating through all pages (page = 1, 2, …, ceil(totalCount / limit)) SHALL yield a union of review IDs that is exactly equal to the set of all VISIBLE review IDs for that product, with no duplicates and no omissions.

**Validates: Requirements 9.1, 9.5, 10.3**

---

### Property 6: One Review Per Buyer Per Product

*For any* buyer and product, regardless of how many review submission attempts are made (including concurrent attempts), exactly one review record SHALL be persisted in the database.

**Validates: Requirements 3.1, 3.2, 10.4**

---

### Property 7: Visibility Filter Invariant

*For any* product listing response, every review in the response SHALL have `moderationStatus = VISIBLE`; no review with `moderationStatus = FLAGGED` or `HIDDEN` SHALL appear in the public listing or contribute to `averageRating`, `reviewCount`, or `ratingDistribution`.

**Validates: Requirements 5.1, 7.1, 7.3**

---

### Property 8: Display Name Derivation

*For any* reviewer, the `displayName` in the review response SHALL equal `firstName + " " + lastName` when at least one name field is present, and SHALL equal the email prefix (characters before `@`) when both name fields are absent. The response SHALL never contain the reviewer's email address, user ID, or any other PII.

**Validates: Requirements 8.1, 8.2, 8.4**

---

## Error Handling

| Scenario | HTTP Status | Error Code |
|---|---|---|
| Rating outside [1, 5] | 422 | `VALIDATION_ERROR` |
| Comment exceeds 2000 chars | 422 | `VALIDATION_ERROR` |
| Invalid pagination params | 422 | `VALIDATION_ERROR` |
| Product not found | 404 | `PRODUCT_NOT_FOUND` |
| Review not found | 404 | `REVIEW_NOT_FOUND` |
| Seller attempts self-review | 403 | `REVIEW_SELLER_PROHIBITED` |
| No qualifying DELIVERED order | 403 | `REVIEW_PURCHASE_REQUIRED` |
| Duplicate review submission | 409 | `REVIEW_ALREADY_EXISTS` |
| Non-admin attempts moderation | 403 | `INSUFFICIENT_PERMISSIONS` |
| Database unique constraint violation (race condition) | 409 | `REVIEW_ALREADY_EXISTS` |

All error responses follow the existing `ApiResponse` envelope:

```json
{
  "success": false,
  "error": {
    "code": "REVIEW_PURCHASE_REQUIRED",
    "message": "You must have a delivered order for this product to submit a review."
  }
}
```

---

## Testing Strategy

### Unit Tests (example-based)

- `SubmitProductReviewUseCase`: seller prohibition check fires before purchase check; valid review is persisted with `VISIBLE` status and correct `submittedAt`; HTTP 201 returned on success.
- `GetProductReviewsUseCase`: default pagination (page=1, limit=10); `sortBy=rating` returns descending rating order; `sortBy=submittedAt` (default) returns descending timestamp order.
- `ModerateReviewUseCase`: non-admin caller is rejected; audit log entry is written with correct fields; `FLAGGED` review remains in public listing.
- `resolveDisplayName`: firstName + lastName concatenation; email prefix fallback when both name fields are null.
- `PrismaProductReviewRepository.getAggregateStats`: returns `null` averageRating and `0` reviewCount for a product with no VISIBLE reviews.

### Property-Based Tests

Property-based testing is appropriate for this feature because the core logic — rating validation, aggregate computation, pagination, and uniqueness enforcement — involves pure functions with well-defined universal properties over large input spaces.

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (TypeScript, already used in the ecosystem)

**Minimum iterations**: 100 per property test

**Tag format**: `// Feature: product-review-system, Property N: <property text>`

| Property | Test Description |
|---|---|
| Property 1 | Generate integers in [1,5] → accept; integers outside [1,5] → reject |
| Property 2 | Generate random rating arrays; verify `averageRating = round(sum/count, 2)` |
| Property 3 | Generate random rating arrays; verify `sum(distribution) === reviewCount` |
| Property 4 | Empty rating set → `averageRating = null`, `reviewCount = 0` |
| Property 5 | Generate random review sets and limit values; paginate all pages; verify union = full set |
| Property 6 | Attempt multiple submissions for same buyer/product; verify exactly one record persists |
| Property 7 | Generate mixed-status review sets; verify listing contains only VISIBLE reviews |
| Property 8 | Generate random user name/email combos; verify `displayName` derivation and absence of PII |

### Integration Tests

- `POST /api/catalog/v1/products/:id/reviews` with a real Prisma test database: end-to-end happy path, purchase verification rejection, duplicate rejection.
- `GET /api/catalog/v1/products/:id/reviews`: pagination metadata correctness, sort order.
- `PUT /api/catalog/v1/reviews/:reviewId/moderate`: admin-only access, audit log written.
- `GET /api/catalog/v1/products/:id`: `averageRating`, `reviewCount`, and `ratingDistribution` are present and correct after reviews are submitted.
