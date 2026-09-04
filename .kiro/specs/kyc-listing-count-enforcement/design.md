# KYC Listing Count Enforcement — Bugfix Design

## Overview

Sellers and enablers can create products and listings beyond their KYC-level cap because the only API
gate applied to creation routes — `requireKycLevel(minLevel)` — validates `kycLevel >= minLevel` but
never reads `kycLimitMaxListings` or counts existing items. The cap values written to `user_User` by
the KYC approval flow are therefore live data with no enforcement.

The fix is a new, independent middleware factory `requireKycListingCapacity(countFn)` added to
`services/kyc-service/src/api/middleware/kyc-gate.middleware.ts`. The middleware:
1. Reads `kycLimitMaxListings` and `kycLevel` for the authenticated user.
2. Delegates counting to a caller-supplied `countFn: (userId: string) => Promise<number>` so that the
   middleware stays decoupled from both catalog and enabler Prisma clients.
3. Returns HTTP 403 with `code: "KYC_LISTING_CAP_REACHED"` when `currentCount >= maxAllowed`.
4. Calls `next()` otherwise, leaving all downstream handlers unchanged.

`requireKycLevel(minLevel)` is **not modified**. Both gates stack independently on the same route.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the unchecked-cap defect — a seller or enabler
  submitting a creation request when their current item count is ≥ `kycLimitMaxListings`.
- **Property (P)**: The desired post-fix behaviour — the middleware returns HTTP 403 with
  `code: "KYC_LISTING_CAP_REACHED"` for every request that satisfies C.
- **Preservation**: All creation requests that do **not** satisfy C (i.e. count < max), all non-creation
  routes, all non-listing-cap KYC gates (`requireKycLevel`), and all other service endpoints must behave
  identically before and after the fix.
- **requireKycLevel**: Existing middleware factory in `kyc-gate.middleware.ts` that gates on
  `kycLevel >= minLevel`; left entirely unchanged.
- **requireKycListingCapacity**: The new middleware factory added by this fix; accepts a `countFn` and
  enforces the listing-count cap independently.
- **countFn**: A function `(userId: string) => Promise<number>` supplied by each route module; returns
  the number of active items the user currently owns, using that service's own Prisma client.
- **kycLimitMaxListings**: Column on `user_User`; written by the KYC approval flow from
  `getKycLimitsForLevel(level).maxListings`; values are 5 / 20 / 100 / 9999 for levels 0–3.
- **Level 3 bypass**: When `kycLimitMaxListings === 9999` the count check is still executed but will
  always pass in practice; no special-casing is needed in the middleware.

---

## Bug Details

### Bug Condition

The bug manifests on every `POST /v1/products` (catalog) and `POST /:enablerId/listings` (enabler)
request where the authenticated user has already reached their KYC listing cap. The existing
`requireKycLevel(minLevel)` middleware only queries `kycLevel` and `kycStatus`; it never fetches
`kycLimitMaxListings` or issues a `count()` query, so the cap value is silently ignored.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type ProductCreateRequest | EnablerListingCreateRequest
  OUTPUT: boolean

  user  ← fetchUser(X.userId)
  count ← countFn(X.userId)   -- catalog: prisma.product.count OR enabler: prisma.enabler_ProductListing.count

  RETURN count >= user.kycLimitMaxListings
END FUNCTION
```

### Examples

- **Level 0 seller at cap**: A seller with `kycLevel = 0` (`kycLimitMaxListings = 5`) already has 5
  products. `POST /v1/products` currently returns HTTP 201 (creates product 6). After the fix it
  returns HTTP 403 with `code: "KYC_LISTING_CAP_REACHED"`, `currentCount: 5`, `maxAllowed: 5`.
- **Level 1 seller at cap**: A seller with `kycLevel = 1` (`kycLimitMaxListings = 20`) already has
  20 products. Same outcome — HTTP 403 with `currentCount: 20`, `maxAllowed: 20`.
- **Level 1 enabler at cap**: An enabler with `kycLimitMaxListings = 20` already has 20 listings.
  `POST /:enablerId/listings` currently returns HTTP 201. After the fix it returns HTTP 403.
- **Level 3 seller (effectively uncapped)**: `kycLimitMaxListings = 9999`. Even with 9998 products
  the count (9998) < max (9999), so `next()` is called and the request proceeds normally.
- **Seller below cap**: A level 0 seller with 3 products submits a 4th. `count (3) < max (5)` —
  `next()` is called, HTTP 201 returned exactly as before the fix.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `POST /v1/products` for a seller with `currentCount < kycLimitMaxListings` must continue to create
  the product and return HTTP 201.
- `requireKycLevel(minLevel)` on all routes — catalog, enabler, and wallet/payout — must continue to
  gate on `kycLevel` only, returning HTTP 403 with `code: "KYC_LEVEL_REQUIRED"` when the level is
  insufficient; this is completely independent of the new cap check.
- All product mutation routes (`PUT /v1/products/:id`, `DELETE /v1/products/:id`, `POST /v1/products/:id/publish`)
  must continue to apply only `requireKycLevel(0)` without any listing-count check.
- All enabler routes other than `POST /:enablerId/listings` must continue to apply only the existing
  KYC gate without any listing-count check.
- Payout and wallet-credit endpoints must continue to enforce only `requireKycLevel(2)` without any
  listing-count involvement.

**Scope:**
All requests where `isBugCondition(X)` returns `false` — i.e. where the user's current count is
strictly less than their cap — must produce exactly the same response as on the unfixed code. This
includes:
- All non-creation HTTP methods on product and enabler routes.
- All requests by users at level 3 (cap = 9999), which are always below cap in practice.
- All requests where `requireKycLevel` blocks before `requireKycListingCapacity` is even reached.

**Note:** The expected correct behaviour for cap-exceeded requests is defined in the Correctness
Properties section (Property 1). This section documents what must NOT change.

---

## Hypothesized Root Cause

1. **Missing field selection in `requireKycLevel`**: The middleware queries `{ kycLevel, kycStatus }`
   only. `kycLimitMaxListings` is never fetched, so the cap is invisible to the gate.

2. **No count query at the API layer**: Neither `requireKycLevel` nor any other middleware issues a
   `count()` against `catalog_Product` or `enabler_ProductListing`. The cap check simply does not
   exist at the API layer.

3. **Cap written but not enforced**: `PrismaKycRepository.updateKycStatus` correctly writes
   `kycLimitMaxListings` from `getKycLimitsForLevel(level)` when a KYC submission is approved, but
   nothing downstream reads this value for enforcement.

4. **Shared middleware location creates coupling risk**: Because `kyc-gate.middleware.ts` is imported
   by both `catalog-service` and `enabler-service`, a naive fix that imports either service's Prisma
   client directly would create a cross-service dependency. The `countFn` parameter solves this.

---

## Correctness Properties

Property 1: Bug Condition — Listing Cap Reached Returns 403

_For any_ request where `isBugCondition(X)` holds (the authenticated user's current item count is ≥
`kycLimitMaxListings`), the fixed `requireKycListingCapacity` middleware SHALL return HTTP 403 with a
response body of the form:
```json
{
  "success": false,
  "error": {
    "code": "KYC_LISTING_CAP_REACHED",
    "message": "...",
    "currentCount": N,
    "maxAllowed": N,
    "currentLevel": N
  }
}
```
and SHALL NOT call `next()` or allow the creation handler to execute.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation — Below-Cap and Non-Creation Requests Unchanged

_For any_ request where `isBugCondition(X)` does NOT hold (count < cap, or the route does not include
`requireKycListingCapacity`), the fixed middleware SHALL call `next()` and the system SHALL produce
exactly the same observable behaviour as before the fix — same HTTP status, same response body, same
side-effects.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

---

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `services/kyc-service/src/api/middleware/kyc-gate.middleware.ts`

**Addition**: `requireKycListingCapacity` middleware factory

**Middleware Signature:**
```typescript
export const requireKycListingCapacity = (
  countFn: (userId: string) => Promise<number>
) => async (req: Request, res: Response, next: NextFunction): Promise<void>
```

**Implementation Details:**
1. **Extract `userId`** from `(req as any).user?.userId`; return HTTP 401 with
   `code: "UNAUTHORIZED"` if absent (matches the pattern already used in `requireKycLevel`).
2. **Fetch user limits**: Query `prisma.user_User.findUnique` selecting only
   `{ kycLevel: true, kycLimitMaxListings: true }`. Fall back to `kycLimitMaxListings = 5` and
   `kycLevel = 0` if the user row is not found (defensive, matching `requireKycLevel` defaults).
3. **Invoke `countFn(userId)`** to get the current item count. This call uses the calling
   service's own Prisma instance — the middleware itself only holds the `user_User` reference.
4. **Compare**: if `currentCount >= maxAllowed`, respond HTTP 403:
   ```json
   {
     "success": false,
     "error": {
       "code": "KYC_LISTING_CAP_REACHED",
       "message": "You have reached your KYC listing cap of {maxAllowed}. Upgrade your KYC level to create more listings.",
       "currentCount": currentCount,
       "maxAllowed": maxAllowed,
       "currentLevel": currentLevel
     }
   }
   ```
5. **Otherwise**: call `next()`.
6. **Catch-all**: return HTTP 500 with `code: "KYC_GATE_ERROR"` on any unexpected error (matching
   the existing pattern in `requireKycLevel`).

**File 2**: `services/catalog-service/src/api/routes/product.routes.ts`

**Change**: Insert `requireKycListingCapacity` into `sellerMiddleware` immediately after
`requireKycLevel(0)`:
```typescript
import { requireKycLevel, requireKycListingCapacity } from '../../../../kyc-service/src/api/middleware/kyc-gate.middleware';
import { prisma } from '../../../../kyc-service/src/infrastructure/database/prisma-client';

const sellerMiddleware = [
  requireRole(['seller', 'supplier', 'admin']),
  requireKycLevel(0),
  requireKycListingCapacity(
    async (userId) => prisma.product.count({ where: { sellerId: userId } })
  ),
  ...commonMiddleware
];
```

Only the `POST /v1/products` route uses `sellerMiddleware` for creation. The `requireKycListingCapacity`
middleware must **not** be applied to update/delete/publish routes; those use the same `sellerMiddleware`
array, so the count middleware must instead be added inline only to the creation route handler, not
embedded in the shared middleware stack. Concretely, the `sellerMiddleware` array stays unchanged and
the capacity middleware is added as a dedicated inline parameter only on `router.post('/v1/products', ...)`.

**Revised approach for catalog** (avoids polluting update/delete/publish):
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

**File 3**: `services/enabler-service/src/api/routes/enabler.routes.ts`

**Change**: Add `requireKycListingCapacity` inline on the listing-creation route only, after
`requireKycLevel(1)`:
```typescript
import { requireKycLevel, requireKycListingCapacity } from '../../../../kyc-service/src/api/middleware/kyc-gate.middleware';
import { prisma as kyc-prisma } from '../../../../kyc-service/src/infrastructure/database/prisma-client';

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

Note: the enabler route uses the enabler service's own `prisma` instance (already imported) so no
additional import is needed — only the `requireKycListingCapacity` export is added to the import of
`kyc-gate.middleware`.

---

## Testing Strategy

### Validation Approach

The testing strategy follows two phases: first, write exploratory tests that run against the **unfixed**
`requireKycLevel`-only gate and demonstrate the gap; then write fix-checking and preservation tests that
run against the new `requireKycListingCapacity` middleware directly.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the listing-cap bypass BEFORE the fix is applied.
Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Call the unfixed `requireKycLevel(0)` middleware with a mock `req` whose user already
has `kycLimitMaxListings = 5` and whose `countFn` would return 5. Assert that `next()` is called
(demonstrating the cap is not enforced), and that no HTTP 403 is issued. Run the same scenario through
the fixed `requireKycListingCapacity` middleware and assert HTTP 403 is returned.

**Test Cases**:
1. **Level 0 seller at cap via catalog**: Mock user with `kycLevel: 0`, `kycLimitMaxListings: 5`;
   `countFn` returns `5`. Invoke `requireKycLevel(0)` — assert `next()` is called (bug confirmed).
   *(demonstrates gap on unfixed code)*
2. **Level 1 seller at cap via catalog**: Mock user with `kycLevel: 1`, `kycLimitMaxListings: 20`;
   `countFn` returns `20`. Invoke `requireKycLevel(0)` — assert `next()` is called.
   *(demonstrates gap on unfixed code)*
3. **Level 1 enabler at cap**: Mock user with `kycLevel: 1`, `kycLimitMaxListings: 20`;
   `countFn` returns `20`. Invoke `requireKycLevel(1)` — assert `next()` is called.
   *(demonstrates gap on unfixed code)*
4. **Over-cap (count > max)**: Mock user with `kycLimitMaxListings: 5`; `countFn` returns `7`.
   Invoke `requireKycLevel(0)` — assert `next()` is called even though count exceeds cap.
   *(demonstrates gap on unfixed code)*

**Expected Counterexamples**:
- `next()` is called even when `currentCount >= kycLimitMaxListings` because `requireKycLevel`
  never reads `kycLimitMaxListings` or calls `countFn`.
- No HTTP 403 with `code: "KYC_LISTING_CAP_REACHED"` is emitted.
- Possible root cause confirmed: the cap field exists on the user record but is never queried.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed middleware returns HTTP
403 with the correct error body.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := requireKycListingCapacity(countFn)(req, res, next)
  ASSERT res.status CALLED WITH 403
  ASSERT res.json CALLED WITH { success: false, error.code: "KYC_LISTING_CAP_REACHED",
                                  error.currentCount >= error.maxAllowed,
                                  error.currentLevel: user.kycLevel }
  ASSERT next NOT CALLED
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed middleware calls
`next()` and does not alter the response.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT next IS CALLED
  ASSERT res.status NOT CALLED
  ASSERT res.json NOT CALLED
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of `(kycLevel, kycLimitMaxListings, currentCount)` automatically.
- It catches boundary conditions (e.g. `currentCount = maxAllowed - 1`) that manual tests may miss.
- It gives strong guarantees that no below-cap request is accidentally blocked.

**Test Plan**: Observe that `next()` is called for any `currentCount` strictly less than
`kycLimitMaxListings`, across the full range of valid count values and KYC levels. Capture this
as a property-based test, then apply the same test to the fixed code.

**Test Cases**:
1. **Below-cap preservation (catalog)**: For a seller with `kycLimitMaxListings = 5` and
   `currentCount ∈ {0, 1, 2, 3, 4}`, assert `next()` is called and no 403 is issued.
2. **Below-cap preservation (enabler)**: Same for enabler with `kycLimitMaxListings = 20`.
3. **Level 3 preservation**: For a user with `kycLimitMaxListings = 9999` and counts up to 9998,
   assert `next()` is always called.
4. **Non-creation route preservation**: Routes that do not include `requireKycListingCapacity`
   (update, delete, publish) must be unaffected by the new middleware entirely.
5. **requireKycLevel independence**: When `requireKycLevel` fires first and returns 403 with
   `code: "KYC_LEVEL_REQUIRED"`, `requireKycListingCapacity` must never be reached.

### Unit Tests

Test file: `services/kyc-service/src/api/middleware/kyc-gate.middleware.test.ts`

- `requireKycListingCapacity` — user not authenticated → HTTP 401 `UNAUTHORIZED`
- `requireKycListingCapacity` — `countFn` returns `count >= maxAllowed` → HTTP 403
  `KYC_LISTING_CAP_REACHED` with correct `currentCount`, `maxAllowed`, `currentLevel`; `next` not called
- `requireKycListingCapacity` — `countFn` returns `count < maxAllowed` → `next()` called; no response sent
- `requireKycListingCapacity` — `countFn` returns `count === maxAllowed - 1` (boundary, below cap) → `next()` called
- `requireKycListingCapacity` — `countFn` returns `count === maxAllowed` (boundary, at cap) → HTTP 403
- `requireKycListingCapacity` — `kycLimitMaxListings` defaults to `5` when user not found
- `requireKycListingCapacity` — `countFn` throws → HTTP 500 `KYC_GATE_ERROR`
- `requireKycListingCapacity` — level 3 user (`kycLimitMaxListings = 9999`), `countFn` returns `9998` → `next()` called
- `requireKycLevel` — all existing behaviour unchanged (no regressions to the existing middleware)

### Property-Based Tests

Test file: `services/kyc-service/src/api/middleware/kyc-gate.middleware.pbt.test.ts`

Using **fast-check**:

```typescript
// Arbitrary: any (kycLimitMaxListings, currentCount) pair where currentCount < maxAllowed
const belowCapArb = fc.integer({ min: 1, max: 9999 }).chain((max) =>
  fc.integer({ min: 0, max: max - 1 }).map((count) => ({ max, count }))
);

// Property: below-cap requests always call next()
fc.assert(
  fc.asyncProperty(belowCapArb, fc.integer({ min: 0, max: 3 }), async ({ max, count }, kycLevel) => {
    const { req, res, next } = makeMocks({ kycLimitMaxListings: max, kycLevel });
    const countFn = jest.fn().mockResolvedValue(count);
    await requireKycListingCapacity(countFn)(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  })
);

// Arbitrary: any (kycLimitMaxListings, currentCount) pair where currentCount >= maxAllowed
const atOrOverCapArb = fc.integer({ min: 1, max: 9999 }).chain((max) =>
  fc.integer({ min: max, max: max + 100 }).map((count) => ({ max, count }))
);

// Property: at-or-over-cap requests always return 403 and never call next()
fc.assert(
  fc.asyncProperty(atOrOverCapArb, fc.integer({ min: 0, max: 3 }), async ({ max, count }, kycLevel) => {
    const { req, res, next } = makeMocks({ kycLimitMaxListings: max, kycLevel });
    const countFn = jest.fn().mockResolvedValue(count);
    await requireKycListingCapacity(countFn)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.code).toBe('KYC_LISTING_CAP_REACHED');
    expect(body.error.currentCount).toBe(count);
    expect(body.error.maxAllowed).toBe(max);
  })
);
```

### Integration Tests

- **Catalog — seller at cap**: Seed a seller with `kycLevel: 0`, `kycLimitMaxListings: 5` and
  exactly 5 `catalog_Product` rows; `POST /v1/products` → assert HTTP 403
  `KYC_LISTING_CAP_REACHED`, no new product row created.
- **Catalog — seller below cap**: Same seller with 4 products; `POST /v1/products` → assert HTTP 201,
  product row created, count now 5.
- **Enabler — enabler at cap**: Seed an enabler with `kycLevel: 1`, `kycLimitMaxListings: 20` and
  20 `enabler_ProductListing` rows; `POST /:enablerId/listings` → assert HTTP 403
  `KYC_LISTING_CAP_REACHED`.
- **Enabler — enabler below cap**: Same enabler with 19 listings; `POST /:enablerId/listings` →
  assert HTTP 201, listing created.
- **Level check takes precedence**: Seller with `kycLevel: -1` (hypothetical or `kycStatus: none`)
  fails `requireKycLevel(0)` with `KYC_LEVEL_REQUIRED` before the capacity check fires.
- **Unrelated routes unaffected**: `PUT /v1/products/:id`, `DELETE /v1/products/:id`, and
  `GET /:enablerId/listings` all return their expected responses with no cap-related 403.
