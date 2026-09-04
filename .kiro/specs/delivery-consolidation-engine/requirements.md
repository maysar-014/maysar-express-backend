# Requirements Document

## Introduction

Maysar's multi-seller checkout (see `multi-seller-order-support` spec) creates one `Order_Order` per seller in a single `Order_MasterOrder`. The existing `DeliveryPricingEngine` then issues one `Logistics_Quote` per seller order — one pickup location, one destination, one fee. When two or more of those seller pickup locations are geographically close, the platform is charging buyers separately for what could be a single courier operation, and the price signal is misleading.

The Delivery Consolidation Engine solves this. Before any quote is issued, it examines the full set of seller pickup locations for a master order and decides — using Haversine proximity, route-overhead efficiency, package-weight capacity, and time-window compatibility — which sellers can share one physical courier run. Sellers that pass all consolidation rules are placed in a **Delivery Group**. Each Delivery Group is priced as one logistics operation via the existing `DeliveryPricingEngine` (multi-pickup route: seller₁ → seller₂ → … → buyer). That single group cost is then allocated across the participating seller orders proportional to declared package weight. The buyer sees one delivery fee per group instead of one fee per seller.

Sellers that do not qualify share a group with no other sellers — a group of one — and are priced exactly as they are today. No existing behaviour changes unless sellers are geographically eligible for consolidation.

---

## Glossary

- **Consolidation_Engine**: The new domain engine in `logistics-service` that determines which seller orders can share a courier operation.
- **Delivery_Group**: A domain entity representing one physical courier operation. Contains one or more seller pickup points and one buyer destination. Priced as a single logistics operation.
- **DeliveryGroupId**: A platform-generated unique identifier for a `Delivery_Group`, prefixed `DCG-`.
- **Pickup_Sequence**: The ordered list of seller pickup points within a `Delivery_Group`, sorted by route efficiency (nearest-neighbour order starting from the first seller).
- **Multi_Pickup_Route**: A route computed as seller₁ → seller₂ → … → sellerN → buyer, used when a group contains more than one seller. Computed by `MapsRoutingBridge` with waypoints.
- **Consolidation_Candidate**: A seller order that passes all consolidation eligibility rules and may be merged into a shared `Delivery_Group`.
- **Consolidation_Radius**: The maximum Haversine distance (in km) between any two seller pickup points that allows them to be considered candidates for the same group. Configurable via `PricingConfig`. Default: 5 km.
- **Route_Overhead_Threshold**: The maximum ratio by which the consolidated multi-pickup route may exceed the longest individual seller-to-buyer route before consolidation is rejected. Configurable via `PricingConfig`. Default: 1.40 (40% overhead).
- **Max_Group_Weight**: The maximum combined declared package weight (kg) permitted in a single `Delivery_Group`, representing the courier vehicle capacity. Configurable via `PricingConfig`. Default: 20 kg for motorcycle.
- **Allocation_Algorithm**: The strategy used to divide a `Delivery_Group`'s total cost across its member seller orders. The only supported algorithm in this version is `weight_proportional`. Configurable via `PricingConfig`.
- **Consolidation_Savings**: The positive difference between (sum of individual per-seller quotes) and (sum of delivery group costs) for a master order where at least one group contains more than one seller.
- **PricingConfig**: The existing versioned configuration entity, extended with the four new consolidation parameters: `consolidationRadiusKm`, `maxConsolidatedRouteOverheadPct`, `maxGroupWeightKg`, `allocationAlgorithm`.
- **DeliveryPricingEngine**: The existing engine that computes cost for one origin → waypoints… → one destination. Extended to accept a `Pickup_Sequence` of N pickup points.
- **MapsRoutingBridge**: The existing routing infrastructure component. Extended to support multi-waypoint routes.
- **ZoneClassifier**: The existing zone classifier. For multi-pickup routes, the zone is derived from the first pickup point to the buyer destination.
- **Logistics_Quote**: The existing quote entity. After this feature, one `Logistics_Quote` is issued per `Delivery_Group`, not per seller order.
- **GeoPoint**: A latitude/longitude coordinate pair.
- **Haversine_Distance**: The great-circle distance between two `GeoPoint` values computed using the Haversine formula. Used for proximity checks only — routing uses road distance.
- **Time_Window**: The interval `[earliest_seller_confirm, latest_seller_confirm]` for a group; all sellers in a group must have overlapping expected confirmation windows at the time of consolidation.
- **Consolidation_Audit_Record**: A persisted record of each consolidation decision, including which sellers were grouped, which rules each passed or failed, and the resulting savings.
- **Buyer**: An authenticated user who placed the master order.
- **Seller**: An independent merchant with a single pickup address per order.
- **Order_MasterOrder**: The existing master-order grouping record (from `multi-seller-order-support` spec).
- **Order_Order**: The existing single-seller order record.

---

## Requirements

### Requirement 1: Delivery Group Domain Entity

**User Story:** As a platform architect, I want a `Delivery_Group` entity that represents one physical courier operation, so that consolidation decisions have a durable, auditable domain object.

#### Acceptance Criteria

1. THE `Consolidation_Engine` SHALL create a `Delivery_Group` entity with the following fields: `deliveryGroupId` (`DCG-` prefix), `masterOrderId`, `sellerOrderIds` (non-empty ordered array), `pickupSequence` (ordered `GeoPoint[]` corresponding to each seller in `sellerOrderIds`), `buyerDestination` (`GeoPoint`), `totalDeliveryCost` (TZS integer after rounding), `pricingVersion`, `allocationAlgorithm`, `status`, `createdAt`, and `updatedAt`.
2. THE `Delivery_Group` SHALL carry a `status` field that transitions through: `PENDING_PRICING` → `PRICED` → `QUOTE_ISSUED` → `CONSUMED` → `CANCELLED`. No other transitions SHALL be permitted.
3. WHEN a `Delivery_Group` contains exactly one seller order, THE `Consolidation_Engine` SHALL still create a `Delivery_Group` entity for it, ensuring every master order is entirely covered by `Delivery_Group` records with no seller order left unassigned.
4. THE `Delivery_Group` entity SHALL be immutable once its `status` reaches `QUOTE_ISSUED` — no modifications to `sellerOrderIds`, `pickupSequence`, `totalDeliveryCost`, or `allocationAlgorithm` SHALL be permitted after that point.
5. FOR ALL valid `Delivery_Group` objects, `sellerOrderIds.length === pickupSequence.length` SHALL always hold (structural invariant).
6. FOR ALL valid `Delivery_Group` objects, `totalDeliveryCost >= 0` SHALL always hold (cost invariant).
7. THE `Consolidation_Engine` SHALL ensure that every `sellerOrderId` in a `masterOrderId` appears in exactly one `Delivery_Group` for that master order — no seller order may appear in two groups, and no seller order may be omitted (partition invariant).

---

### Requirement 2: Consolidation Decision Engine — Pure Function

**User Story:** As a platform engineer, I want the consolidation algorithm to be a pure, deterministic function, so that it can be unit-tested exhaustively without infrastructure dependencies.

#### Acceptance Criteria

1. THE `Consolidation_Engine` SHALL expose a pure function `consolidate(sellers: SellerPickupInput[], buyer: GeoPoint, config: ConsolidationConfig): DeliveryGroupPlan[]` that accepts seller pickup locations, the buyer destination, and the active configuration, and returns the complete grouping plan.
2. WHEN called with identical inputs, THE `Consolidation_Engine` `consolidate` function SHALL return identical output (determinism property).
3. THE `Consolidation_Engine` SHALL group sellers using a greedy proximity-first algorithm: for each unassigned seller (in order of descending proximity to the buyer), attempt to assign it to an existing candidate group; if no group accepts it, start a new group for it.
4. THE `Consolidation_Engine` SHALL NOT call any external service (routing, database, mapping) during the pure `consolidate` step — all required distances and durations SHALL be pre-computed and passed in as part of `SellerPickupInput`.
5. FOR ALL inputs where N sellers are provided, the output `DeliveryGroupPlan[]` SHALL partition all N sellers exactly — `sum(group.sellerIds.length) === N` (partition completeness property).
6. FOR ALL inputs where N = 1 (single seller), THE `Consolidation_Engine` SHALL return exactly one `DeliveryGroupPlan` containing that one seller.
7. WHEN two or more sellers are within `consolidationRadiusKm` of each other, pass the route overhead check, and their combined weight does not exceed `maxGroupWeightKg`, THE `Consolidation_Engine` SHALL place them in the same `DeliveryGroupPlan` rather than separate plans.

---

### Requirement 3: Consolidation Eligibility Rules

**User Story:** As a logistics manager, I want clear, configurable rules for when sellers can be consolidated, so that the engine never groups sellers in a way that would produce a worse delivery experience for the buyer.

#### Acceptance Criteria

1. **Geographic proximity rule**: WHEN the Haversine distance between any two seller pickup points exceeds `consolidationRadiusKm`, THE `Consolidation_Engine` SHALL NOT place those sellers in the same `Delivery_Group`.
2. **Route efficiency rule**: WHEN the road distance of the consolidated multi-pickup route (seller₁ → seller₂ → … → buyer) exceeds `maxConsolidatedRouteOverheadPct` times the longest individual seller-to-buyer road distance in the candidate group, THE `Consolidation_Engine` SHALL NOT finalize that group and SHALL split the offending seller into a separate group.
3. **Weight capacity rule**: WHEN the sum of declared package weights of all sellers in a candidate group exceeds `maxGroupWeightKg`, THE `Consolidation_Engine` SHALL NOT add further sellers to that group. IF adding a seller would breach the weight limit, THEN THE `Consolidation_Engine` SHALL start a new group for that seller.
4. **Time window compatibility rule**: WHEN any seller in a candidate group has an expected confirmation window that does not overlap with the group's current time window, THE `Consolidation_Engine` SHALL NOT include that seller in that group.
5. WHEN a seller fails all candidate groups due to any eligibility rule, THE `Consolidation_Engine` SHALL assign that seller to a new singleton group (a group of one), ensuring the partition invariant is preserved.
6. THE `Consolidation_Engine` SHALL evaluate all four eligibility rules in the order: proximity → weight → route efficiency → time window. A seller that fails proximity SHALL NOT be evaluated against the other rules for that group.
7. FOR ALL `DeliveryGroupPlan` outputs, every seller pair within the same group SHALL satisfy: `haversineDistance(sellerA.pickupPoint, sellerB.pickupPoint) <= consolidationRadiusKm` (proximity invariant).
8. FOR ALL `DeliveryGroupPlan` outputs, `sum(sellerWeightKg for sellers in group) <= maxGroupWeightKg` (weight capacity invariant).

---

### Requirement 4: Multi-Pickup Route Pricing

**User Story:** As a platform operator, I want consolidated delivery groups priced as a single logistics operation along the full multi-pickup route, so that the fee reflects the actual courier effort rather than a naive sum of individual quotes.

#### Acceptance Criteria

1. WHEN a `Delivery_Group` contains exactly one seller, THE `DeliveryPricingEngine` SHALL price it using the existing single-origin route: `seller → buyer` (no change from current behaviour).
2. WHEN a `Delivery_Group` contains two or more sellers, THE `DeliveryPricingEngine` SHALL price it using the full multi-pickup route: `pickupSequence[0] → pickupSequence[1] → … → buyer`, where total distance and duration reflect the full waypoint route computed by `MapsRoutingBridge`.
3. THE `DeliveryPricingEngine` SHALL accept a `routeInput` with an ordered `pickupPoints: GeoPoint[]` (replacing the single `origin: GeoPoint`) and a `destination: GeoPoint`, so that the engine is agnostic to whether the route has one or multiple pickup points.
4. THE `DeliveryZone` for a multi-pickup group SHALL be determined by classifying the route from `pickupSequence[0]` (first seller in sequence) to the buyer `destination`, using the existing `ZoneClassifier`.
5. WHEN computing the `PackageFactor` for a multi-pickup group, THE `DeliveryPricingEngine` SHALL use the total combined weight of all packages in the group.
6. THE `DeliveryPricingEngine` SHALL NOT sum individual per-seller quotes to derive the group price — it SHALL compute a single fresh pricing pipeline run for the full multi-pickup route.
7. FOR ALL multi-pickup routes, the computed `totalDeliveryCost` SHALL be strictly less than or equal to the sum of individual per-seller quote amounts that would have been issued without consolidation (consolidation cost invariant — the group price must not exceed what buyers would have paid separately).
8. FOR ALL identical multi-pickup route inputs and `PricingConfig` versions, THE `DeliveryPricingEngine` SHALL return the same `totalDeliveryCost` (determinism property).

---

### Requirement 5: Cost Allocation to Seller Orders

**User Story:** As a platform finance manager, I want each seller order in a delivery group to carry a fair share of the group's total delivery cost, so that settlement and analytics correctly attribute delivery costs to the right seller.

#### Acceptance Criteria

1. WHEN the `allocationAlgorithm` is `weight_proportional`, THE `Consolidation_Engine` SHALL allocate each seller order's share as: `sellerShare = round(totalDeliveryCost × (sellerWeightKg / groupTotalWeightKg))`.
2. WHEN rounding causes the sum of individual seller shares to differ from `totalDeliveryCost`, THE `Consolidation_Engine` SHALL apply the rounding remainder to the seller order with the largest weight (largest-remainder adjustment), ensuring `sum(sellerShares) === totalDeliveryCost` exactly (allocation sum invariant).
3. THE allocated delivery cost per seller SHALL be persisted on each `Order_Order` as `allocatedDeliveryCost` (TZS integer), replacing any previously computed individual quote amount.
4. WHEN a `Delivery_Group` contains exactly one seller, THE `Consolidation_Engine` SHALL allocate 100% of `totalDeliveryCost` to that single seller order.
5. FOR ALL `Delivery_Group` entities, `sum(Order_Order.allocatedDeliveryCost for orders in group) === Delivery_Group.totalDeliveryCost` SHALL always hold (sum invariant).
6. FOR ALL seller orders in a group with `weight_proportional` allocation, each seller's allocated share SHALL be non-negative and shall not exceed `totalDeliveryCost` (bounds invariant).
7. THE allocated delivery cost SHALL be used for settlement and audit purposes — the buyer-facing fee per group is `totalDeliveryCost`, not the sum of allocations.

---

### Requirement 6: Quote Lifecycle — One Quote per Delivery Group

**User Story:** As a logistics manager, I want exactly one `Logistics_Quote` per delivery group, so that quote management, expiry, and audit trails are aligned with the actual courier operation rather than individual seller orders.

#### Acceptance Criteria

1. THE `Consolidation_Engine` SHALL issue exactly one `Logistics_Quote` per `Delivery_Group`, regardless of how many seller orders the group contains.
2. THE `Logistics_Quote` for a multi-seller group SHALL reference the `deliveryGroupId` and SHALL include the `sellerOrderIds[]` of all member orders.
3. THE existing `Logistics_Quote` entity SHALL be extended with the optional fields `deliveryGroupId` (nullable for backward compatibility with solo quotes) and `sellerOrderIds` (array, defaults to the single seller order ID for solo quotes).
4. WHEN a `Delivery_Group` quote is marked `CONSUMED`, THE `Consolidation_Engine` SHALL update the status of all member seller orders' quote references atomically — no member order SHALL remain in a state referencing an `ACTIVE` quote after the group quote is consumed.
5. WHEN a `Delivery_Group` quote expires (`EXPIRED`), THE `Checkout_Service` SHALL reject checkout for the entire master order, returning error code `DELIVERY_GROUP_QUOTE_EXPIRED` with the `deliveryGroupId`.
6. IF a group quote expires between quote-validation and order-creation at checkout, THEN THE `Checkout_Service` SHALL treat this as `QUOTE_EXPIRED_DURING_CHECKOUT` for the full master order and SHALL NOT place any seller orders (consistent with the existing partial-failure rule from `multi-seller-order-support` Requirement 8).
7. FOR ALL `Delivery_Group` entities in state `QUOTE_ISSUED`, there SHALL be exactly one corresponding `Logistics_Quote` in state `ACTIVE` or `CONSUMED` (one-to-one invariant).

---

### Requirement 7: Checkout Integration — Consolidation Before Quote Generation

**User Story:** As a platform engineer, I want delivery consolidation to run during checkout session setup, before any quotes are generated, so that buyers always see the consolidated (group) fees rather than individual per-seller fees.

#### Acceptance Criteria

1. WHEN the `Checkout_Service` receives a request to compute delivery options for a multi-seller session, THE `Checkout_Service` SHALL invoke the `Consolidation_Engine` before calling the `DeliveryPricingEngine` for any seller order.
2. THE `Checkout_Service` SHALL pass the complete set of seller pickup `GeoPoint` values and the buyer `destination` `GeoPoint` to the `Consolidation_Engine` in a single batch call — one call per master order checkout session, not one call per seller.
3. WHEN the `Consolidation_Engine` returns a `DeliveryGroupPlan[]`, THE `Checkout_Service` SHALL request one `Logistics_Quote` per group (calling `RequestDeliveryQuoteUseCase` with the group's `pickupSequence` and combined weight) and SHALL NOT request individual per-seller quotes for sellers that have been consolidated.
4. WHEN the `Consolidation_Engine` returns a singleton group (group of one seller), THE `Checkout_Service` SHALL request the quote for that group exactly as the current single-seller quote flow works, with no visible difference to the seller.
5. THE `Checkout_Service` SHALL store the mapping `{ deliveryGroupId → quoteId }` on the `Checkout_CheckoutSession` in addition to the existing `{ sellerId → quoteId }` mapping, so that checkout confirmation can validate at the group level.
6. WHEN a buyer initiates a new quote refresh (e.g., changes delivery address), THE `Checkout_Service` SHALL re-run the full consolidation step to ensure groups are re-evaluated with the new destination.
7. IF the `Consolidation_Engine` call fails with an unrecoverable error, THEN THE `Checkout_Service` SHALL fall back to issuing individual per-seller quotes (no consolidation) and SHALL log the failure with severity ERROR including the `masterOrderId`.

---

### Requirement 8: Buyer Delivery Fee Display

**User Story:** As a buyer, I want to see one delivery fee per delivery group rather than one fee per seller, so that I am not confused by multiple delivery line items for sellers that are being picked up together.

#### Acceptance Criteria

1. THE `Checkout_Service` response for delivery options SHALL present delivery fees grouped by `Delivery_Group`, not by individual seller order.
2. WHEN a `Delivery_Group` contains N > 1 sellers, THE `Checkout_Service` SHALL display the group's `totalDeliveryCost` as a single line item labelled with the number of sellers included (e.g., "2-seller pickup: TZS 3,500").
3. WHEN a `Delivery_Group` contains exactly one seller, THE `Checkout_Service` SHALL display the group cost identically to the current single-seller delivery fee display — no visual difference for the buyer.
4. THE total delivery fee shown to the buyer for a master order SHALL equal `sum(Delivery_Group.totalDeliveryCost for all groups in the master order)`.
5. THE `Checkout_Service` SHALL NOT expose individual seller allocation amounts (`allocatedDeliveryCost`) in any buyer-facing API response — only the group total is buyer-visible.
6. WHEN the buyer confirms checkout, the `Order_MasterOrder.totalAmount` SHALL include the sum of all delivery group costs, not a sum of per-seller delivery fees.

---

### Requirement 9: Analytics — Consolidation Savings Tracking

**User Story:** As a data analyst, I want to track how much buyers save due to delivery consolidation, so that the platform can quantify the value of the engine and tune its parameters.

#### Acceptance Criteria

1. WHEN a master order checkout results in at least one multi-seller `Delivery_Group`, THE `Consolidation_Engine` SHALL compute `consolidationSavings` as: `sum(individual_quote_amounts_without_consolidation) − sum(delivery_group_costs)`.
2. THE `Checkout_Service` SHALL emit a `delivery.consolidated` analytics event whenever any `Delivery_Group` with two or more sellers is created, containing: `masterOrderId`, `deliveryGroupId`, `sellerCount`, `totalDeliveryCost`, `estimatedSavings`, `pricingVersion`, `createdAt`.
3. WHEN a master order results in only singleton groups (no consolidation), THE `Checkout_Service` SHALL NOT emit a `delivery.consolidated` event.
4. THE `Consolidation_Audit_Record` SHALL be persisted for every master order consolidation run, containing: `masterOrderId`, `deliveryGroupIds[]`, `consolidationRulesApplied` (proximity, weight, route-efficiency, time-window), `perGroupSellerCount`, `totalSavingsTzs`, `pricingVersion`, `consolidatedAt`.
5. THE `Consolidation_Audit_Record` SHALL be immutable once written — no updates SHALL be permitted after creation.
6. WHEN consolidation is skipped due to a fallback (Requirement 7.7), THE `Consolidation_Audit_Record` SHALL record `fallbackReason` and set `totalSavingsTzs = 0`.
7. FOR ALL `Consolidation_Audit_Record` entries, `totalSavingsTzs >= 0` SHALL always hold (savings are never negative — consolidation must never cost more than individual quotes).

---

### Requirement 10: Security — Seller Isolation in Delivery Groups

**User Story:** As a platform operator, I want sellers to be completely unaware of other sellers in their delivery group, so that confidential pricing, order volumes, and business locations are not exposed across competing sellers.

#### Acceptance Criteria

1. THE `Order_Service` SHALL NOT include any `deliveryGroupId`, co-seller identity, co-seller pickup address, or co-seller order ID in any seller-facing API response.
2. THE `Logistics_Service` SHALL NOT expose any endpoint that allows a seller to query which other sellers share their `Delivery_Group`.
3. WHEN a seller queries their `Order_Order`, THE `Order_Service` SHALL return only that seller's `allocatedDeliveryCost` — not the `Delivery_Group.totalDeliveryCost` or any other seller's share.
4. THE `Consolidation_Engine` SHALL treat seller pickup addresses as confidential data — they SHALL NOT be included in any event payload, log line, or API response that could be accessed by a seller-authenticated caller.
5. THE `Logistics_Service` SHALL validate on every group-quote endpoint that the requesting identity is either the platform (internal service account) or the buyer, and SHALL return HTTP 403 for any seller-authenticated request that attempts to access a `Delivery_Group` or group-level `Logistics_Quote`.
6. THE `Consolidation_Engine` SHALL assign sellers to groups based solely on geographic and logistic criteria — it SHALL NOT accept any seller-supplied preference, flag, or override that influences group membership.
7. WHEN a seller is assigned to a group, THE `Order_Service` SHALL log the event internally at severity INFO with fields `deliveryGroupId`, `sellerOrderId`, and `masterOrderId`, using masked addresses (ward-level resolution only, no street-level coordinates).

---

### Requirement 11: Configuration — Consolidation Parameters in PricingConfig

**User Story:** As a platform operator, I want all consolidation thresholds to live in the existing `PricingConfig`, so that I can tune consolidation behaviour without code deployments and every consolidation decision is tied to a specific versioned configuration.

#### Acceptance Criteria

1. THE `PricingConfig` entity SHALL be extended with four new fields: `consolidationRadiusKm` (positive decimal, default 5.0), `maxConsolidatedRouteOverheadPct` (positive decimal, default 1.40 representing 40%), `maxGroupWeightKg` (positive decimal, default 20.0), and `allocationAlgorithm` (enum: `weight_proportional`; default `weight_proportional`).
2. THE `Consolidation_Engine` SHALL read all four consolidation parameters exclusively from the active `PricingConfig` version — no consolidation parameter SHALL be hard-coded in the engine implementation.
3. WHEN any consolidation parameter is updated in `PricingConfig`, THE system SHALL assign a new `PricingVersion` to the updated config, and all subsequent consolidation runs SHALL use the new version.
4. THE `Delivery_Group` entity SHALL persist the `pricingVersion` of the `PricingConfig` used to form the group, enabling full audit traceability.
5. IF `consolidationRadiusKm` is set to 0, THEN THE `Consolidation_Engine` SHALL treat all sellers as ineligible for consolidation and SHALL produce only singleton groups (effectively disabling consolidation).
6. IF `maxGroupWeightKg` is set to 0 or negative, THEN THE `Consolidation_Engine` SHALL reject the configuration and return a descriptive validation error.
7. FOR ALL valid `PricingConfig` objects with the four new fields, serializing then deserializing then serializing SHALL produce an equivalent object (round-trip property — extends existing Requirement 1.8 of the delivery-pricing-engine spec).
8. WHERE `allocationAlgorithm` is `weight_proportional`, THE `Consolidation_Engine` SHALL compute allocations as described in Requirement 5 — no other algorithm need be supported in this version.

---

### Requirement 12: Pickup Sequence Optimisation

**User Story:** As a logistics manager, I want the pickup order within a delivery group to minimise total route distance, so that consolidated routes are genuinely efficient and not just technically valid.

#### Acceptance Criteria

1. WHEN a `Delivery_Group` contains two or more sellers, THE `Consolidation_Engine` SHALL determine `pickupSequence` using a nearest-neighbour heuristic starting from the seller closest to the buyer destination.
2. THE `Consolidation_Engine` SHALL compute the `pickupSequence` using pre-computed Haversine distances between sellers and buyer (not road distances) to avoid additional routing calls during the sequencing step.
3. FOR ALL `Delivery_Group` entities with N ≥ 2 sellers, the computed `pickupSequence` SHALL produce a total Haversine path length (sum of consecutive point distances including final leg to buyer) that is less than or equal to the path length of the reverse sequence, ensuring the heuristic does not produce obviously sub-optimal routes (ordering improvement property).
4. THE `MapsRoutingBridge` multi-waypoint call used for pricing SHALL use the `pickupSequence` order determined in step 1 — the pricing route and the displayed route SHALL match exactly.
5. WHEN a group contains exactly one seller, THE `pickupSequence` SHALL contain exactly that one seller's `GeoPoint` and no ordering optimisation is needed.
