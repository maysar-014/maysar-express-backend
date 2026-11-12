# Requirements Document

## Introduction

The catalog service currently documents `GET /v1/products/:id` as accepting both a system UUID and a
human-readable slug, but the implementation only calls `findById` — slug resolution is silently
absent. A separate `getProductBySlug` controller method exists as dead code: it bypasses the
repository layer, accesses raw Prisma directly, and has no route registered for it.

This feature closes the gap by:

1. Removing the dead `getProductBySlug` method from `ProductController`.
2. Making `getProduct` (the handler for `GET /v1/products/:id`) perform **transparent identifier
   resolution**: try `findById` first, fall back to `findBySlug` if the result is null.
3. Ensuring the fallback uses the proper `ProductRepository` layer (which already exposes
   `findBySlug`), not raw Prisma.
4. Extending `GetProductUseCase` so the resolution logic lives in the use-case layer, keeping the
   controller thin.
5. Adding property-based tests that verify the transparent-resolution invariant: a product
   reachable by ID must also be reachable by its slug, and vice versa.

The pattern mirrors the existing seller storefront feature, where
`GET /api/catalog/sellers/:sellerId/storefront` transparently resolves either a UUID or a slug
without requiring a separate endpoint.

---

## Glossary

- **Product_Controller**: The `ProductController` class in
  `services/catalog-service/src/api/controllers/product.controller.ts`.
- **Get_Product_Use_Case**: The `GetProductUseCase` class in
  `services/catalog-service/src/application/use-cases/get-product.use-case.ts`.
- **Product_Repository**: The `ProductRepository` interface defined in
  `services/catalog-service/src/domain/interfaces.ts` and implemented by `PrismaProductRepository`.
- **Prisma_Product_Repository**: The concrete class in
  `services/catalog-service/src/infrastructure/repositories/prisma-product.repository.ts`.
- **Identifier**: The `:id` path parameter supplied to `GET /v1/products/:id`. It is treated
  opaquely — the caller may pass either a system product ID or a URL slug.
- **System_ID**: A structured identifier produced by the ID generator (e.g. `prod_01ABCDEF…`).
- **Slug**: A human-readable, URL-safe string uniquely identifying a published product
  (e.g. `juma-mens-leather-sandals`).
- **Dead_Code**: The existing `getProductBySlug` controller method, which has no registered route
  and bypasses the repository layer.
- **Transparent_Resolution**: Accepting either a System_ID or a Slug in the same parameter and
  returning the same response shape regardless of which form is supplied.
- **Repository_Layer**: The abstraction over Prisma provided by `Product_Repository` /
  `Prisma_Product_Repository`, used by use-case classes.

---

## Requirements

### Requirement 1: Remove Dead Code

**User Story:** As a maintainer, I want the dead `getProductBySlug` controller method removed, so
that the codebase has a single, correct resolution path and no misleading bypass of the repository
layer.

#### Acceptance Criteria

1. THE `Product_Controller` SHALL NOT contain a method named `getProductBySlug` after this change
   is applied.
2. THE `Product_Controller` SHALL NOT contain any direct access to a raw Prisma client via
   `(this.db as any)?.product` within product-lookup logic.
3. WHEN the catalog service is started, THE catalog service SHALL register no route for
   `/api/catalog/v1/products/by-slug/:slug`.

---

### Requirement 2: Transparent Identifier Resolution in the Use Case

**User Story:** As a developer, I want `GetProductUseCase` to transparently resolve both System_IDs
and Slugs, so that callers do not need to know which identifier type they hold.

#### Acceptance Criteria

1. WHEN `Get_Product_Use_Case` receives a request whose `productId` field matches an existing
   product by System_ID, THE `Get_Product_Use_Case` SHALL return that product with status
   `"success"`.
2. WHEN `Get_Product_Use_Case` receives a request whose `productId` field does not match any
   product by System_ID, THE `Get_Product_Use_Case` SHALL attempt to resolve the identifier as a
   Slug using `Product_Repository.findBySlug`.
3. WHEN the Slug fallback in criterion 2 finds a matching product, THE `Get_Product_Use_Case` SHALL
   return that product with status `"success"`.
4. WHEN both `Product_Repository.findById` and `Product_Repository.findBySlug` return null for the
   same Identifier, THE `Get_Product_Use_Case` SHALL return status `"not_found"`.
5. THE `Get_Product_Use_Case` SHALL resolve identifiers exclusively through the
   `Product_Repository` interface — it SHALL NOT access the Prisma client directly.

---

### Requirement 3: Product Repository Interface Exposes `findBySlug`

**User Story:** As a developer, I want the `ProductRepository` domain interface to declare
`findBySlug`, so that any future repository implementation must support slug-based lookup.

#### Acceptance Criteria

1. THE `Product_Repository` interface SHALL declare a `findBySlug(slug: string): Promise<DomainRecord | null>` method.
2. THE `Prisma_Product_Repository` SHALL implement `findBySlug` by querying only products whose
   `status` is `"published"` or `"updated"`.
3. WHEN `Prisma_Product_Repository.findBySlug` is called with a slug that matches no published or
   updated product, THE `Prisma_Product_Repository` SHALL return `null`.

---

### Requirement 4: HTTP Layer Passes the Identifier Unchanged

**User Story:** As an API consumer, I want `GET /v1/products/:id` to accept either a System_ID or a
Slug without any change to the request shape, so that existing clients calling by ID continue to
work and clients that know only the Slug can also retrieve the product.

#### Acceptance Criteria

1. WHEN a request is made to `GET /v1/products/:id` with a valid System_ID, THE catalog service
   SHALL respond with HTTP 200 and the product DTO.
2. WHEN a request is made to `GET /v1/products/:id` with a valid Slug, THE catalog service SHALL
   respond with HTTP 200 and the product DTO.
3. WHEN a request is made to `GET /v1/products/:id` with an Identifier that matches neither a
   System_ID nor a Slug, THE catalog service SHALL respond with HTTP 404.
4. THE `Product_Controller.getProduct` handler SHALL pass the raw `:id` path parameter to
   `Get_Product_Use_Case` without pre-processing or type-sniffing.
5. THE catalog service SHALL return an identical response shape (same DTO structure) regardless of
   whether the Identifier was a System_ID or a Slug.

---

### Requirement 5: Transparent Resolution Invariant (Property-Based Tests)

**User Story:** As a quality engineer, I want property-based tests that verify the transparent
resolution invariant, so that any regression in the fallback logic is caught automatically.

#### Acceptance Criteria

1. FOR ALL products that exist in the repository, IF a product is reachable by its System_ID THEN
   THE resolution mechanism SHALL also return that same product when the product's Slug is supplied
   as the Identifier.
2. FOR ALL products that exist in the repository, IF a product is reachable by its Slug THEN THE
   resolution mechanism SHALL also return that same product when the product's System_ID is supplied
   as the Identifier.
3. FOR ALL Identifiers that resolve to a product via `findById`, THE resolved product SHALL be
   identical to the product resolved via `findBySlug` using that product's slug field (round-trip
   property).
4. WHEN `findById` returns a non-null result for an Identifier, THE `Get_Product_Use_Case` SHALL
   NOT call `findBySlug` — the fallback SHALL be skipped (no unnecessary repository call).
5. THE property-based tests SHALL use an in-memory mock of `Product_Repository` so that no
   database connection is required during test execution.
