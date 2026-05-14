# Seeded Product Data Fix — Bugfix Design

## Overview

Two data bugs affect all seeded products returned by the catalog search endpoint, plus a TypeScript compilation error in the product DTO.

**Bug 1 — Currency shows USD instead of TZS**: The `search` method in `PrismaProductRepository` builds a `currencySource` value from `productData.currency ?? defaultVariant?.currency ?? 'TZS'`. The `defaultVariant.currency` comes from `normalizeVariantRecord`, which calls `this.resolveCurrency(variantData.attributes)`. When `variantData.attributes` is an object that contains a `currency` key set to `'USD'` (as written by the staging seed), `resolveCurrency` hits branch (2) — `typeof value.currency === 'string'` — and returns `'USD'`. That string is then passed back into `resolveCurrency` as `currencySource`, which hits branch (1) — `typeof value === 'string'` — and returns `'USD'` unchanged. The TZS fallback is never reached.

**Bug 2 — No product images**: The `search` method's Prisma query uses `include: { category: true, variants: true }` and omits `mediaRef`. The `extractMediaUrls` helper reads `productData.mediaUrls`, `seoMetadata.mediaUrls`, and variant `images` arrays — none of which are populated for seeded products. Because `mediaRef` is never loaded, `thumbnailUrl` is absent and `mediaUrls` is always empty.

**Bug 3 — DTO TypeScript errors**: `ProductSummaryDto` in `product.dto.ts` declares `averageRating` and `reviewCount` twice with incompatible types, causing TypeScript compilation errors.

The fix targets three specific locations: the `resolveCurrency` method (or the staging seed's currency value), the `search` method's Prisma include clause, the `extractMediaUrls` helper, and the `ProductSummaryDto` interface.

## Glossary

- **Bug_Condition (C)**: The set of inputs that trigger one or more of the three bugs described above
- **Property (P)**: The desired correct behavior for each bug condition — TZS currency, populated media URLs, and clean TypeScript compilation
- **Preservation**: Existing behaviors that must remain unchanged — `findById` currency/images, explicit valid-currency variants, non-MediaRef image sources, other repository methods, and variant persistence
- **resolveCurrency**: Private method in `PrismaProductRepository` that resolves a currency value from various input shapes (string, object with `.currency`, object with `.attributes.currency`, or fallback)
- **normalizeVariantRecord**: Private method that maps a raw Prisma variant row to a normalized variant object; calls `resolveCurrency(variantData.attributes)` to set `currency`
- **normalizeProductRecord**: Private method that maps a raw Prisma product row to a normalized product object; derives `currencySource` from `productData.currency ?? defaultVariant?.currency ?? 'TZS'`
- **extractMediaUrls**: Private method that collects image URLs from `productData.mediaUrls`, `seoMetadata.mediaUrls`, and variant `images` arrays — currently does not read `productData.mediaRef`
- **mediaRef**: The Prisma relation on `Product` that holds `MediaRef` rows, each with a `url` and `displayOrder` field; already included in `findById` but missing from `search`
- **ProductSummaryDto**: TypeScript interface in `product.dto.ts` that currently declares `averageRating` and `reviewCount` as duplicate properties with incompatible types

## Bug Details

### Bug Condition

The bugs manifest across three distinct code paths in the catalog service. Each has its own formal specification.

**Bug 1 — Currency**

The bug manifests when `normalizeVariantRecord` is called for a variant whose `attributes` object contains a `currency` key with a non-TZS value (e.g., `{ currency: 'USD' }`). `resolveCurrency` returns that value as-is because it is a valid string in the attributes object. The product-level `currencySource` then inherits this value and `resolveCurrency` returns it again unchanged.

**Formal Specification:**
```
FUNCTION isBugCondition_Currency(variantData)
  INPUT: variantData of type PrismaVariantRow
  OUTPUT: boolean

  attrs := variantData.attributes
  RETURN attrs != null
         AND typeof attrs === 'object'
         AND typeof attrs.currency === 'string'
         AND attrs.currency != 'TZS'
END FUNCTION
```

**Bug 2 — Images**

The bug manifests whenever the `search` method is called. Because `mediaRef` is absent from the Prisma `include` clause, `productData.mediaRef` is always `undefined` when `extractMediaUrls` is called, and no MediaRef-sourced URLs are ever returned.

**Formal Specification:**
```
FUNCTION isBugCondition_Images(searchRequest)
  INPUT: searchRequest of type SearchRequest
  OUTPUT: boolean

  -- The bug condition is structural: it holds for every search call
  -- because the include clause never loads mediaRef
  RETURN true  -- always triggered by the search method
END FUNCTION
```

**Bug 3 — DTO Duplicate Properties**

The bug manifests at TypeScript compile time. `ProductSummaryDto` declares `averageRating` twice (`number | undefined` and `number | null | undefined`) and `reviewCount` twice (`number | undefined` and `number | undefined`).

**Formal Specification:**
```
FUNCTION isBugCondition_Dto(interfaceDefinition)
  INPUT: interfaceDefinition of type TypeScriptInterface
  OUTPUT: boolean

  RETURN interfaceDefinition.properties
           .filter(p => p.name === 'averageRating').length > 1
         OR interfaceDefinition.properties
           .filter(p => p.name === 'reviewCount').length > 1
END FUNCTION
```

### Examples

**Bug 1 — Currency:**
- Variant with `attributes: { currency: 'USD' }` → `normalizeVariantRecord` returns `currency: 'USD'` → `currencySource = 'USD'` → product `price.currency = 'USD'` (wrong; expected `'TZS'`)
- Variant with `attributes: null` → `resolveCurrency(null)` → fallback `'TZS'` → `currencySource = 'TZS'` → product `price.currency = 'TZS'` (correct)
- Variant with `attributes: {}` → `resolveCurrency({})` → no string, no `.currency`, no `.attributes.currency` → fallback `'TZS'` (correct)
- Variant with `attributes: { currency: 'TZS' }` → returns `'TZS'` (correct, but only by coincidence)

**Bug 2 — Images:**
- Product with 3 `MediaRef` rows, `mediaUrls: null`, no variant images → `extractMediaUrls` returns `[]`, `thumbnailUrl` is `undefined` (wrong; expected 3 URLs)
- Product with `mediaUrls: ['https://...']` in the product row → `extractMediaUrls` returns that URL (correct, unaffected by this bug)
- Product with both `MediaRef` rows and `seoMetadata.mediaUrls` → only `seoMetadata.mediaUrls` returned (partially correct, MediaRef URLs still missing)

**Bug 3 — DTO:**
- TypeScript compiler emits `Duplicate identifier 'averageRating'` and `Subsequent property declarations must have the same type` errors, blocking compilation

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `findById` already includes `mediaRef` and returns correct currency and images — this must continue to work exactly as before
- Variants with an explicit `attributes: { currency: 'TZS' }` must continue to return `'TZS'`
- Products with image URLs stored in `productData.mediaUrls`, `seoMetadata.mediaUrls`, or variant `images` arrays must continue to return those URLs in `mediaUrls`
- `findBySeller`, `findByCategory`, `findByIdentifiers`, `findByFingerprint`, and `findByCategoryAndBrand` are not in scope for the `mediaRef` include change and must continue to return products with the same structure as before
- `saveWithAttributesTransaction` persists `attributes: { currency: persistenceDto.currency ?? 'TZS' }` — this must continue to work correctly and the persisted value must be returned as-is by `resolveCurrency`
- `updateDetails` updates `attributes.currency` on the first variant — this must continue to work correctly

**Scope:**
All inputs that do NOT involve the bug conditions should be completely unaffected by this fix. This includes:
- Any call to `findById` (already correct)
- Variants with no `currency` key in `attributes` (already return TZS via fallback)
- Products with image URLs in non-MediaRef fields
- All write operations (`save`, `saveWithAttributesTransaction`, `updateDetails`)
- All other repository methods not modified by this fix

## Hypothesized Root Cause

### Bug 1 — Currency

1. **Staging Seed Hardcodes USD**: `scripts/staging/seed-marketplace.ts` (or a similar seed script) creates variants with `attributes: { currency: 'USD' }`. This is the direct data cause.

2. **resolveCurrency Passes Through Any String Currency**: `resolveCurrency` branch (2) returns `value.currency` for any object with a string `.currency` property, with no validation against an allowed-currencies list. There is no guard that enforces TZS as the only valid currency for this marketplace.

3. **No Marketplace-Level Currency Enforcement**: The repository has no single point of truth that enforces `'TZS'` as the marketplace currency. Currency resolution is distributed across `resolveCurrency`, `normalizeProductRecord`, and `normalizeVariantRecord`.

### Bug 2 — Images

1. **Inconsistent Prisma Include Clauses**: `findById` correctly includes `mediaRef: { orderBy: { displayOrder: 'asc' } }`, but `search` only includes `{ category: true, variants: true }`. This inconsistency means the `search` path never loads the `MediaRef` relation.

2. **extractMediaUrls Does Not Read mediaRef**: Even if `mediaRef` were loaded, `extractMediaUrls` does not read `productData.mediaRef`. The method was written before `MediaRef` was the primary image storage mechanism for seeded products.

3. **Seeded Products Use MediaRef Exclusively**: The seed scripts store images in `MediaRef` rows rather than in `productData.mediaUrls` or variant `images` arrays, so the existing fallback sources in `extractMediaUrls` yield nothing for seeded products.

### Bug 3 — DTO Duplicate Properties

1. **Incremental Interface Growth**: `ProductSummaryDto` was extended over time. `averageRating?: number` and `reviewCount?: number` were added in one pass, then `averageRating?: number | null` and `reviewCount?: number` were added again in a later pass without removing the originals.

## Correctness Properties

Property 1: Bug Condition — Currency Always TZS for Seeded Products

_For any_ product variant where `variantData.attributes` is an object containing a `currency` key (isBugCondition_Currency returns true), the fixed `normalizeVariantRecord` SHALL return `currency: 'TZS'`, and the product's `price.currency` SHALL be `'TZS'`.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Search Returns MediaRef Images

_For any_ call to the `search` method where a product has one or more `MediaRef` rows (isBugCondition_Images returns true), the fixed `search` method SHALL return a non-empty `mediaUrls` array containing the URLs from those `MediaRef` rows ordered by `displayOrder`, and `thumbnailUrl` SHALL be the first URL.

**Validates: Requirements 2.3, 2.4, 2.5**

Property 3: Preservation — Non-Buggy Inputs Unchanged

_For any_ input where neither bug condition holds (variants with no `currency` key in attributes, products with image URLs in non-MediaRef fields, all write operations, `findById`, and other read methods), the fixed code SHALL produce the same result as the original code, preserving all existing behaviors.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

Property 4: Bug Condition — DTO Compiles Without Errors

_For any_ TypeScript compilation of `product.dto.ts` after the fix, the compiler SHALL emit zero errors related to duplicate identifiers or incompatible property types in `ProductSummaryDto`.

**Validates: Requirements 2.1 (indirectly — compilation must succeed for the fix to be deployable)**

## Fix Implementation

### Changes Required

**File 1**: `services/catalog-service/src/infrastructure/repositories/prisma-product.repository.ts`

**Change 1 — Fix resolveCurrency to enforce TZS**

The simplest correct fix is to add a marketplace-level currency enforcement step. After resolving the raw currency value, if the resolved value is not `'TZS'`, return `'TZS'`. This is appropriate because this is a Tanzania-only marketplace.

Alternatively, change `normalizeVariantRecord` to pass `variantData.attributes?.currency` directly rather than the whole `attributes` object, and let `resolveCurrency` fall through to the TZS fallback when no valid currency is found. The preferred approach is to fix the data at the source (the staging seed) AND add a guard in `resolveCurrency` so the repository is resilient to bad seed data.

**Specific Changes:**
1. **resolveCurrency — add TZS enforcement**: After resolving the currency string from any branch, validate it against the set of accepted currencies for this marketplace. If the resolved value is not in the accepted set (or is not `'TZS'`), return the fallback `'TZS'`.
   ```
   // After existing resolution logic, before returning:
   const ACCEPTED_CURRENCIES = new Set(['TZS']);
   if (!ACCEPTED_CURRENCIES.has(resolved)) return fallback;
   return resolved;
   ```

**Change 2 — Add mediaRef to search include**

Add `mediaRef: { orderBy: { displayOrder: 'asc' } }` to the Prisma `include` clause in the `search` method, matching the existing `findById` include.

**Specific Changes:**
1. **search method — update Prisma include**:
   ```
   include: {
     category: true,
     variants: true,
     mediaRef: { orderBy: { displayOrder: 'asc' } }
   }
   ```

**Change 3 — Update extractMediaUrls to read mediaRef**

Add a new branch at the top of `extractMediaUrls` that reads `productData.mediaRef` (an array of `{ url: string, displayOrder: number }` objects) and pushes each `url` into `candidates`. Place this branch first so MediaRef URLs appear before other sources, preserving the `displayOrder` ordering already applied by Prisma.

**Specific Changes:**
1. **extractMediaUrls — add mediaRef reading**:
   ```
   if (Array.isArray(productData?.mediaRef)) {
     for (const ref of productData.mediaRef) {
       if (typeof ref?.url === 'string') {
         candidates.push(ref.url);
       }
     }
   }
   ```

---

**File 2**: `services/catalog-service/src/application/dto/product.dto.ts`

**Change 4 — Remove duplicate properties from ProductSummaryDto**

Remove the second declarations of `averageRating` and `reviewCount`. Keep the first declarations (`averageRating?: number` and `reviewCount?: number`) and remove the later duplicates (`averageRating?: number | null` and the second `reviewCount?: number`).

**Specific Changes:**
1. **ProductSummaryDto — remove duplicate `averageRating?: number | null`**
2. **ProductSummaryDto — remove duplicate `reviewCount?: number`**

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write unit tests that call `normalizeVariantRecord` and `search` (or `extractMediaUrls`) with inputs matching the bug conditions, and assert the expected correct output. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Currency — Variant with USD attributes**: Call `normalizeVariantRecord` with `attributes: { currency: 'USD' }`. Assert `result.currency === 'TZS'` (will fail on unfixed code — returns `'USD'`)
2. **Currency — Product-level currency derivation**: Call `normalizeProductRecord` with a variant having `attributes: { currency: 'USD' }`. Assert `result.price.currency === 'TZS'` (will fail on unfixed code)
3. **Images — search omits mediaRef**: Call `search` for a product that has `MediaRef` rows but no `mediaUrls` or variant images. Assert `result.products[0].mediaUrls.length > 0` (will fail on unfixed code — returns `[]`)
4. **Images — extractMediaUrls with mediaRef data**: Call `extractMediaUrls` with `{ mediaRef: [{ url: 'https://example.com/img.jpg', displayOrder: 0 }] }`. Assert result contains the URL (will fail on unfixed code — returns `[]`)
5. **DTO — TypeScript compilation**: Run `tsc --noEmit` on `product.dto.ts`. Assert zero errors (will fail on unfixed code)

**Expected Counterexamples**:
- `normalizeVariantRecord({ attributes: { currency: 'USD' } }).currency` returns `'USD'` instead of `'TZS'`
- `extractMediaUrls({ mediaRef: [...] })` returns `[]` because `mediaRef` is not read
- TypeScript compiler emits duplicate identifier errors for `ProductSummaryDto`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL variantData WHERE isBugCondition_Currency(variantData) DO
  result := normalizeVariantRecord_fixed(variantData)
  ASSERT result.currency === 'TZS'
END FOR

FOR ALL searchRequest WHERE isBugCondition_Images(searchRequest) DO
  result := search_fixed(searchRequest)
  FOR EACH product IN result.products WHERE product has MediaRef rows DO
    ASSERT product.mediaUrls.length > 0
    ASSERT product.thumbnailUrl != undefined
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL variantData WHERE NOT isBugCondition_Currency(variantData) DO
  ASSERT normalizeVariantRecord_original(variantData).currency
       = normalizeVariantRecord_fixed(variantData).currency
END FOR

FOR ALL productData WHERE productData has no MediaRef rows DO
  ASSERT extractMediaUrls_original(productData)
       = extractMediaUrls_fixed(productData)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many variant `attributes` shapes automatically, covering null, empty object, objects with unrelated keys, and objects with `currency: 'TZS'`
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that `resolveCurrency` still returns the correct value for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for variants with `attributes: null`, `attributes: {}`, and `attributes: { currency: 'TZS' }`, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Currency Preservation — null attributes**: Verify `resolveCurrency(null)` still returns `'TZS'` after fix
2. **Currency Preservation — empty attributes**: Verify `resolveCurrency({})` still returns `'TZS'` after fix
3. **Currency Preservation — TZS attributes**: Verify `resolveCurrency({ currency: 'TZS' })` still returns `'TZS'` after fix
4. **Currency Preservation — string input**: Verify `resolveCurrency('TZS')` still returns `'TZS'` after fix
5. **Images Preservation — non-MediaRef sources**: Verify products with `mediaUrls` or `seoMetadata.mediaUrls` still return those URLs after fix
6. **Images Preservation — variant images**: Verify products with variant `images` arrays still return those URLs after fix
7. **findById Preservation**: Verify `findById` continues to return correct currency and images (it already includes `mediaRef`)

### Unit Tests

- Test `resolveCurrency` with `{ currency: 'USD' }` → returns `'TZS'` (bug fix)
- Test `resolveCurrency` with `{ currency: 'TZS' }` → returns `'TZS'` (preservation)
- Test `resolveCurrency` with `null`, `{}`, `'TZS'`, `'USD'` string → correct fallback behavior
- Test `extractMediaUrls` with `mediaRef` array → returns URLs in order
- Test `extractMediaUrls` with both `mediaRef` and `seoMetadata.mediaUrls` → returns all URLs, MediaRef first
- Test `extractMediaUrls` with no `mediaRef` key → unchanged behavior
- Test `normalizeVariantRecord` with `attributes: { currency: 'USD' }` → `currency: 'TZS'`
- Test `normalizeProductRecord` with a USD-attributed variant → `price.currency: 'TZS'`
- Test `ProductSummaryDto` compiles without TypeScript errors

### Property-Based Tests

- Generate random `attributes` objects with random `currency` string values; verify `resolveCurrency` always returns `'TZS'` for any non-TZS currency value after fix
- Generate random `attributes` objects without a `currency` key; verify `resolveCurrency` returns `'TZS'` (preservation — same as before fix)
- Generate random arrays of `MediaRef`-shaped objects; verify `extractMediaUrls` returns all URLs in the correct order
- Generate random product data with various combinations of `mediaUrls`, `seoMetadata.mediaUrls`, variant `images`, and `mediaRef`; verify the union of all sources is returned

### Integration Tests

- Test full search flow: seed a product with `MediaRef` rows and a variant with `attributes: { currency: 'USD' }`, call `search`, assert `price.currency === 'TZS'` and `mediaUrls` is non-empty
- Test `findById` continues to return correct data after the `extractMediaUrls` change
- Test TypeScript compilation of the entire catalog service passes with zero errors after the DTO fix
