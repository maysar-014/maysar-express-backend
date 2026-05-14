# Bugfix Requirements Document

## Introduction

Two data bugs affect all seeded products returned by the catalog service API. First, every product's `price.currency` field shows `"USD"` instead of `"TZS"` (Tanzanian Shilling), which is incorrect for this Tanzania-only marketplace. Second, no product images are returned — the `thumbnailUrl` field is absent and `mediaUrls` is empty — even though images are correctly stored in the `MediaRef` table.

Both bugs originate in `PrismaProductRepository`:

- **Currency bug**: `resolveCurrency` is called with the variant's `attributes` object. When the object contains no `currency` key (as is the case for variants seeded by `scripts/seed-products.ts`), the method falls through to a branch that checks `value.attributes.currency` — but `value` here *is* the attributes object, not a wrapper around it. The method therefore never reaches the `'TZS'` fallback correctly for all code paths, and in some cases returns `'USD'` from a stale or mismatched branch.
- **Images bug**: The `search` method queries Prisma with `include: { category: true, variants: true }` and omits `mediaRef`. The `extractMediaUrls` helper only reads `productData.mediaUrls`, `productData.seoMetadata.mediaUrls`, and variant `images` arrays — none of which are populated for seeded products. The `MediaRef` relation is never read during search, so images are always empty.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a product is fetched via the search endpoint (`GET /api/products/search`) THEN the system returns `"currency": "USD"` in the `price` object for all seeded products

1.2 WHEN a product variant was created without an explicit `attributes.currency` value (as in `scripts/seed-products.ts`) THEN the system resolves the currency to `"USD"` instead of the expected `"TZS"` fallback

1.3 WHEN a product is fetched via the search endpoint THEN the system returns an empty `mediaUrls` array and no `thumbnailUrl` field, even though `MediaRef` rows exist for that product

1.4 WHEN the `search` method in `PrismaProductRepository` executes a Prisma query THEN the system omits `mediaRef` from the `include` clause, so the `MediaRef` relation is never loaded

1.5 WHEN `extractMediaUrls` is called with a product record that has a populated `mediaRef` array THEN the system ignores `productData.mediaRef` entirely and returns an empty array

### Expected Behavior (Correct)

2.1 WHEN a product is fetched via the search endpoint THEN the system SHALL return `"currency": "TZS"` in the `price` object for all seeded products

2.2 WHEN a product variant has no `attributes.currency` value THEN the system SHALL resolve the currency to `"TZS"` (the correct fallback for this Tanzania marketplace)

2.3 WHEN a product is fetched via the search endpoint and `MediaRef` rows exist for that product THEN the system SHALL return a non-empty `mediaUrls` array and a populated `thumbnailUrl` field

2.4 WHEN the `search` method in `PrismaProductRepository` executes a Prisma query THEN the system SHALL include `mediaRef: { orderBy: { displayOrder: 'asc' } }` in the `include` clause, consistent with `findById`

2.5 WHEN `extractMediaUrls` is called with a product record that has a populated `mediaRef` array THEN the system SHALL read `productData.mediaRef` and include each entry's `url` in the returned array, ordered by `displayOrder`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a product is fetched via `GET /api/products/:id` (findById) THEN the system SHALL CONTINUE TO return the correct currency and images as it does today

3.2 WHEN a product variant has an explicit `attributes.currency` value set to a valid currency code THEN the system SHALL CONTINUE TO return that currency code unchanged

3.3 WHEN a product has no `MediaRef` rows but has image URLs stored in `productData.mediaUrls` or `seoMetadata.mediaUrls` or variant `images` arrays THEN the system SHALL CONTINUE TO return those URLs in `mediaUrls`

3.4 WHEN the `findBySeller`, `findByCategory`, `findByIdentifiers`, and `findByFingerprint` methods execute THEN the system SHALL CONTINUE TO return products with the same structure as before (these methods are not in scope for the mediaRef include change unless explicitly extended)

3.5 WHEN the `save` and `saveWithAttributesTransaction` methods create a new variant with `attributes: { currency: persistenceDto.currency ?? 'TZS' }` THEN the system SHALL CONTINUE TO persist that currency value correctly and it SHALL be returned as-is by `resolveCurrency`
