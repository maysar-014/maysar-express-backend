# Bugfix Requirements Document

## Introduction

Four distinct backend bugs are causing 13+ E2E test failures across order status advancement, order cancellation, business registry owner lookup, and logistics delivery creation. All bugs exist in production service code. The fixes are isolated, non-breaking changes that restore correct HTTP responses and data shapes for affected endpoints while preserving all non-affected flows.

**Affected services:**
- `order-service` — Bugs A and B (status 403, cancel 403)
- `business-registry-service` — Bug C (ownerId undefined)
- `logistics-service` — Bug D (delivery id undefined)

**Tests fixed:** Groups A (26, 39, 40, 67, 70, 71, 82, 86, 93, 94), B (16, 27, 73, 81, 84, 116), C (92), D (40, 57, 58, 87, 88, 89)

---

## Bug Analysis

### Current Behavior (Defect)

**Bug A — Order status advancement returns 403 from PENDING_SELLER_VERIFICATION**

1.1 WHEN `POST /api/order/orders/{id}/status` is called to confirm an order that is in `PENDING_SELLER_VERIFICATION` status THEN the system returns HTTP 403 because `pending_seller_verification` is absent from the `statusRank` map, causing `currentRank` to be `undefined`, and the `confirm` transition guard rejects it as not matching `'pending'`

1.2 WHEN the seed helper attempts to auto-advance an order through CONFIRMED → PROCESSING → SHIPPED starting from `PENDING_SELLER_VERIFICATION` status THEN the system returns HTTP 403 at the first transition, blocking all subsequent status advances for that order

**Bug B — Order cancel returns 403 from PENDING_SELLER_VERIFICATION**

1.3 WHEN `POST /api/order/orders/{id}/cancel` is called by a buyer on an order in `PENDING_SELLER_VERIFICATION` status THEN the system returns HTTP 403 because `CancellationPolicy.canCancelOrder()` only permits cancellation when `normalizedStatus` is `'pending'` or `'confirmed'`

1.4 WHEN a buyer attempts to cancel an order in `SELLER_VERIFIED`, `SELLER_DECLINED`, or `VERIFICATION_OVERDUE` status THEN the system returns HTTP 403 because those statuses are also absent from the cancellable-status allowlist in `CancellationPolicy`

**Bug C — Business registry getBusinessesByOwner returns array instead of single object**

1.5 WHEN `GET /api/business-registry/businesses/owner/{userId}` is called THEN the system returns `data` as an array of business objects, causing `businessResult.data.ownerId` to be `undefined` because array properties do not include `ownerId`

**Bug D — Logistics createDelivery response missing `id` field**

1.6 WHEN `POST /api/logistics/api/v1/deliveries` is called to create a delivery THEN the system returns a response where `data.id` is `undefined` because the use-case result object uses `deliveryId` as the field name, not `id`

1.7 WHEN a test reads `delivery.id` from the create-delivery response and uses it to call `PATCH /api/logistics/api/v1/deliveries/{id}/status` THEN the system receives a request to `PATCH .../deliveries/undefined/status`, which fails with 404

---

### Expected Behavior (Correct)

**Bug A — Order status advancement**

2.1 WHEN `POST /api/order/orders/{id}/status` is called on an order in `PENDING_SELLER_VERIFICATION` status THEN the system SHALL treat `PENDING_SELLER_VERIFICATION` as equivalent to rank `0` (same as `pending`) and allow the `confirm` transition to proceed, returning HTTP 200

2.2 WHEN the state machine auto-advance logic evaluates `PENDING_SELLER_VERIFICATION` as a `from` status THEN the system SHALL include it in the valid `from` arrays so the order can be advanced through CONFIRMED → PROCESSING → SHIPPED without 403 errors

**Bug B — Order cancellation**

2.3 WHEN `POST /api/order/orders/{id}/cancel` is called by a buyer on an order in `PENDING_SELLER_VERIFICATION` status THEN the system SHALL allow cancellation and return HTTP 200, because the buyer has not yet committed payment and the order is semantically equivalent to `pending`

2.4 WHEN `POST /api/order/orders/{id}/cancel` is called by a buyer on an order in `SELLER_VERIFIED`, `SELLER_DECLINED`, or `VERIFICATION_OVERDUE` status THEN the system SHALL allow cancellation and return HTTP 200, treating these pre-payment statuses as cancellable

**Bug C — Business registry owner lookup**

2.5 WHEN `GET /api/business-registry/businesses/owner/{userId}` is called and at least one business exists for the owner THEN the system SHALL return `data` as the first (or most recently created) business object directly, so that `businessResult.data.ownerId` resolves to the owner's user ID string

**Bug D — Logistics delivery id field**

2.6 WHEN `POST /api/logistics/api/v1/deliveries` is called successfully THEN the system SHALL return a response where `data.id` is present and equals `data.deliveryId`, so that callers using `delivery.id` receive the correct delivery identifier

2.7 WHEN `data.id` is present in the create-delivery response THEN the system SHALL allow the subsequent `PATCH /api/logistics/api/v1/deliveries/{id}/status` call to resolve to a valid URL and return HTTP 200

---

### Unchanged Behavior (Regression Prevention)

**Bug A — Status transitions for normal statuses**

3.1 WHEN `POST /api/order/orders/{id}/status` is called on an order already in `pending` status THEN the system SHALL CONTINUE TO apply the existing status rank and transition logic without change

3.2 WHEN `POST /api/order/orders/{id}/status` is called on an order in `confirmed`, `processing`, `shipped`, or any other currently-mapped status THEN the system SHALL CONTINUE TO enforce existing transition rules and idempotency checks

3.3 WHEN an already-delivered or already-cancelled order receives a status update request THEN the system SHALL CONTINUE TO return the appropriate rejection response

**Bug B — Cancellation policy for standard statuses**

3.4 WHEN `POST /api/order/orders/{id}/cancel` is called by a buyer on an order in `pending` status THEN the system SHALL CONTINUE TO allow cancellation and return HTTP 200

3.5 WHEN `POST /api/order/orders/{id}/cancel` is called by a buyer on an order in `confirmed` status THEN the system SHALL CONTINUE TO require seller consent (return `requiresSellerConsent: true`) as before

3.6 WHEN `POST /api/order/orders/{id}/cancel` is called on an order in `ASSIGNED`, `SHIPPED`, or `IN_TRANSIT` status THEN the system SHALL CONTINUE TO reject cancellation with HTTP 403

3.7 WHEN `POST /api/order/orders/{id}/cancel` is called by a seller or system actor THEN the system SHALL CONTINUE TO apply the existing seller/system cancellation logic unchanged

**Bug C — Business registry other endpoints**

3.8 WHEN `GET /api/business-registry/businesses/{id}` is called THEN the system SHALL CONTINUE TO return a single business object in `data` as before

3.9 WHEN `GET /api/business-registry/businesses/owner/{userId}` is called and no businesses exist for the owner THEN the system SHALL CONTINUE TO return an empty result (empty array or empty `data`)

3.10 WHEN business registration, verification, update, or suspension endpoints are called THEN the system SHALL CONTINUE TO behave as before without modification

**Bug D — Logistics delivery other fields**

3.11 WHEN `POST /api/logistics/api/v1/deliveries` returns a response THEN the system SHALL CONTINUE TO include `data.deliveryId`, `data.courierId`, `data.estimatedDeliveryTime`, and all other existing fields in the response

3.12 WHEN `GET /api/logistics/api/v1/deliveries/{deliveryId}` or `PATCH .../status` endpoints are called THEN the system SHALL CONTINUE TO behave as before for all existing response fields and status codes
