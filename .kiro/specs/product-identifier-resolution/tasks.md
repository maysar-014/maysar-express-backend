# Implementation Plan: product-identifier-resolution

## Overview

Four targeted file changes that wire transparent identifier resolution into the existing
`GetProductUseCase` while removing the dead `getProductBySlug` controller method. No new
routes, no schema migrations, no new dependencies.

## Tasks

- [x] 1. Extend `ProductRepository` interface with `findBySlug`
  - In `services/catalog-service/src/domain/interfaces.ts`, add the method declaration to the `ProductRepository` interface immediately after `findById`, following the identical JSDoc pattern already used by `CategoryRepository.findBySlug`:
    ```typescript
    /**
     * Find a published product by its URL slug.
     * @param slug URL-safe product slug
     * @returns Promise resolving to product or null
     */
    findBySlug(slug: string): Promise<DomainRecord | null>;
    ```
  - No changes to `PrismaProductRepository` — it already implements this method; adding the declaration makes the existing implementation formally compliant with the interface.
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2. Add transparent resolution fallback to `GetProductUseCase`
  - [x] 2.1 Update `execute()` in `services/catalog-service/src/application/use-cases/get-product.use-case.ts`
    - Change `const product = await this.productRepository.findById(request.productId)` to `let`
    - Immediately after that line, add: `if (!product) { product = await this.productRepository.findBySlug(request.productId); }`
    - The subsequent `if (!product)` not-found guard and everything below it remain unchanged
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.4_

  - [ ]* 2.2 Write property-based tests for identifier resolution
    - Create `services/catalog-service/src/application/use-cases/__tests__/get-product-identifier-resolution.properties.test.ts`
    - Use the hand-rolled `forAll` helper (same pattern as `review-properties.test.ts` — no external PBT library)
    - Implement `InMemoryProductRepository` with `findBySlugCallCount` tracker as specified in the design
    - Implement `randomProduct()` generator as specified in the design
    - **Property 1: ID–Slug Round-Trip Consistency** — 100 iterations; seed 1–20 random products, pick one, assert `execute({ productId: product.id })` and `execute({ productId: product.slug })` both return `status: 'success'` with the same `product.id`
      - _// Feature: product-identifier-resolution, Property 1: ID–Slug Round-Trip Consistency_
      - **Validates: Requirements 2.1, 2.3, 5.1, 5.2, 5.3, 4.5**
    - **Property 2: Fallback Invoked Iff `findById` Returns Null** — 100 iterations; seed a random product, execute with `product.id` → assert `findBySlugCallCount === 0`; reset count, execute with `product.slug` → assert `findBySlugCallCount === 1`
      - _// Feature: product-identifier-resolution, Property 2: Fallback Invoked Iff findById Returns Null_
      - **Validates: Requirements 2.2, 5.4**
    - **Property 3: Unknown Identifiers Always Yield `not_found`** — 100 iterations; generate an identifier never seeded (e.g. `'unknown-' + random suffix`), execute, assert `result.status === 'not_found'`
      - _// Feature: product-identifier-resolution, Property 3: Unknown Identifiers Always Yield not_found_
      - **Validates: Requirements 2.4, 4.3**

- [x] 3. Checkpoint — run existing use-case tests
  - Ensure all tests in `services/catalog-service/src/application/use-cases/__tests__/` pass before proceeding. Ask the user if any failures arise.

- [x] 4. Remove dead `getProductBySlug` method from `ProductController`
  - In `services/catalog-service/src/api/controllers/product.controller.ts`, delete the entire `getProductBySlug()` method (~80 lines, roughly lines 394–490)
  - Do not touch `getProduct()` or any other method — the controller is otherwise unchanged
  - Verify no remaining references to `getProductBySlug` exist in the controller or router files
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 5. Final checkpoint — ensure all tests pass
  - Run the full catalog-service test suite. Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `PrismaProductRepository.findBySlug` already exists and is correct — task 1 is a pure interface declaration, zero implementation risk
- The two-line change in task 2.1 is the entire behaviour change; all downstream DTO mapping is unaffected
- Property tests in task 2.2 require no database — the `InMemoryProductRepository` keeps tests fast and hermetic
