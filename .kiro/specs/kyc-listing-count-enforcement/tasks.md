# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - KYC Listing Cap Bypass
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the listing-cap bypass in the existing `requireKycLevel` middleware
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases — any (kycLimitMaxListings, currentCount) pair where `currentCount >= kycLimitMaxListings` — to ensure reproducibility
  - Write the following scoped property-based tests in `services/kyc-service/src/api/middleware/kyc-gate.middleware.pbt.test.ts`:
    - **Sub-test A — Level-0 seller at cap**: Mock user with `kycLevel: 0`, `kycLimitMaxListings: 5`; `countFn` returns `5`. Invoke the current `requireKycLevel(0)` middleware. Assert that `next()` IS called and no HTTP 403 is issued. (Bug: `requireKycLevel` never reads `kycLimitMaxListings` so the cap is invisible.)
    - **Sub-test B — Level-1 seller at cap**: Mock user with `kycLevel: 1`, `kycLimitMaxListings: 20`; `countFn` returns `20`. Invoke `requireKycLevel(0)`. Assert `next()` IS called. (Same gap demonstrated at level 1.)
    - **Sub-test C — Level-1 enabler at cap**: Mock user with `kycLevel: 1`, `kycLimitMaxListings: 20`; `countFn` returns `20`. Invoke `requireKycLevel(1)`. Assert `next()` IS called.
    - **Sub-test D — Over-cap (count > max)**: Mock user with `kycLimitMaxListings: 5`; `countFn` returns `7`. Invoke `requireKycLevel(0)`. Assert `next()` IS called even though `currentCount > kycLimitMaxListings`.
  - Use `fast-check` to generate arbitrary `(kycLimitMaxListings, currentCount)` pairs where `currentCount >= kycLimitMaxListings`, across all four KYC levels, and assert that the current unfixed middleware always calls `next()` — confirming the gap is not input-specific
  - Run tests on UNFIXED code (the current `requireKycLevel`-only gate in `kyc-gate.middleware.ts`)
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the gap exists and confirms the root cause)
  - Document counterexamples found (e.g., "`next()` called for `kycLimitMaxListings=5`, `count=5`; no HTTP 403 emitted; `kycLimitMaxListings` field never queried")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Below-Cap and Non-Creation Requests Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for requests where `isBugCondition(X)` returns false (i.e. `currentCount < kycLimitMaxListings`, non-creation routes, or routes that do not include the new middleware)
  - Write the following property-based tests in `services/kyc-service/src/api/middleware/kyc-gate.middleware.pbt.test.ts`:
    - **Preservation A — Below-cap for catalog**: For all `(kycLimitMaxListings, currentCount)` pairs where `currentCount < kycLimitMaxListings` (use `fast-check` to generate: `fc.integer({min:1,max:9999}).chain(max => fc.integer({min:0,max:max-1}).map(count => ({max,count})))`), invoke `requireKycListingCapacity(countFn)` and assert `next()` IS called and no HTTP response is sent.
    - **Preservation B — Below-cap for enabler**: Same property for enabler inputs (same shape, different label). Covers levels 0–3.
    - **Preservation C — Level 3 effectively uncapped**: For a user with `kycLimitMaxListings: 9999` and `currentCount` from `0` to `9998`, assert `next()` IS always called.
    - **Preservation D — `requireKycLevel` independence**: Invoke `requireKycLevel(0)` with a user whose `kycLevel: 0` (passes) and confirm `next()` is called; invoke with `kycLevel` below `minLevel` and confirm HTTP 403 `KYC_LEVEL_REQUIRED` is returned. Assert these behaviors are unaffected by the existence of `requireKycListingCapacity`.
    - **Preservation E — Boundary at cap-minus-one**: `kycLimitMaxListings: 5`, `currentCount: 4` (one below cap). Assert `next()` IS called.
  - Observe: `next()` is called and no 403 is issued for all below-cap inputs on the current unfixed code (using `requireKycLevel` as the gate)
  - Verify all preservation tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior that must not regress after the fix)
  - Mark task complete when tests are written, run, and confirmed passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for KYC listing count enforcement (missing capacity middleware)

  - [x] 3.1 Add `requireKycListingCapacity(countFn)` to `kyc-gate.middleware.ts`
    - Create the new middleware factory in `services/kyc-service/src/api/middleware/kyc-gate.middleware.ts` alongside the existing `requireKycLevel`; do NOT modify `requireKycLevel`
    - Signature: `export const requireKycListingCapacity = (countFn: (userId: string) => Promise<number>) => async (req: Request, res: Response, next: NextFunction): Promise<void>`
    - Extract `userId` from `(req as any).user?.userId`; return HTTP 401 `UNAUTHORIZED` if absent (matches the pattern in `requireKycLevel`)
    - Fetch user limits: `prisma.user_User.findUnique({ where: { id: userId }, select: { kycLevel: true, kycLimitMaxListings: true } })`; default to `kycLimitMaxListings = 5`, `kycLevel = 0` when user row not found
    - Invoke `countFn(userId)` to obtain `currentCount` (uses the calling service's own Prisma instance — no cross-service import in this file)
    - If `currentCount >= maxAllowed`: respond HTTP 403 `{ success: false, error: { code: "KYC_LISTING_CAP_REACHED", message: "You have reached your KYC listing cap of {maxAllowed}. Upgrade your KYC level to create more listings.", currentCount, maxAllowed, currentLevel } }`; do NOT call `next()`
    - Otherwise: call `next()`
    - Wrap entire logic in try/catch; return HTTP 500 `KYC_GATE_ERROR` on any unexpected error (matches existing `requireKycLevel` pattern)
    - _Bug_Condition: `isBugCondition(X)` where `count >= user.kycLimitMaxListings` (from design §Bug Condition)_
    - _Expected_Behavior: HTTP 403 `KYC_LISTING_CAP_REACHED` with `currentCount`, `maxAllowed`, `currentLevel` (from design §Correctness Properties, Property 1)_
    - _Preservation: `requireKycLevel` left entirely unchanged; `requireKycListingCapacity` is a separate, independently-stacked middleware (from design §Preservation Requirements)_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Apply `requireKycListingCapacity` inline on `POST /v1/products` in catalog service
    - In `services/catalog-service/src/api/routes/product.routes.ts`, add `requireKycListingCapacity` to the import from `kyc-gate.middleware`
    - Also import `prisma` from `../../../../kyc-service/src/infrastructure/database/prisma-client` (already used in the file via `requireKycLevel`)
    - Do NOT modify the shared `sellerMiddleware` array (that would add the count check to update/delete/publish routes)
    - Add `requireKycListingCapacity` as an inline middleware only on the `POST /v1/products` route handler, immediately after the spread of `sellerMiddleware` and before `validateSchemaRequest(createProductSchema)`:
      ```typescript
      router.post(`${apiPrefix}/products`,
        ...sellerMiddleware,
        requireKycListingCapacity(
          async (userId) => prisma.product.count({ where: { sellerId: userId } })
        ),
        validateSchemaRequest(createProductSchema),
        async (req, res) => { await productController.createProduct(req, res); }
      );
      ```
    - Confirm all other routes using `sellerMiddleware` (`PUT /v1/products/:id`, `DELETE /v1/products/:id`, `POST /v1/products/:id/publish`, etc.) are NOT affected
    - _Bug_Condition: `isBugCondition(X)` on `POST /v1/products` where `prisma.product.count({ where: { sellerId } }) >= kycLimitMaxListings`_
    - _Expected_Behavior: HTTP 403 `KYC_LISTING_CAP_REACHED` before `productController.createProduct` is reached_
    - _Preservation: Update, delete, publish, and all other product routes continue to apply only `requireKycLevel(0)` (from design §Preservation Requirements)_
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [x] 3.3 Apply `requireKycListingCapacity` inline on `POST /:enablerId/listings` in enabler service
    - In `services/enabler-service/src/api/routes/enabler.routes.ts`, add `requireKycListingCapacity` to the import from `kyc-gate.middleware` (the `prisma` instance from the enabler service is already available)
    - Add `requireKycListingCapacity` inline on the listing-creation route immediately after `requireKycLevel(1)`:
      ```typescript
      router.post(
        '/:enablerId/listings',
        validateJoiRequest({ body: listingBodySchema }),
        requireKycLevel(1),
        requireKycListingCapacity(
          async (userId) => prisma.enabler_ProductListing.count({ where: { enablerId: userId } })
        ),
        asyncHandler((req, res) => listingController.listProduct(req, res))
      );
      ```
    - Note: the enabler service's own `prisma` instance is used here; no additional Prisma import is needed
    - Confirm all other enabler routes (`GET /:enablerId/listings`, orders, earnings, promotion-jobs, referral-link) are NOT affected
    - _Bug_Condition: `isBugCondition(X)` on `POST /:enablerId/listings` where `prisma.enabler_ProductListing.count({ where: { enablerId } }) >= kycLimitMaxListings`_
    - _Expected_Behavior: HTTP 403 `KYC_LISTING_CAP_REACHED` before `listingController.listProduct` is reached_
    - _Preservation: All other enabler routes continue to apply only `requireKycLevel(1)` without any listing-count check (from design §Preservation Requirements)_
    - _Requirements: 2.3, 2.4, 3.4_

  - [x] 3.4 Write unit tests for `requireKycListingCapacity` in `.test.ts`
    - Write deterministic unit tests in `services/kyc-service/src/api/middleware/kyc-gate.middleware.test.ts`:
      - Unauthenticated request (no `user.userId`) → HTTP 401 `UNAUTHORIZED`
      - `countFn` returns `count >= maxAllowed` → HTTP 403 `KYC_LISTING_CAP_REACHED`; assert `currentCount`, `maxAllowed`, `currentLevel` in response body; assert `next` NOT called
      - `countFn` returns `count < maxAllowed` → `next()` called; no response sent
      - Boundary — `count === maxAllowed - 1` (one below cap) → `next()` called
      - Boundary — `count === maxAllowed` (exactly at cap) → HTTP 403
      - User not found in DB → defaults to `kycLimitMaxListings = 5`; `countFn` returns `5` → HTTP 403
      - `countFn` throws → HTTP 500 `KYC_GATE_ERROR`
      - Level 3 user (`kycLimitMaxListings = 9999`), `countFn` returns `9998` → `next()` called
      - Existing `requireKycLevel` tests: all prior behavior unchanged (no regressions)
    - _Requirements: 2.1, 2.2, 2.5, 3.3_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - KYC Listing Cap Bypass Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior via the new `requireKycListingCapacity` middleware
    - When these tests pass, it confirms that the fixed middleware returns HTTP 403 for all at-or-over-cap inputs
    - Run bug condition exploration tests from step 1 against the fixed `requireKycListingCapacity`
    - **EXPECTED OUTCOME**: All sub-tests (A–D) and the at-or-over-cap PBT property FAIL on `requireKycLevel` (bug confirmed) and PASS on `requireKycListingCapacity` (fix confirmed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Below-Cap and Non-Creation Requests Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2 against the fixed `requireKycListingCapacity`
    - **EXPECTED OUTCOME**: All preservation tests (A–E) PASS (confirms no regressions for below-cap requests, level-3 users, `requireKycLevel` independence, and routes without the new middleware)
    - Confirm all tests still pass after fix

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run the KYC middleware test suite: `cd services/kyc-service && npx jest --testPathPattern="kyc-gate.middleware" --runInBand` (use `--run` flag if using Vitest)
  - Confirm all unit tests in `kyc-gate.middleware.test.ts` pass (including boundary cases and `requireKycLevel` regression tests)
  - Confirm all PBT properties in `kyc-gate.middleware.pbt.test.ts` pass (bug-condition property and preservation property)
  - Confirm no pre-existing tests in catalog-service or enabler-service have regressed
  - Ensure all tests pass; ask the user if questions arise
