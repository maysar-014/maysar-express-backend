# Bugfix Requirements Document

## Introduction

Four backend API contract violations are causing 27 E2E test failures across checkout confirmation, KYC admin state machine handling, catalog product creation schema, and JWT role assignment for non-buyer accounts. These bugs break the ability to seed and exercise the platform's core flows in automated tests, and also reflect incorrect production API contracts that downstream clients depend on.

The issues are:
- **B1**: `POST /api/checkout/:id/confirm` returns a checkout session object with no `orderId`, making it impossible to track the created order.
- **B2**: `PATCH /api/kyc/admin/:userId` enforces a strict `pending` guard, but the `GET /api/kyc/status` response shape is inconsistent, causing the seed guard to fail silently and attempt a double-approval on a `verified` KYC.
- **B3**: `POST /api/catalog/v1/products` now requires a richer schema (`brand`, `productName`, `minimumOrderQuantity`, `supplierLocationId`, `structuredAttributes`, `mediaUrls`) but no backward-compatible alias for the legacy `name` field exists.
- **B4**: Seeded non-buyer accounts carry `BUYER` in addition to their primary role in their JWT, causing the login flow to redirect to `/en/select-role` instead of the correct portal when no `active_role` cookie is set.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `POST /api/checkout/:id/confirm` is called with a valid checkout session ID THEN the system returns a checkout session object (fields: `id`, `cartId`, `userId`, `status`, `shippingAddressId`, etc.) with no `orderId` field, even though an order is created internally.

1.2 WHEN a seed helper calls `GET /api/kyc/status` and the response body shape does not include a top-level `status` field, or includes it as `undefined`, THEN the system allows the seed to skip the short-circuit guard and subsequently calls `PATCH /api/kyc/admin/:userId` on a `verified` or `rejected` KYC record.

1.3 WHEN `PATCH /api/kyc/admin/:userId` is called with `action: "approve"` and the user's KYC record is in `verified` or `rejected` state THEN the system returns HTTP 400 with `{"error":"User KYC must be pending"}`, rejecting the idempotent re-approval.

1.4 WHEN `POST /api/catalog/v1/products` is called with a payload using the legacy `name` field (and omitting `productName`, `brand`, `minimumOrderQuantity`, `structuredAttributes`, `mediaUrls`) THEN the system returns HTTP 422 `VALIDATION_ERROR` listing those fields as required.

1.5 WHEN a seeded non-buyer account (seller, courier, enabler, supplier, admin) logs in via the UI with valid credentials THEN the system returns a JWT that includes `BUYER` alongside the account's primary role (e.g., `["BUYER", "SELLER"]`), causing the middleware to redirect to `/en/select-role` because `selectablePortalRoles.length > 1` and no `active_role` cookie is present.

---

### Expected Behavior (Correct)

2.1 WHEN `POST /api/checkout/:id/confirm` is called with a valid checkout session ID THEN the system SHALL return a response that includes an `orderId` field containing the ID of the order created for that checkout session (e.g., `{ orderId: "ord_...", status: "confirmed", ... }`).

2.2 WHEN `GET /api/kyc/status` is called for any user THEN the system SHALL return a response body that consistently includes a `status` field at the data level reflecting the current KYC status (`none`, `pending`, `under_review`, `verified`, `rejected`), so callers can reliably short-circuit on non-pending states.

2.3 WHEN `PATCH /api/kyc/admin/:userId` is called with `action: "approve"` and the user's KYC is already `verified` THEN the system SHALL treat the operation as idempotent and return HTTP 200 with the current `verified` status and level, without raising an error.

2.4 WHEN `POST /api/catalog/v1/products` is called with a payload that uses the legacy `name` field instead of `productName` THEN the system SHALL accept `name` as an alias for `productName` and create the product successfully (backward-compatible alias).

2.5 WHEN a seeded non-buyer account is created (seller, courier, enabler, supplier, admin) THEN the system SHALL assign only the account's single primary role in the JWT, so that login via the UI routes directly to the correct portal without requiring an `active_role` cookie.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `POST /api/checkout/:id/confirm` is called with an invalid or non-existent session ID THEN the system SHALL CONTINUE TO return HTTP 404 with `CHECKOUT_SESSION_NOT_FOUND`.

3.2 WHEN `POST /api/checkout/:id/confirm` is called and the basket value is below the minimum THEN the system SHALL CONTINUE TO return HTTP 422 with `MINIMUM_BASKET_VALUE_NOT_MET`.

3.3 WHEN `PATCH /api/kyc/admin/:userId` is called with `action: "approve"` and the user's KYC is in `rejected` state (not `pending` or `verified`) THEN the system SHALL CONTINUE TO reject the request, returning HTTP 400, enforcing the state machine for non-idempotent transitions.

3.4 WHEN `PATCH /api/kyc/admin/:userId` is called and the user does not exist THEN the system SHALL CONTINUE TO return an error indicating the user was not found.

3.5 WHEN `POST /api/catalog/v1/products` is called with the new `productName` field and all required fields (`brand`, `minimumOrderQuantity`, `structuredAttributes`, `mediaUrls`) THEN the system SHALL CONTINUE TO create the product successfully using the structured schema.

3.6 WHEN a buyer account logs in via the UI THEN the system SHALL CONTINUE TO route directly to the buyer portal, as buyer accounts carry only the `BUYER` role.

3.7 WHEN an account with multiple legitimately assigned roles (a user who is both a buyer and a seller by business intent) logs in via the UI THEN the system SHALL CONTINUE TO present the role-selection screen (`/en/select-role`).

3.8 WHEN `GET /api/kyc/status` is called for a user whose KYC has never been submitted THEN the system SHALL CONTINUE TO return status `none` without error.
