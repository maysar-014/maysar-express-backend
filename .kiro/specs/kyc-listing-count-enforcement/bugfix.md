# Bugfix Requirements Document

## Introduction

The system defines per-KYC-level listing caps via `getKycLimitsForLevel()` and stores them on each user as
`kycLimitMaxListings`, `kycLimitMaxTransactions`, and `kycLimitMaxEarnings`. When an admin approves a KYC
submission those limits are written to `user_User` and are therefore live data. However, the `requireKycLevel`
middleware — the only KYC gate applied to seller product-creation and enabler listing-creation routes — only
checks `kycLevel >= minLevel`. It never reads `kycLimitMaxListings` or counts the user's existing products /
listings. A seller at KYC level 0 whose cap is 5 products can therefore create product 6, 7, … without any
API-layer rejection. The caps are purely cosmetic data today.

The primary impact is on the **catalog service** (seller product creation, cap: 5 at level 0 → 20 → 100 →
9 999) and on the **enabler service** (enabler listing creation, cap shared through the same limit fields).
Transaction and earnings caps are a lower-priority concern and are explicitly out of scope for this fix.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a seller with KYC level 0 (cap: 5 products) submits `POST /v1/products` and already has 5 or more
    active products THEN the system creates the product successfully and returns HTTP 201, ignoring the listing
    cap stored in `user_User.kycLimitMaxListings`.

1.2 WHEN a seller with KYC level 1 (cap: 20 products) submits `POST /v1/products` and already has 20 or more
    active products THEN the system creates the product successfully and returns HTTP 201, ignoring the listing
    cap stored in `user_User.kycLimitMaxListings`.

1.3 WHEN an enabler with KYC level 1 (cap: 20 listings) submits `POST /:enablerId/listings` and already has
    20 or more active listings THEN the system creates the listing successfully and returns HTTP 201, ignoring
    the listing cap stored in `user_User.kycLimitMaxListings`.

1.4 WHEN the `requireKycLevel(minLevel)` middleware is invoked for a product-creation or listing-creation
    request THEN the middleware only queries `kycLevel` and `kycStatus` — it never fetches
    `kycLimitMaxListings` or counts the caller's existing products/listings.

### Expected Behavior (Correct)

2.1 WHEN a seller submits `POST /v1/products` and their current product count is greater than or equal to
    `user_User.kycLimitMaxListings` THEN the system SHALL reject the request with HTTP 403 and an error body
    of the form
    `{ code: "KYC_LISTING_CAP_REACHED", message: "…upgrade KYC level…", currentCount, maxAllowed, currentLevel }`.

2.2 WHEN a seller submits `POST /v1/products` and their current product count is strictly less than
    `user_User.kycLimitMaxListings` THEN the system SHALL allow the request to proceed to the product creation
    handler unchanged.

2.3 WHEN an enabler submits `POST /:enablerId/listings` and their current listing count is greater than or
    equal to `user_User.kycLimitMaxListings` THEN the system SHALL reject the request with HTTP 403 and an
    error body of the form
    `{ code: "KYC_LISTING_CAP_REACHED", message: "…upgrade KYC level…", currentCount, maxAllowed, currentLevel }`.

2.4 WHEN an enabler submits `POST /:enablerId/listings` and their current listing count is strictly less than
    `user_User.kycLimitMaxListings` THEN the system SHALL allow the request to proceed to the listing creation
    handler unchanged.

2.5 WHEN the listing cap check fires THEN the error message SHALL include the user's current KYC level, the
    cap for that level, and guidance to upgrade KYC level so the user understands how to unblock themselves.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a seller submits any product mutation request other than `POST /v1/products` (e.g., update, delete,
    publish) THEN the system SHALL CONTINUE TO apply the existing `requireKycLevel(0)` gate without any
    listing-count check.

3.2 WHEN a seller submits `POST /v1/products` and has not yet reached their `kycLimitMaxListings` cap THEN
    the system SHALL CONTINUE TO create the product and return HTTP 201 exactly as before.

3.3 WHEN a seller does not meet the minimum KYC level for an action (current check via `requireKycLevel`)
    THEN the system SHALL CONTINUE TO return HTTP 403 with `code: "KYC_LEVEL_REQUIRED"`, independently of
    the listing-count check.

3.4 WHEN an enabler submits any action other than listing creation THEN the system SHALL CONTINUE TO enforce
    only the existing `requireKycLevel(1)` gate without any listing-count check.

3.5 WHEN a user with a KYC level whose listing cap is 9 999 (level 3) creates a product or listing THEN the
    system SHALL CONTINUE TO allow the action regardless of current count, effectively treating level 3 as
    uncapped.

3.6 WHEN the payout or wallet-credit endpoints are accessed THEN the system SHALL CONTINUE TO enforce only
    `requireKycLevel(2)` without any listing-count check, as these flows are unrelated to the listing cap.

---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies requests that should be blocked:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ProductCreateRequest | EnablerListingCreateRequest
  OUTPUT: boolean

  user  ← fetchUser(X.userId)
  count ← countActiveItems(X.userId, X.requestType)   // catalog products or enabler listings

  RETURN count >= user.kycLimitMaxListings
END FUNCTION
```

**Property: Fix Checking** — correct behavior for requests where the cap is reached:

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← handleRequest'(X)   // with the fix applied
  ASSERT result.httpStatus = 403
  ASSERT result.body.error.code = "KYC_LISTING_CAP_REACHED"
  ASSERT result.body.error.currentCount >= result.body.error.maxAllowed
END FOR
```

**Property: Preservation Checking** — non-buggy requests must behave identically before and after the fix:

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT handleRequest(X) = handleRequest'(X)   // F(X) = F'(X)
END FOR
```
