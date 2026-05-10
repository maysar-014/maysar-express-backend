
# Implementation Plan: Product Review System

## Overview

Implement the Product Review and Rating System within the catalog-service, following the existing DDD layered architecture. The implementation proceeds bottom-up: database schema → domain layer → infrastructure layer → application layer → API layer → aggregate enrichment → property-based tests → integration tests.

All new files live under `services/catalog-service/src/` in their respective layer directories. The Prisma schema is at `prisma/schema.prisma`. Tests use the existing Vitest + fast-check setup.

---

## Tasks

- [x] 1. Database schema — add review models and run migration
  - Add `Catalog_ModerationStatus` enum to `prisma/schema.prisma`
  - Add `Catalog_ProductReview` model with `@@unique([productId, buyerId])`, indexes on `[productId, moderationStatus]` and `[buyerId]`, mapped to `catalog_product_reviews`
  - Add `Catalog_ReviewModerationLog` model with relation to `Catalog_ProductReview`, indexes on `[reviewId]` and `[adminId]`, mapped to `catalog_review_moderation_logs`
  - Run `npx prisma migrate dev --name add_product_reviews` to generate and apply the migration
  - Run `npx prisma generate` to regenerate the Prisma client
  - _Requirements: 3.3, 7.5_

- [ ] 2. Domain layer — entities and repository interface
  - [x] 2.1 Create `ProductReview` entity and `ReviewModerationLog` entity
    - Create `services/catalog-service/src/domain/entities/product-review.entity.ts`
    - Define `ProductReview` interface/class with fields: `id`, `productId`, `buyerId`, `rating`, `comment`, `moderationStatus`, `submittedAt`, `updatedAt`
    - Define `ReviewModerationLog` interface/class with fields: `id`, `reviewId`, `adminId`, `previousStatus`, `newStatus`, `actionAt`
    - Export `ModerationStatus` type (`'VISIBLE' | 'FLAGGED' | 'HIDDEN'`)
    - _Requirements: 1.5, 7.5_

  - [x] 2.2 Create `ProductReviewRepository` interface
    - Create `services/catalog-service/src/domain/repositories/product-review.repository.interface.ts`
    - Define `ReviewListOptions` interface (`page`, `limit`, `sortBy`)
    - Define `PaginatedReviews` interface (`reviews: ReviewPublicDto[]`, `totalCount`, `totalPages`, `currentPage`, `limit`)
    - Define `ReviewAggregateStats` interface (`averageRating: number | null`, `reviewCount`, `ratingDistribution`)
    - Define `ReviewPublicDto` interface (`id`, `rating`, `comment`, `displayName`, `submittedAt`)
    - Define `ProductReviewRepository` interface with methods: `save`, `findById`, `findByProductId`, `findByBuyerAndProduct`, `getAggregateStats`, `updateModerationStatus`
    - Export all types from `services/catalog-service/src/domain/repositories/repository.interfaces.ts` (re-export or extend)
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.4_

- [ ] 3. Infrastructure layer — Prisma repository implementation
  - [x] 3.1 Implement `PrismaProductReviewRepository`
    - Create `services/catalog-service/src/infrastructure/repositories/prisma-product-review.repository.ts`
    - Implement `save(review)`: upsert via `prisma.catalog_ProductReview.create`; map Prisma record to domain entity
    - Implement `findById(reviewId)`: `prisma.catalog_ProductReview.findUnique`
    - Implement `findByBuyerAndProduct(buyerId, productId)`: `prisma.catalog_ProductReview.findUnique` on `@@unique` constraint
    - Implement `findByProductId(productId, options)`: filter `moderationStatus = VISIBLE`, apply `sortBy` (`submittedAt` or `rating` descending), paginate with `skip`/`take`; enrich each review with `displayName` via a join on `auth_users`; return `PaginatedReviews`
    - Implement `getAggregateStats(productId)`: use `prisma.$queryRaw` with the aggregate SQL from the design (AVG, COUNT, COUNT FILTER per star); return `ReviewAggregateStats`
    - Implement `updateModerationStatus(reviewId, newStatus, adminId, previousStatus)`: wrap in `prisma.$transaction` — update `catalog_product_reviews` and create `catalog_review_moderation_logs` entry
    - Implement purchase verification helper `hasPurchasedProduct(buyerId, productId)`: raw query on `orders` + `order_items` where `status = 'DELIVERED'`
    - Export from `services/catalog-service/src/infrastructure/repositories/index.ts`
    - _Requirements: 2.1, 3.3, 5.1, 6.1, 7.5_

  - [ ]* 3.2 Write unit tests for `PrismaProductReviewRepository`
    - Create `services/catalog-service/src/infrastructure/repositories/__tests__/prisma-product-review.repository.test.ts`
    - Mock `PrismaClient`; test `getAggregateStats` returns `null` averageRating and `0` reviewCount when no VISIBLE reviews exist
    - Test `findByProductId` excludes FLAGGED and HIDDEN reviews
    - Test `updateModerationStatus` writes a moderation log entry in the same transaction
    - _Requirements: 6.3, 7.1, 7.5_

- [ ] 4. Application layer — use cases
  - [x] 4.1 Implement `SubmitProductReviewUseCase`
    - Create `services/catalog-service/src/application/use-cases/submit-product-review.use-case.ts`
    - Constructor: `ProductRepository`, `ProductReviewRepository`
    - Execute steps (in order): load product (404 if missing) → seller self-review check (403 `REVIEW_SELLER_PROHIBITED`) → duplicate check (409 `REVIEW_ALREADY_EXISTS`) → purchase verification via `hasPurchasedProduct` (403 `REVIEW_PURCHASE_REQUIRED`) → validate rating ∈ [1,5] and comment ≤ 2000 chars (422) → persist with `moderationStatus = VISIBLE` and `submittedAt = now()` → return HTTP 201 payload
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3_

  - [ ]* 4.2 Write unit tests for `SubmitProductReviewUseCase`
    - Create `services/catalog-service/src/application/use-cases/__tests__/submit-product-review.use-case.test.ts`
    - Test seller prohibition fires before purchase check (seller with no orders still gets `REVIEW_SELLER_PROHIBITED`)
    - Test valid review is persisted with `VISIBLE` status and correct `submittedAt`
    - Test rating 0 and rating 6 are rejected with 422
    - Test comment of 2001 characters is rejected with 422
    - Test duplicate submission returns 409 `REVIEW_ALREADY_EXISTS`
    - _Requirements: 1.1, 1.2, 1.4, 3.2, 4.3_

  - [x] 4.3 Implement `GetProductReviewsUseCase`
    - Create `services/catalog-service/src/application/use-cases/get-product-reviews.use-case.ts`
    - Constructor: `ProductReviewRepository`
    - Validate `page ≥ 1`, `1 ≤ limit ≤ 50` (422 if invalid); default `page=1`, `limit=10`
    - Delegate to `reviewRepository.findByProductId()` with `sortBy` option
    - Return paginated response with `totalCount`, `totalPages`, `currentPage`, `limit`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.1, 9.2, 9.3, 9.4_

  - [ ]* 4.4 Write unit tests for `GetProductReviewsUseCase`
    - Create `services/catalog-service/src/application/use-cases/__tests__/get-product-reviews.use-case.test.ts`
    - Test default pagination (page=1, limit=10) is applied when params are omitted
    - Test `sortBy=rating` returns reviews ordered by rating descending
    - Test `page=0` and `limit=51` are rejected with 422
    - _Requirements: 5.3, 5.4, 9.2, 9.3_

  - [x] 4.5 Implement `ModerateReviewUseCase`
    - Create `services/catalog-service/src/application/use-cases/moderate-review.use-case.ts`
    - Constructor: `ProductReviewRepository`
    - Verify caller role is `ADMIN` (403 `INSUFFICIENT_PERMISSIONS` if not)
    - Load review (404 `REVIEW_NOT_FOUND` if missing)
    - Call `reviewRepository.updateModerationStatus()` in a transaction that also writes the audit log
    - Return updated review
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 4.6 Write unit tests for `ModerateReviewUseCase`
    - Create `services/catalog-service/src/application/use-cases/__tests__/moderate-review.use-case.test.ts`
    - Test non-admin caller is rejected with 403 `INSUFFICIENT_PERMISSIONS`
    - Test audit log entry is written with correct `adminId`, `previousStatus`, `newStatus`, `actionAt`
    - Test `FLAGGED` review remains in public listing (moderationStatus is FLAGGED, not HIDDEN)
    - _Requirements: 7.2, 7.4, 7.5_

  - [x] 4.7 Export new use cases from application index
    - Add exports for `SubmitProductReviewUseCase`, `GetProductReviewsUseCase`, `ModerateReviewUseCase` to `services/catalog-service/src/application/use-cases/index.ts`
    - _Requirements: 1.6_

- [x] 5. Checkpoint — ensure all unit tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. API layer — controller and routes
  - [x] 6.1 Implement `ReviewController`
    - Create `services/catalog-service/src/api/controllers/review.controller.ts`
    - Follow the same pattern as `ProductController` (constructor injection, `ApiResponse` envelope, `sendValidationError` / `sendNotFoundError` / `sendBusinessRuleError` helpers)
    - `submitReview(req, res)`: extract `productId` from params, `buyerId` from `req.user.id`, body fields; delegate to `SubmitProductReviewUseCase`; map errors to HTTP codes per the error table in the design
    - `getReviews(req, res)`: extract `productId` from params, `page`/`limit`/`sortBy` from query; delegate to `GetProductReviewsUseCase`
    - `moderateReview(req, res)`: extract `reviewId` from params, `newStatus` from body, `adminId` from `req.user.id`; delegate to `ModerateReviewUseCase`
    - _Requirements: 1.6, 5.1, 7.4_

  - [x] 6.2 Create `review.routes.ts`
    - Create `services/catalog-service/src/api/routes/review.routes.ts`
    - Define Zod validation schemas: `submitReviewSchema` (rating integer 1–5, comment optional string max 2000), `getReviewsQuerySchema` (page, limit, sortBy), `moderateReviewSchema` (newStatus enum)
    - Register routes:
      - `POST /v1/products/:id/reviews` — authenticated buyer (`requireRole(['buyer'])`) → `reviewController.submitReview`
      - `GET /v1/products/:id/reviews` — public → `reviewController.getReviews`
      - `PUT /v1/reviews/:reviewId/moderate` — admin only (`requireRole(['admin'])`) → `reviewController.moderateReview`
    - Export `createReviewRoutes(reviewController)` factory function
    - _Requirements: 1.1, 5.1, 7.4, 9.1_

  - [x] 6.3 Wire review routes into catalog-service index
    - Update `services/catalog-service/src/api/routes/index.ts` to import `createReviewRoutes` and mount it in `createCatalogRoutes`
    - Instantiate `ReviewController` with its use case dependencies in the factory
    - _Requirements: 1.6, 5.1_

- [ ] 7. Aggregate enrichment — update product fetch and search use cases
  - [x] 7.1 Update `GetProductUseCase` to include review aggregate stats
    - Modify `services/catalog-service/src/application/use-cases/get-product.use-case.ts`
    - Add `ProductReviewRepository` as an optional constructor parameter
    - In `buildProductDetails`, call `reviewRepository.getAggregateStats(productId)` and merge result into `ProductDetails` as `ratings: { average, count, distribution }`
    - Update `ProductDetails` interface to include the `ratings` field
    - When `reviewRepository` is not provided, default `ratings` to `{ average: null, count: 0, distribution: { 1:0, 2:0, 3:0, 4:0, 5:0 } }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.2 Update `SearchProductsUseCase` to include averageRating and reviewCount
    - Modify `services/catalog-service/src/application/use-cases/search-products.use-case.ts`
    - Add `ProductReviewRepository` as an optional constructor parameter
    - After fetching the result set, batch-call `reviewRepository.getAggregateStats` for each product id and merge `averageRating` and `reviewCount` into each search result item
    - When `reviewRepository` is not provided, default both fields to `null` / `0`
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 7.3 Write unit tests for aggregate enrichment
    - Create `services/catalog-service/src/application/use-cases/__tests__/get-product-aggregate-enrichment.test.ts`
    - Test that `GetProductUseCase` returns `ratings.average = null` and `ratings.count = 0` when no reviews exist
    - Test that `ratings.distribution` values sum to `ratings.count`
    - Test that `SearchProductsUseCase` merges `averageRating` and `reviewCount` for each result
    - _Requirements: 6.3, 6.5_

- [ ] 8. Property-based tests using fast-check
  - [x] 8.1 Write property test for Property 1 — Rating Boundary Invariant
    - Create `services/catalog-service/src/application/use-cases/__tests__/review-properties.test.ts`
    - `// Feature: product-review-system, Property 1: Rating Boundary Invariant`
    - Use `fc.integer({ min: 1, max: 5 })` → assert `validateRating(r)` returns `true`
    - Use `fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 6 }))` → assert `validateRating(r)` returns `false`
    - **Property 1: Rating Boundary Invariant**
    - **Validates: Requirements 1.1, 1.2, 10.5**

  - [x] 8.2 Write property test for Property 2 — Average Rating Invariant
    - In `review-properties.test.ts`
    - `// Feature: product-review-system, Property 2: Average Rating Invariant`
    - Use `fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1 })` → compute expected `round(sum/count, 2)` and assert it equals `computeAverageRating(ratings)`
    - **Property 2: Average Rating Invariant**
    - **Validates: Requirements 6.1, 10.1**

  - [x] 8.3 Write property test for Property 3 — Distribution Sum Invariant
    - In `review-properties.test.ts`
    - `// Feature: product-review-system, Property 3: Distribution Sum Invariant`
    - Use `fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 0 })` → compute distribution and assert `sum(distribution values) === reviewCount`
    - **Property 3: Distribution Sum Invariant**
    - **Validates: Requirements 6.4, 6.5, 10.2**

  - [x] 8.4 Write property test for Property 4 — Empty State Invariant
    - In `review-properties.test.ts`
    - `// Feature: product-review-system, Property 4: Empty State Invariant`
    - For an empty ratings array, assert `averageRating === null`, `reviewCount === 0`, all distribution values `=== 0`
    - **Property 4: Empty State Invariant**
    - **Validates: Requirements 6.3, 10.6**

  - [ ] 8.5 Write property test for Property 5 — Pagination Completeness
    - In `review-properties.test.ts`
    - `// Feature: product-review-system, Property 5: Pagination Completeness`
    - Use `fc.array(fc.record({ id: fc.string(), rating: fc.integer({ min: 1, max: 5 }) }), { minLength: 0, maxLength: 200 })` and `fc.integer({ min: 1, max: 50 })` for limit
    - Paginate the array in-memory across all pages; assert union of page results equals full set with no duplicates and no omissions
    - **Property 5: Pagination Completeness**
    - **Validates: Requirements 9.1, 9.5, 10.3**

  - [x] 8.6 Write property test for Property 6 — One Review Per Buyer Per Product
    - In `review-properties.test.ts`
    - `// Feature: product-review-system, Property 6: One Review Per Buyer Per Product`
    - Use `fc.array(fc.record({ buyerId: fc.string(), productId: fc.string(), rating: fc.integer({ min: 1, max: 5 }) }), { minLength: 1, maxLength: 20 })` with repeated buyer/product pairs
    - Apply the uniqueness logic (simulate the `@@unique` constraint) and assert exactly one record per `(buyerId, productId)` pair
    - **Property 6: One Review Per Buyer Per Product**
    - **Validates: Requirements 3.1, 3.2, 10.4**

  - [x] 8.7 Write property test for Property 7 — Visibility Filter Invariant
    - In `review-properties.test.ts`
    - `// Feature: product-review-system, Property 7: Visibility Filter Invariant`
    - Use `fc.array(fc.record({ id: fc.string(), moderationStatus: fc.constantFrom('VISIBLE', 'FLAGGED', 'HIDDEN'), rating: fc.integer({ min: 1, max: 5 }) }))` → filter to VISIBLE → assert no FLAGGED or HIDDEN reviews appear and aggregate stats only count VISIBLE
    - **Property 7: Visibility Filter Invariant**
    - **Validates: Requirements 5.1, 7.1, 7.3**

  - [x] 8.8 Write property test for Property 8 — Display Name Derivation
    - In `review-properties.test.ts`
    - `// Feature: product-review-system, Property 8: Display Name Derivation`
    - Use `fc.record({ firstName: fc.option(fc.string({ minLength: 1 })), lastName: fc.option(fc.string({ minLength: 1 })), email: fc.emailAddress() })` → assert `resolveDisplayName(user)` equals `firstName + ' ' + lastName` when at least one name is present, and email prefix otherwise; assert result never contains `@`
    - **Property 8: Display Name Derivation**
    - **Validates: Requirements 8.1, 8.2, 8.4**

- [x] 9. Checkpoint — ensure all unit and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integration tests — end-to-end API tests
  - [ ] 10.1 Write integration tests for review submission endpoint
    - Create `services/catalog-service/src/infrastructure/__tests__/integration/product-reviews.integration.test.ts`
    - Use a real Prisma test database (or in-memory SQLite via `prisma-mock` / test container)
    - Test happy path: `POST /api/catalog/v1/products/:id/reviews` with valid buyer, delivered order → HTTP 201, review persisted with `VISIBLE` status
    - Test purchase verification rejection: buyer with no delivered order → HTTP 403 `REVIEW_PURCHASE_REQUIRED`
    - Test duplicate rejection: second submission for same buyer/product → HTTP 409 `REVIEW_ALREADY_EXISTS`
    - Test seller self-review rejection → HTTP 403 `REVIEW_SELLER_PROHIBITED`
    - _Requirements: 1.6, 2.2, 3.2, 4.2_

  - [ ] 10.2 Write integration tests for review listing endpoint
    - In `product-reviews.integration.test.ts`
    - Test `GET /api/catalog/v1/products/:id/reviews` returns only VISIBLE reviews with correct pagination metadata
    - Test `sortBy=rating` returns reviews in descending rating order
    - Test default pagination (page=1, limit=10) is applied when params are omitted
    - _Requirements: 5.1, 5.2, 5.3, 9.2, 9.4_

  - [ ] 10.3 Write integration tests for moderation endpoint
    - In `product-reviews.integration.test.ts`
    - Test `PUT /api/catalog/v1/reviews/:reviewId/moderate` with admin token → HTTP 200, audit log entry written
    - Test non-admin caller → HTTP 403 `INSUFFICIENT_PERMISSIONS`
    - Test HIDDEN review is excluded from subsequent listing and aggregate stats
    - _Requirements: 7.1, 7.4, 7.5_

  - [ ] 10.4 Write integration tests for product aggregate enrichment
    - In `product-reviews.integration.test.ts`
    - Test `GET /api/catalog/v1/products/:id` returns `ratings.average`, `ratings.count`, and `ratings.distribution` after reviews are submitted
    - Test product with no reviews returns `ratings.average = null`, `ratings.count = 0`
    - Test `ratings.distribution` values sum to `ratings.count`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The seller self-review check (Requirement 4.3) must always precede the purchase check in `SubmitProductReviewUseCase`
- The `@@unique([productId, buyerId])` database constraint is the last line of defence against race-condition duplicates (Requirement 3.3)
- `resolveDisplayName` is a pure function that can be extracted to a shared utility and tested independently
- Property tests in task 8 test pure functions extracted from the use cases; they do not require a database
- The `hasPurchasedProduct` helper queries `orders` and `order_items` tables directly via `prisma.$queryRaw` — these tables are accessible because all models share the same Postgres database
