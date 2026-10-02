# Order numbers and shipment tracking numbers

**Status:** active contract · **Source of truth:** `shared/ids/human-readable-ids.ts`

Maysar uses **two separate identifier namespaces** for physical commerce. They are never
interchangeable: an order number identifies a whole transaction, while a tracking number
identifies one physical shipment.

| Identifier | Format | Example | Meaning |
|---|---|---|---|
| **Order number** | `ORD-YYYYMMDD-NLNL` | `ORD-20260927-3C8B` | Identifies the **whole order** for its entire lifecycle. It is what the customer and Maysar staff quote when talking about "the transaction". |
| **Shipment tracking number** | `TRK-NLNLNL` | `TRK-3C8B2D` | Owned by **one shipment** (one seller group). One order may contain several shipments, so each gets its own independent tracking number. |
| **Transaction id** | `TXN-YYYYMMDD-NLNL` | `TXN-20260927-3C8B` | Payment/transaction reference. |

* `N` = digit from **2–9** · `L` = uppercase letter from **A–Z without I, L and O**
* `0`, `1`, `O`, `I` and `L` are excluded from the *random* parts so a value can never be
  mis-heard (`0`/`O`, `1`/`I`/`L`) or mis-typed. The `YYYYMMDD` calendar part keeps real
  calendar digits — its width and position are fixed, so it is never ambiguous.

## Rules

1. **The order number stays with the order.** It is created once (`PlaceOrderUseCase`), is
   the order's primary key (`orders.id`) and never changes for the order's lifetime.
2. **An order number is never a shipment identifier.** The order-level tracking number
   (`MYS-TZ-ORD-…`) is **retired**; the `orders.trackingNumber` column is dropped.
3. **One order → many shipments.** Checkout creates one `Logistics_Shipment` per seller
   group; each row stores its own `TRK-NLNLNL` in `logistics_shipments.trackingNumber`
   (`UNIQUE`).
4. **The order number is the point of entry.** Customers identify their transaction by the
   order number; from there the tracking screen lists the shipments and the customer picks
   the one to follow.

## Tracking lookup

`GET /api/order/orders/tracking/{identifier}` (order-service) and
`GET /api/logistics/api/v1/tracking/{identifier}` (logistics-service) accept **either**
identifier:

| Input | `lookupType` | Response |
|---|---|---|
| Order number (`ORD-…`) | `ORDER` | The order plus **every** shipment created for it (`shipments[]`), so the customer can select one. |
| Shipment tracking number (`TRK-…`) | `SHIPMENT` | That single shipment (with its parent order for context) — resolved directly, no order round-trip. |
| Anything else | — | `400 INVALID_TRACKING_IDENTIFIER` (the value is rejected before any lookup, so ids cannot be probed). |

Both services enforce the split: the order-service `ship` action rejects anything that is
not a `TRK-…` number, and no endpoint accepts an order number where a shipment tracking
number is required.


## Enforcement points

| Layer | Location | Rule |
|---|---|---|
| Generation | `shared/ids/human-readable-ids.ts` (`makeOrderNumber`, `makeShipmentTrackingNumber`, `makeTransactionId`) | The only place identifiers are created. |
| Order-service | `infrastructure/services/id-generator.service.ts` | Delegates to the shared module; no other order-id shape exists (`generateOrderTrackingNumber`, `generateShortOrderId` and `generateTrackingId` were removed). |
| Payment-service | `api/validators/payment.validator.ts` (`orderIdSchema`) | Order references are exactly an order number — no internal/system id fallback. |
| Enabler-service | `api/routes/enabler.routes.ts` (`orderId` param) | Order number only; the retired `MSR-ORD-…` shape is rejected. |
| Logistics-service | `api/validators/tracking.validator.ts`, `api/validators/delivery.validator.ts`, `domain/entities/shipment.entity.ts` | Tracking input is exactly an order number or a `TRK-…` number; a delivery's `orderId` is exactly an order number; shipments own their `TRK-…` value. |
| Order-service | `api/routes/order.routes.ts` | Every `/orders/:id` path parameter (read, update, status, cancel, delete) is validated as an order number. |
| Checkout-service | `application/use-cases/multi-seller-checkout.use-case.ts`, `api/controllers/checkout.controller.ts` | The master order of a multi-seller checkout carries an order number, and `orderId` in a checkout response is only ever an order number. |
| Support / chat / inventory | `dispute.validator.ts`, `chat.routes.ts`, `modules/api/stockApi.ts` | Any order reference is exactly an order number. |
| Contracts | `openapi.yaml`, `api-contract.yaml`, `services/order-service/openapi.yaml` | Anchored patterns for the order number, the shipment tracking number and the dual lookup identifier. |
| Fixtures | `tests/contract/dredd.hooks.js`, `scripts/testing/seed-contract-data.js` | Build the same shapes as the validators. |

## Purity: no legacy formats, no compatibility paths

Every identifier surface accepts exactly the formats above and nothing else. Removed in this pass:

* the retired branded order shape `MSR-ORD-YYYYMMDD-HHMMSS-XXXX` (generator, validators,
  contracts, fixtures);
* the separate order-level tracking number `MYS-TZ-ORD-...` (generator, column, endpoint);
* the short/variant generators (`generateShortOrderId`, `generateTrackingId`) and the
  generic-ULID master order number (`MSR-MO-...`) - a master order is an order, so it carries an
  order number;
* the `GET /orders/:id` bridge that resolved `chk_ord_...`/`chk_ses_...` ids (with its
  "most recent order of the buyer" guess) - a checkout response now returns the order number
  under `orderId` and reports the checkout id separately when no order exists yet;
* permissive length-only order-id checks in the logistics delivery, support dispute, chat and
  inventory reservation APIs;
* the `isSystemId` fallback in the payment order-id schema and the legacy tolerance in the
  enabler commission path;
* unconstrained `orderId` declarations in the OpenAPI contracts - every one now carries the
  anchored order-number pattern.

Scope note: `isSystemId()` in `shared/ids/id.ts` still accepts prefixed ULIDs, UUIDs and CUIDs.
That validator governs *every* entity id on the platform (products, users, payments, ...), not
order references; retiring UUID/CUID there is a separate platform-wide decision.

## Deployment prerequisite: data normalisation

Retired values are rejected (400/404) instead of being resolved, so rows created before this
change must be normalised before the new validators go live: `orders.id`, `order_MasterOrder.id`
and every order-id reference (`enabler_Order.orderId`, `enabler_Commission.orderId`,
`Order_OrderItem.orderId`, `inventory` reservations, chat `relatedOrderId`, logistics delivery
`orderId`). Anything still holding a retired value simply becomes unreachable through the API.

## Accepted / rejected examples

| Value | Order number | Shipment tracking | Notes |
|---|---|---|---|
| `ORD-20260927-3C8B` | yes | no | Generated order number. |
| `TRK-3C8B2D` | no | yes | Generated shipment tracking number. |
| `ORD-20260927-1A2B` | no | no | `1` is excluded from the digit alphabet. |
| `ORD-20260927-3L2B` | no | no | `L` is excluded from the letter alphabet. |
| `ORD-20260927-3A2B-EXT` | no | no | No extra characters, segments or suffixes. |
| `MSR-ORD-20260927-085312-1DEF` | no | no | Retired branded shape - rejected everywhere, not just "legacy data". |
| `MYS-TZ-ORD-20260320-1A2B` | no | no | Retired order-level tracking number. |
| `TRK-20260927-3C8B` | no | no | Tracking numbers carry no date component. |

## Data migration

`prisma/migrations/20260927000000_order_number_and_shipment_tracking_number`:

* adds `logistics_shipments.trackingNumber` (unique, backfilled deterministically from each
  shipment id with digits in the `N` positions and letters in the `L` positions),
* fails loudly instead of silently duplicating a value if the backfill ever collides,
* drops `orders.trackingNumber`.

## Capacity note

`TRK-NLNLNL` holds `8 x 23 x 8 x 23 x 8 x 23` (~6.2M) values. Shipment creation checks the
value is unused and re-issues on collision (max 5 attempts), and the unique index is the final
backstop, which keeps normal traffic collision-free. If the shipment history ever approaches
that space, extend the suffix to `NLNLNLNL` - the pattern lives in one place and the
generator, validators and specs all follow it.

## Related documents

* `docs/FLOWS/payment/user-flow/buyer-flows.md` - buyer-facing access rules for payment reads.
* `docs/playwright-testing-guide.md` - E2E flows that assert order URLs and tracking screens.
* `docs/logistics/LOGISTICS_SERVICE_SYSTEM.md` - logistics endpoints and their parameters.

## Follow-up (tracked, not part of this change)

`Logistics_Delivery.trackingNumber` (courier operation level) is a **delivery**-level
identifier and still exists. It is independent of the order number, but when a delivery
executes a specific shipment it should reuse that shipment's `TRK-...` value so a customer
never sees two different tracking numbers for the same parcel.
