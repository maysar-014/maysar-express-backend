# Requirements Document

## Introduction

Maysar is a Tanzanian multi-vendor marketplace where buyers browse products from independent sellers. Currently, an `Order_Order` record contains exactly one `sellerId`, forcing buyers to complete a separate checkout per seller. This feature enables multi-seller checkout: the cart remains buyer-owned and multi-seller, but at checkout the system splits items by seller, creates one `Order_Order` per seller atomically, and links them under a thin `Order_MasterOrder` record that gives the buyer a unified view of the purchase. All existing per-seller order logic (stock verification, COD trust, chat, settlement, logistics) is preserved and continues to operate on individual seller orders without modification.

---

## Glossary

- **Buyer**: An authenticated user purchasing goods on the platform.
- **Seller**: An independent merchant whose products appear in the marketplace.
- **Order_Order** (Seller Order): The existing single-seller order record. Remains structurally unchanged; each record has exactly one `sellerId`.
- **Order_MasterOrder** (Master Order): A new, read-only grouping record that links N seller orders created from a single checkout. Its primary purpose is buyer UX; it carries no independent business logic.
- **Master Order ID**: A platform-generated identifier for an `Order_MasterOrder` record, prefixed `MSR-MO-` (e.g., `MSR-MO-20250101-ABC123`).
- **Seller Group**: The subset of cart items that share the same `sellerId`, produced during checkout splitting.
- **Per-Seller Quote**: A `Logistics_Quote` record (`quoteId`) scoped to a single seller-to-buyer delivery route, required once per Seller Group before checkout can be confirmed.
- **Checkout_Session**: The existing checkout session record that transitions to multi-seller by holding one `quoteId` per Seller Group instead of a single `quoteId`.
- **Atomic Checkout**: A database transaction in which all seller orders for a single master order are either all created or all rolled back together.
- **Virtual Master Order**: A conceptual construct used at read time to represent a legacy single-seller order as if it had an associated master order, without writing a new database record.
- **Checkout_Service**: The service responsible for session management, seller splitting, per-seller quote validation, atomic order creation, and master order creation.
- **Order_Service**: The service that owns `Order_Order` records, exposes buyer and seller order APIs, and hosts `PlaceOrderUseCase`.
- **Analytics_Service**: The service that records buyer transaction events and per-seller sales events.
- **PlaceOrderUseCase**: The existing use case `PlaceOrderUseCase.execute({ buyerId, sellerId, items[], paymentMethod, deliveryAddress })` — its signature remains unchanged.
- **COD**: Cash on Delivery payment method.
- **TZS**: Tanzanian Shilling, the platform currency.

---

## Requirements

### Requirement 1: Master Order Schema

**User Story:** As a platform architect, I want a master order record that groups seller orders, so that the buyer has a single reference for a multi-seller checkout.

#### Acceptance Criteria

1. THE Checkout_Service SHALL create an `Order_MasterOrder` record with the fields: `id` (Master Order ID), `buyerId`, `totalAmount` (sum of all seller order totals in TZS), `currency` (default `TZS`), `status` (derived — see Requirement 6), `paymentMethod`, `createdAt`, and `updatedAt`.
2. THE Checkout_Service SHALL generate every Master Order ID using the format `MSR-MO-{YYYYMMDD}-{6-char alphanumeric suffix}`, where the date component is the UTC creation date.
3. THE Order_MasterOrder record SHALL reference its child seller orders through an `Order_MasterOrderItem` join table containing `masterOrderId` and `sellerOrderId`.
4. THE Order_MasterOrder record SHALL be immutable after creation: no business-logic use case SHALL modify its `id`, `buyerId`, `paymentMethod`, `currency`, or child order membership.
5. WHEN a buyer places an order containing items from exactly one seller, THE Checkout_Service SHALL still create an `Order_MasterOrder` record linking that single seller order, ensuring all orders are reachable via the master order API.
6. THE Order_MasterOrder record SHALL store `itemCount` as the total number of order line items across all child seller orders.

---

### Requirement 2: Cart-to-Seller-Split Checkout Flow

**User Story:** As a buyer, I want to checkout my multi-seller cart in a single action, so that I do not have to repeat checkout per seller.

#### Acceptance Criteria

1. WHEN the Checkout_Service processes a checkout confirmation, THE Checkout_Service SHALL group the session's cart items into Seller Groups by `sellerId`, producing one group per distinct seller.
2. WHEN grouping cart items, THE Checkout_Service SHALL retrieve the `sellerId` for each `productId` from the Catalog service and SHALL NOT rely on any `sellerId` cached on the session metadata.
3. WHEN all Seller Groups have valid, unexpired Per-Seller Quotes (see Requirement 3), THE Checkout_Service SHALL invoke `PlaceOrderUseCase` once per Seller Group, passing `{ buyerId, sellerId, items, paymentMethod, deliveryAddress }` exactly as defined by the existing use-case signature.
4. THE Checkout_Service SHALL execute all `PlaceOrderUseCase` invocations and the `Order_MasterOrder` creation within a single atomic database transaction, such that either all seller orders and the master order are persisted or none are.
5. WHEN the atomic transaction succeeds, THE Checkout_Service SHALL return a single response containing the `masterOrderId` and an array of `{ sellerId, sellerOrderId }` pairs to the buyer.
6. THE Checkout_Service SHALL reject a checkout session that contains zero items with error code `CHECKOUT_SESSION_EMPTY`.
7. THE Checkout_Service SHALL reject a checkout session whose total amount falls below the platform minimum basket value, returning error code `MINIMUM_BASKET_VALUE_NOT_MET` as currently implemented.

---

### Requirement 3: Per-Seller Delivery Quote

**User Story:** As a logistics manager, I want each seller group in a checkout to have its own delivery quote, so that delivery pricing accurately reflects each seller's warehouse-to-buyer route.

#### Acceptance Criteria

1. THE Checkout_Service SHALL require one active `Logistics_Quote` (`quoteId`) per Seller Group before permitting checkout confirmation.
2. WHEN the buyer's session is created or updated with items from N distinct sellers, THE Checkout_Service SHALL store N `{ sellerId, quoteId }` pairs on the session, one per Seller Group.
3. WHEN the buyer confirms checkout, THE Checkout_Service SHALL validate each Per-Seller Quote by calling the logistics service's internal quote-validation endpoint and SHALL reject confirmation if any quote has status other than `ACTIVE`.
4. IF a Per-Seller Quote has expired at the time of checkout confirmation, THEN THE Checkout_Service SHALL return error code `QUOTE_EXPIRED` with the `sellerId` of the affected group, without placing any orders.
5. WHEN all Per-Seller Quotes are valid, THE Checkout_Service SHALL pass each quote's `quoteId` to the corresponding `PlaceOrderUseCase` invocation so that it is stored on the resulting `Order_Order.quoteId` field.
6. AFTER all seller orders are successfully created, THE Checkout_Service SHALL mark each consumed Per-Seller Quote as `CONSUMED` by calling the logistics service's quote-consume endpoint.
7. THE Checkout_Service SHALL reject a checkout session where any Seller Group has no associated `quoteId`, returning error code `MISSING_DELIVERY_QUOTE` with the affected `sellerId`.

---

### Requirement 4: Master Order Status Derivation

**User Story:** As a buyer, I want the master order status to give me an accurate summary of my overall purchase, so that I know at a glance whether my order is on track.

#### Acceptance Criteria

1. THE Order_Service SHALL derive the `Order_MasterOrder.status` from the statuses of its child seller orders according to the following precedence rules, evaluated in order:
   - If ALL child orders have status `DELIVERED` or `COMPLETED` → master status = `COMPLETED`
   - If ANY child order has status `cancelled` → master status = `PARTIALLY_CANCELLED` (unless all are cancelled, in which case `CANCELLED`)
   - If ALL child orders have status `cancelled` → master status = `CANCELLED`
   - If ANY child order has status `SHIPPED` or `IN_TRANSIT` → master status = `IN_TRANSIT`
   - If ANY child order has status `SELLER_CONFIRMED` or `SELLER_VERIFIED` → master status = `CONFIRMED`
   - If ALL child orders have status `PENDING` or `PENDING_SELLER_VERIFICATION` → master status = `PENDING`
   - Otherwise → master status = `PROCESSING`
2. THE Order_Service SHALL compute the derived master order status on every read of an `Order_MasterOrder` record and SHALL NOT persist the derived status as a column on the `Order_MasterOrder` table.
3. WHEN a buyer requests a master order, THE Order_Service SHALL include the derived status in the response payload under the field `status`.
4. THE Order_Service SHALL expose a master order status that reflects child order states at the time of the read — there SHALL be no asynchronous cache or event-driven status propagation for the master order status field.

---

### Requirement 5: Buyer API — Get Master Order with Child Seller Orders

**User Story:** As a buyer, I want a single API endpoint that returns my master order with all its seller sub-orders, so that I can review everything I purchased in one view.

#### Acceptance Criteria

1. THE Order_Service SHALL expose the endpoint `GET /api/orders/master/:masterOrderId` accessible to authenticated buyers.
2. WHEN a buyer calls `GET /api/orders/master/:masterOrderId`, THE Order_Service SHALL return a response containing:
   - `masterOrderId`, `status` (derived), `totalAmount`, `currency`, `paymentMethod`, `createdAt`
   - `sellerOrders`: an array of full seller order objects, one per child `Order_Order`
3. WHEN a buyer requests a master order that does not belong to the requesting buyer, THE Order_Service SHALL return HTTP 403 with error code `FORBIDDEN`.
4. WHEN a buyer requests a master order that does not exist, THE Order_Service SHALL return HTTP 404 with error code `MASTER_ORDER_NOT_FOUND`.
5. THE Order_Service SHALL expose the endpoint `GET /api/orders/master` accessible to authenticated buyers, returning a paginated list of the buyer's master orders sorted by `createdAt` descending, with each item containing the derived status and child order count.
6. WHEN paginating master orders, THE Order_Service SHALL accept `page` and `pageSize` query parameters, with `pageSize` defaulting to 20 and capped at 100.

---

### Requirement 6: Seller API — Seller Order Isolation

**User Story:** As a seller, I want to see only my own orders, so that I cannot view another seller's order data.

#### Acceptance Criteria

1. THE Order_Service SHALL ensure that all existing seller-scoped order endpoints (`GET /api/orders/seller/:sellerId/...`) return only `Order_Order` records whose `sellerId` matches the authenticated seller's identity.
2. WHEN an authenticated seller requests an order by ID, THE Order_Service SHALL return HTTP 403 with error code `FORBIDDEN` if the `Order_Order.sellerId` does not match the authenticated seller's identity.
3. THE Order_Service SHALL NOT expose any `Order_MasterOrder` endpoints to seller-authenticated callers.
4. WHEN a seller's order is part of a master order, THE Order_Service SHALL NOT include the `masterOrderId` or any cross-seller order IDs in the seller-facing order response.
5. THE Order_Service SHALL NOT include the total amounts, item counts, or identities of other sellers' orders in any seller-facing API response, even if those seller orders belong to the same master order.

---

### Requirement 7: Payment — Single Buyer Payment for All Seller Orders

**User Story:** As a buyer, I want to pay once for all items in my cart, so that I do not have to initiate separate payments per seller.

#### Acceptance Criteria

1. WHEN a buyer confirms checkout, THE Checkout_Service SHALL collect a single payment authorisation covering the sum of all seller order totals (the master order `totalAmount`).
2. THE Checkout_Service SHALL associate the single payment record with the `Order_MasterOrder` rather than duplicating it across each seller order.
3. WHERE the payment method is COD, THE Checkout_Service SHALL create a single COD commitment for the master order's `totalAmount` and SHALL NOT create separate COD commitments per seller order.
4. WHERE the payment method is WALLET, THE Order_Service SHALL reserve (hold) the master order `totalAmount` from the buyer's wallet in a single operation at checkout confirmation time.
5. THE Order_Service SHALL distribute payment settlement to each seller independently upon delivery confirmation of that seller's order, based on the seller order's own `totalAmount`.
6. WHEN the buyer's wallet balance is insufficient to cover the master order `totalAmount`, THE Checkout_Service SHALL return error code `INSUFFICIENT_WALLET_BALANCE` and SHALL NOT place any seller orders.
7. THE Order_Service SHALL record one `Order_Payment` record linked to the `Order_MasterOrder.id` rather than to individual seller order IDs.

---

### Requirement 8: Partial Failure Handling at Checkout

**User Story:** As a buyer, I want a clear error response when checkout fails, so that I know which part of my order failed and can take corrective action.

#### Acceptance Criteria

1. IF any `PlaceOrderUseCase` invocation within the atomic checkout transaction throws an error, THEN THE Checkout_Service SHALL roll back the entire transaction, ensuring no partial seller orders are persisted.
2. IF the transaction rollback fails after a partial failure, THEN THE Checkout_Service SHALL log the inconsistency with severity ERROR including the `sessionId`, the `sellerId` of the failed group, and the IDs of any orders that were already written, and SHALL return HTTP 500 with error code `CHECKOUT_ROLLBACK_FAILURE`.
3. WHEN a checkout fails due to stock unavailability for one seller group, THE Checkout_Service SHALL return HTTP 422 with error code `STOCK_UNAVAILABLE` and SHALL identify the `sellerId` and `productId` of each out-of-stock item in the error payload.
4. IF a Per-Seller Quote expires between the quote-validation step and the order-creation step, THEN THE Checkout_Service SHALL treat this as a quote expiry failure and return error code `QUOTE_EXPIRED_DURING_CHECKOUT` without placing any orders.
5. THE Checkout_Service SHALL NOT implement partial-success checkout: either all seller orders in a session are placed successfully or none are placed.

---

### Requirement 9: Historical Order Backward Compatibility

**User Story:** As a buyer, I want to view my orders placed before the multi-seller feature was introduced, so that my purchase history remains complete.

#### Acceptance Criteria

1. THE Order_Service SHALL serve legacy `Order_Order` records (those with no associated `Order_MasterOrder`) through the existing `GET /api/orders/:orderId` endpoint without modification.
2. WHEN a buyer calls `GET /api/orders/master` and legacy orders exist that are not linked to any `Order_MasterOrder`, THE Order_Service SHALL represent each such order as a Virtual Master Order in the response with the following mapping: `masterOrderId = "VIRTUAL-" + sellerOrderId`, `status` = derived from the single child order, `sellerOrders = [the single Order_Order]`.
3. WHEN a buyer calls `GET /api/orders/master/VIRTUAL-{sellerOrderId}`, THE Order_Service SHALL resolve the request to the corresponding single `Order_Order` and return it wrapped in the Virtual Master Order structure.
4. THE Order_Service SHALL clearly mark Virtual Master Orders in API responses with the field `isVirtual: true` so that consumers can distinguish them from real master orders.
5. THE Order_Service SHALL NOT write any new database records when constructing Virtual Master Orders; the mapping SHALL be computed at read time only.

---

### Requirement 10: Analytics — Transaction and Sales Event Attribution

**User Story:** As a data analyst, I want master orders counted as single buyer transactions and seller orders counted per seller, so that marketplace analytics are accurate.

#### Acceptance Criteria

1. WHEN an `Order_MasterOrder` is created, THE Checkout_Service SHALL emit a `master_order.created` analytics event containing: `masterOrderId`, `buyerId`, `sellerCount`, `totalAmount`, `currency`, `paymentMethod`, `createdAt`.
2. WHEN an `Order_Order` (seller order) is created as part of a master order checkout, THE Order_Service SHALL emit a `seller_order.created` analytics event containing: `sellerOrderId`, `sellerId`, `masterOrderId`, `buyerId`, `itemCount`, `totalAmount`, `currency`.
3. THE Analytics_Service SHALL count each `master_order.created` event as exactly one buyer transaction, regardless of how many seller orders it contains.
4. THE Analytics_Service SHALL count each `seller_order.created` event as exactly one seller sale, attributed to the `sellerId` in the event.
5. WHEN computing the average order value (AOV) for buyer analytics, THE Analytics_Service SHALL use the `totalAmount` from `master_order.created` events rather than summing individual seller order amounts.
6. THE Analytics_Service SHALL NOT double-count a purchase: a checkout that produces one master order and three seller orders SHALL result in one buyer transaction count and three seller sale counts.

---

### Requirement 11: Security — Cross-Seller Order Data Isolation

**User Story:** As a platform operator, I want to ensure sellers cannot access each other's order data, so that confidential pricing and sales information remains protected.

#### Acceptance Criteria

1. WHEN any order API endpoint receives a request authenticated as Seller A, THE Order_Service SHALL enforce that only `Order_Order` records where `sellerId = Seller A's identity` are returned or modified.
2. THE Order_Service SHALL validate seller identity from the authenticated JWT claim and SHALL NOT accept a `sellerId` parameter in the request body or query string as proof of identity.
3. WHEN an `Order_Order` that belongs to Seller B is looked up using Seller A's authenticated session, THE Order_Service SHALL return HTTP 403 with error code `FORBIDDEN` and SHALL NOT leak any field of Seller B's order in the error response body.
4. THE Order_Service SHALL log every forbidden cross-seller access attempt with severity WARN, including the requesting `sellerId`, the requested `orderId`, and the timestamp.
5. THE Order_Service SHALL NOT expose the existence or count of sibling seller orders within the same master order to any seller-authenticated API caller.
6. WHEN the Order_Service applies database queries for seller-scoped endpoints, THE Order_Service SHALL include `WHERE sellerId = :authenticatedSellerId` as a mandatory, non-overridable filter on every `Order_Order` query.
