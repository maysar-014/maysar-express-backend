# Implementation Plan

- [x] 1. Write bug condition exploration tests (BEFORE implementing any fix)
  - **Property 1: Bug Condition** - Currency USD Pass-Through and Missing MediaRef Images
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: Scope the currency property to the concrete failing case — variant `attributes` containing a non-TZS `currency` string (e.g. `{ currency: 'USD' }`)
  - **Test 1 — Currency bug**: For all variant records where `attributes` is an object with a string `currency` field that is not `'TZS'` (isBugCondition_Currency), assert that `normalizeVariantRecord(variantData).currency === 'TZS'`
    - Concrete failing case: `normalizeVariantRecord({ attributes: { currency: 'USD' } }).currency` returns `'USD'` instead of `'TZS'`
    - Also assert that the product-level `price.currency` derived from such a variant equals `'TZS'`
  - **Test 2 — Images bug**: For any product record that has a populated `mediaRef` array (isBugCondition_Images always true for search), assert that `extractMediaUrls({ mediaRef: [{ url: 'https://example.com/img.jpg', displayOrder: 0 }] })` returns a non-empty array containing the URL
    - Concrete failing case: `extractMediaUrls({ mediaRef: [...] })` returns `[]` because `mediaRef` is not read
  - **Test 3 — DTO compilation bug**: Run `tsc --noEmit` on `product.dto.ts` and assert zero errors
    - Concrete failing case: TypeScript emits `Duplicate identifier 'averageRating'` and `Duplicate identifier 'reviewCount'`
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found:
    - `normalizeVariantRecord({ attributes: { currency: 'USD' } }).currency` → `'USD'` (expected `'TZS'`)
    - `extractMediaUrls({ mediaRef: [{ url: '...', displayOrder: 0 }] })` → `[]` (expected `['...']`)
    - `tsc --noEmit` → duplicate identifier errors on `averageRating` and `reviewCount`
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [-] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Non-Buggy Currency Inputs and Non-MediaRef Image Sources
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs first, observe outputs, then write tests
  - **Observation step — currency preservation**:
    - Observe: `resolveCurrency(null)` returns `'TZS'` on unfixed code
    - Observe: `resolveCurrency({})` returns `'TZS'` on unfixed code
    - Observe: `resolveCurrency({ currency: 'TZS' })` returns `'TZS'` on unfixed code
    - Observe: `resolveCurrency('TZS')` returns `'TZS'` on unfixed code
  - **Observation step — images preservation**:
    - Observe: `extractMediaUrls({ mediaUrls: ['https://a.com/img.jpg'] })` returns `['https://a.com/img.jpg']` on unfixed code
    - Observe: `extractMediaUrls({ seoMetadata: { mediaUrls: ['https://b.com/img.jpg'] } })` returns `['https://b.com/img.jpg']` on unfixed code
    - Observe: `extractMediaUrls({ variants: [{ images: ['https://c.com/img.jpg'] }] })` returns `['https://c.com/img.jpg']` on unfixed code
  - **Write property-based test — currency preservation**: For all `attributes` objects where `isBugCondition_Currency` returns false (no `currency` key, or `currency === 'TZS'`, or `attributes` is null/undefined), assert `resolveCurrency(attributes)` returns `'TZS'`
    - Generate: null, undefined, `{}`, `{ currency: 'TZS' }`, objects with unrelated keys, string `'TZS'`
  - **Write property-based test — images preservation**: For all product data objects with no `mediaRef` key (or `mediaRef: undefined`), assert `extractMediaUrls` returns the same URLs from `mediaUrls`, `seoMetadata.mediaUrls`, and variant `images` as before
  - Verify all preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix all three bugs

  - [x] 3.1 Fix Bug 1 — enforce TZS in `resolveCurrency`
    - In `services/catalog-service/src/infrastructure/repositories/prisma-product.repository.ts`, locate the `resolveCurrency` private method
    - After the existing resolution logic resolves a currency string from any branch (string input, `value.currency`, or `value.attributes.currency`), add a marketplace-level enforcement step:
      ```typescript
      const ACCEPTED_CURRENCIES = new Set(['TZS']);
      if (!ACCEPTED_CURRENCIES.has(resolved)) return fallback;
      return resolved;
      ```
    - This ensures any non-TZS value (e.g. `'USD'` from seed data) falls back to `'TZS'`
    - The `fallback` parameter defaults to `'TZS'`, so the enforcement is consistent with the existing fallback
    - _Bug_Condition: isBugCondition_Currency(variantData) — variantData.attributes is an object with a string `currency` field that is not `'TZS'`_
    - _Expected_Behavior: normalizeVariantRecord(variantData).currency === 'TZS' for all inputs satisfying the bug condition_
    - _Preservation: resolveCurrency(null), resolveCurrency({}), resolveCurrency({ currency: 'TZS' }), resolveCurrency('TZS') must all continue to return 'TZS'_
    - _Requirements: 2.1, 2.2, 3.2, 3.5_

  - [x] 3.2 Fix Bug 2a — add `mediaRef` to the `search` method's Prisma include clause
    - In `services/catalog-service/src/infrastructure/repositories/prisma-product.repository.ts`, locate the `search` method
    - Find the `this.prisma.product.findMany` call inside `Promise.all`
    - Update the `include` clause from:
      ```typescript
      include: {
        category: true,
        variants: true
      }
      ```
      to:
      ```typescript
      include: {
        category: true,
        variants: true,
        mediaRef: { orderBy: { displayOrder: 'asc' } }
      }
      ```
    - This matches the existing `findById` include clause exactly
    - _Bug_Condition: isBugCondition_Images — every call to search omits mediaRef from the include clause_
    - _Expected_Behavior: productData.mediaRef is populated for products returned by search_
    - _Preservation: category and variants includes are unchanged; findById, findBySeller, findByCategory, and other methods are not modified_
    - _Requirements: 2.3, 2.4, 3.1, 3.4_

  - [x] 3.3 Fix Bug 2b — update `extractMediaUrls` to read from `productData.mediaRef`
    - In `services/catalog-service/src/infrastructure/repositories/prisma-product.repository.ts`, locate the `extractMediaUrls` private method
    - Add a new branch at the top of the method, before the existing `mediaUrls` branch, to read from `productData.mediaRef`:
      ```typescript
      if (Array.isArray(productData?.mediaRef)) {
        for (const ref of productData.mediaRef) {
          if (typeof ref?.url === 'string') {
            candidates.push(ref.url);
          }
        }
      }
      ```
    - Place this branch first so MediaRef URLs appear before other sources, preserving the `displayOrder` ordering already applied by Prisma
    - Each `MediaRef` entry has a `.url: string` field and a `.displayOrder: number` field
    - _Bug_Condition: isBugCondition_Images — extractMediaUrls ignores productData.mediaRef_
    - _Expected_Behavior: extractMediaUrls returns URLs from productData.mediaRef in displayOrder when mediaRef is present_
    - _Preservation: existing branches for productData.mediaUrls, seoMetadata.mediaUrls, and variant images are unchanged and still contribute URLs_
    - _Requirements: 2.3, 2.5, 3.3_

  - [x] 3.4 Fix Bug 3 — remove duplicate properties from `ProductSummaryDto`
    - In `services/catalog-service/src/application/dto/product.dto.ts`, locate the `ProductSummaryDto` interface
    - Remove the second (duplicate) declaration of `averageRating?: number | null` — keep only the first `averageRating?: number`
    - Remove the second (duplicate) declaration of `reviewCount?: number` — keep only the first `reviewCount?: number`
    - The interface currently has both `averageRating?: number` and `averageRating?: number | null`; remove the latter
    - The interface currently has `reviewCount?: number` declared twice; remove the second occurrence
    - _Bug_Condition: isBugCondition_Dto — ProductSummaryDto has more than one property declaration for 'averageRating' or 'reviewCount'_
    - _Expected_Behavior: TypeScript compiler emits zero duplicate-identifier or incompatible-type errors for ProductSummaryDto_
    - _Preservation: all other properties in ProductSummaryDto and all other interfaces in product.dto.ts are unchanged_
    - _Requirements: 2.1 (compilation must succeed for the fix to be deployable)_

  - [x] 3.5 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Currency TZS Enforcement and MediaRef Images Returned
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied for all three bugs
    - Run all three exploration tests from step 1 on the FIXED code
    - **EXPECTED OUTCOME**: All tests PASS (confirms all three bugs are fixed)
    - Confirm: `normalizeVariantRecord({ attributes: { currency: 'USD' } }).currency === 'TZS'`
    - Confirm: `extractMediaUrls({ mediaRef: [{ url: '...', displayOrder: 0 }] })` returns the URL
    - Confirm: `tsc --noEmit` on `product.dto.ts` emits zero errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Currency Inputs and Non-MediaRef Image Sources
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests from step 2 on the FIXED code
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - Confirm: `resolveCurrency(null)`, `resolveCurrency({})`, `resolveCurrency({ currency: 'TZS' })`, `resolveCurrency('TZS')` all still return `'TZS'`
    - Confirm: products with `mediaUrls`, `seoMetadata.mediaUrls`, or variant `images` still return those URLs
    - Confirm: `findById` continues to return correct currency and images (already includes `mediaRef`)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full catalog-service test suite: `npx vitest --run` (or the project's configured test command) from `services/catalog-service`
  - Ensure all tests pass; ask the user if questions arise
  - Confirm TypeScript compilation succeeds with zero errors: `npx tsc --noEmit` from `services/catalog-service`
  - Confirm the three exploration tests from task 1 now pass
  - Confirm the preservation tests from task 2 still pass
