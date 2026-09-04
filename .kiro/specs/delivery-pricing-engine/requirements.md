# Requirements Document

## Introduction

The Maysar marketplace currently has a critical security gap: the checkout service accepts a client-supplied `shippingCost` value with no server-side validation, allowing buyers to manipulate delivery fees (including setting them to zero). Additionally, there is no dynamic delivery pricing — the `EarningsCalculationEngine` computes **courier compensation** only, and no customer-facing quote endpoint exists anywhere in the system.

This feature introduces a professional **Dynamic Delivery Pricing & Shipping Quote Engine** for the Maysar platform. It adds a domain-layer `DeliveryPricingEngine` in the logistics service, a `POST /api/logistics/v1/quote` endpoint, server-side price enforcement at checkout, a full configurable pricing pipeline, structured audit trails, and quote lifecycle management (expiry, versioning). Zero delivery fee explicitly means **free delivery** — not an error or an unavailable zone.

## Glossary

- **DeliveryPricingEngine**: The domain engine in the logistics service responsible for calculating the customer-facing delivery fee.
- **EarningsCalculationEngine**: The existing engine that calculates **courier compensation** — distinct from and independent of customer delivery pricing.
- **Quote**: A time-bound, versioned delivery fee estimate returned to the buyer before order placement, identified by a `quoteId`.
- **QuoteId**: A unique identifier for a pricing quote, valid for a configurable period (default: 15 minutes).
- **PricingVersion**: An integer that identifies the active pricing configuration snapshot used to compute a quote, enabling full auditability.
- **DeliveryFee**: The amount charged to the buyer for delivery (customer-facing price).
- **CourierCompensation**: The amount paid to the courier for completing a delivery (internal cost, output of `EarningsCalculationEngine`).
- **PlatformMargin**: The configurable percentage or absolute markup applied on top of `CourierCompensation` to arrive at `DeliveryFee`.
- **PricingConfig**: The centrally-managed, version-controlled set of all pricing parameters (rates, margin, floors, ceilings, rounding increment, zone multipliers).
- **DeliveryZone**: A geographic classification (e.g., same-ward, same-district, same-region, cross-region) derived from the origin and destination coordinates.
- **PackageFactor**: A pricing adjustment based on declared package weight and dimensions.
- **OperationalSurcharge**: An optional additional charge that accounts for time-of-day, peak demand, or other operational conditions.
- **RiskSurcharge**: An optional additional charge applied for high-risk delivery scenarios (e.g., COD orders).
- **FloorPrice**: The minimum `DeliveryFee` that may be charged for any supported delivery.
- **CeilingPrice**: The maximum `DeliveryFee` that may be charged for any supported delivery.
- **RoundingIncrement**: The configurable unit (e.g., 50 TZS) to which the final fee is rounded for professional presentation.
- **DELIVERY_UNAVAILABLE**: An explicit signal returned when a delivery cannot be serviced in the requested zone — distinct from a zero-fee (free delivery) response.
- **PricingBreakdown**: The structured decomposition of a delivery fee showing each component (base, distance, time, package, zone, operational, risk, margin, adjustments, final).
- **AuditRecord**: A persisted record linking a quote to the courier cost estimate, buyer-facing fee, platform margin, and `PricingVersion`.
- **CheckoutValidation**: The server-side step in the checkout or order service that re-computes and validates the delivery fee against the submitted `quoteId` before accepting an order.
- **Seller**: A marketplace participant with a single `sellerId` per order (confirmed by the current `Order_Order` schema).
- **GeoPoint**: A latitude/longitude coordinate pair used as the basis for distance and zone calculations.

---

## Requirements

### Requirement 1: Delivery Pricing Configuration

**User Story:** As a platform operator, I want all delivery pricing parameters to be centrally configurable and versioned, so that I can adjust pricing without code deployments and maintain a full history for audits.

#### Acceptance Criteria

1. THE `PricingConfig` SHALL contain at minimum: base fee, distance rate (TZS/km), time rate (TZS/minute), package weight rate, zone multipliers for each `DeliveryZone`, operational surcharge schedule, risk surcharge rate, platform margin percentage, floor price, ceiling price, and rounding increment.
2. THE `PricingConfig` SHALL be stored in a persistent store and loadable at runtime without service restart.
3. WHEN a `PricingConfig` is updated, THE system SHALL assign a new monotonically increasing `PricingVersion` to the updated configuration.
4. THE `DeliveryPricingEngine` SHALL always record the `PricingVersion` used when computing any quote or fee.
5. THE `PricingConfig` SHALL NOT hard-code any pricing value — all parameters SHALL be readable from configuration.
6. WHERE platform margin is configured as a percentage, THE `DeliveryPricingEngine` SHALL apply the percentage to the computed pre-margin fee to derive the margin amount.
7. IF a requested `PricingConfig` version does not exist, THEN THE system SHALL return a descriptive error.
8. FOR ALL valid `PricingConfig` objects, serializing then deserializing then serializing SHALL produce an equivalent object (round-trip property).

---

### Requirement 2: Delivery Pricing Pipeline

**User Story:** As a platform operator, I want delivery fees calculated through a structured, deterministic pipeline, so that pricing is consistent, auditable, and covers all cost dimensions.

#### Acceptance Criteria

1. WHEN a delivery fee is computed, THE `DeliveryPricingEngine` SHALL apply components in this exact order: base cost → distance cost → time cost → package factor → zone multiplier → operational surcharge → risk surcharge → platform margin → floor/ceiling clamp → rounding → final fee.
2. THE `DeliveryPricingEngine` SHALL compute distance cost as: `distance_km × distance_rate_TZS_per_km`.
3. THE `DeliveryPricingEngine` SHALL compute time cost as: `estimated_duration_minutes × time_rate_TZS_per_minute`.
4. THE `DeliveryPricingEngine` SHALL compute package factor as a configurable multiplier applied to the subtotal of (base + distance + time) costs based on declared package weight tiers.
5. THE `DeliveryPricingEngine` SHALL apply the zone multiplier for the resolved `DeliveryZone` of the origin–destination pair.
6. WHEN a floor price is configured and the computed fee is below the floor, THE `DeliveryPricingEngine` SHALL set the fee to the floor price.
7. WHEN a ceiling price is configured and the computed fee is above the ceiling, THE `DeliveryPricingEngine` SHALL set the fee to the ceiling price.
8. THE `DeliveryPricingEngine` SHALL round the final fee up to the nearest `RoundingIncrement`.
9. FOR ALL valid delivery inputs with identical parameters, THE `DeliveryPricingEngine` SHALL return the same final fee (deterministic/idempotent property).
10. FOR ALL valid delivery inputs, the final fee computed after applying floor and ceiling SHALL satisfy: `finalFee >= floorPrice AND finalFee <= ceilingPrice` (invariant).
11. FOR ALL valid delivery inputs, applying the pricing pipeline twice SHALL produce the same result as applying it once (idempotence property).

---

### Requirement 3: Zone Classification and DELIVERY_UNAVAILABLE

**User Story:** As a buyer, I want the system to clearly tell me whether delivery is available at my location and what it costs, so that I am never surprised by hidden charges or silently incorrect zero-fee orders.

#### Acceptance Criteria

1. THE `DeliveryPricingEngine` SHALL classify every origin–destination pair into exactly one `DeliveryZone` (same-ward, same-district, same-region, or cross-region) using the existing `TanzaniaLocationIndex`.
2. WHEN the destination location cannot be resolved to any known zone and the origin cannot be resolved, THE `DeliveryPricingEngine` SHALL return `DELIVERY_UNAVAILABLE`.
3. WHEN `DELIVERY_UNAVAILABLE` is returned, THE system SHALL NOT return a zero-fee quote — a zero fee SHALL only mean free delivery.
4. THE `DELIVERY_UNAVAILABLE` response SHALL include a human-readable reason describing why delivery cannot be serviced.
5. WHILE a quote has `status: DELIVERY_UNAVAILABLE`, THE checkout service SHALL reject any order that references that `quoteId`.
6. FOR ALL origin–destination coordinate pairs within Tanzania's bounding box, THE zone classifier SHALL return a non-null `DeliveryZone` (metamorphic: valid Tanzanian coordinates never return UNAVAILABLE solely due to coordinate format).

---

### Requirement 4: Shipping Quote Endpoint

**User Story:** As a buyer or mobile client, I want to request a delivery fee quote before placing my order, so that I see the exact fee upfront and can make an informed purchasing decision.

#### Acceptance Criteria

1. THE system SHALL expose a `POST /api/logistics/v1/quote` endpoint that accepts origin coordinates, destination coordinates, declared package weight, and an optional package dimension.
2. WHEN a valid quote request is received, THE `Quote_Service` SHALL return a response containing: `quoteId`, `deliveryFee` (buyer-facing), `currency`, `expiresAt`, `pricingVersion`, `deliveryZone`, and a `PricingBreakdown`.
3. THE `PricingBreakdown` in the quote response SHALL include each pipeline component value (base, distance, time, package, zone multiplier applied, operational surcharge, risk surcharge, margin amount, pre-round fee, final fee).
4. WHEN the zone is unsupported, THE `Quote_Service` SHALL return HTTP 200 with `status: DELIVERY_UNAVAILABLE` — not an error status code.
5. THE `Quote_Service` SHALL assign a unique `quoteId` to every successful quote.
6. THE quote `expiresAt` SHALL be set to the current time plus the configured quote validity period (default: 15 minutes).
7. WHEN a quote request includes invalid coordinates (out of bounds or missing), THE `Quote_Service` SHALL return HTTP 400 with a descriptive validation error.
8. WHEN a quote request includes a negative or zero package weight, THE `Quote_Service` SHALL return HTTP 400 with a descriptive validation error.
9. THE `POST /api/logistics/v1/quote` endpoint SHALL require authentication.
10. THE `Post /api/logistics/v1/quote` endpoint SHALL be protected by rate limiting consistent with the existing logistics service rate-limit policy.
11. FOR ALL valid quote requests, the returned `deliveryFee` SHALL be a positive integer multiple of the configured `RoundingIncrement` (property: fee divisible by increment).
12. FOR ALL valid quote requests with identical inputs and the same active `PricingVersion`, the returned `deliveryFee` SHALL be identical (determinism property).

---

### Requirement 5: Quote Validity and Lifecycle

**User Story:** As a platform operator, I want delivery quotes to expire after a configurable period, so that prices reflect current conditions and stale quotes cannot be exploited.

#### Acceptance Criteria

1. THE `Quote_Service` SHALL persist each issued quote with: `quoteId`, `deliveryFee`, `courierCompensationEstimate`, `platformMarginAmount`, `pricingVersion`, `originCoordinates`, `destinationCoordinates`, `packageWeight`, `deliveryZone`, `status`, `issuedAt`, and `expiresAt`.
2. WHEN a quote is first issued, THE `Quote_Service` SHALL set its `status` to `ACTIVE`.
3. WHEN the current time exceeds a quote's `expiresAt`, THE `Quote_Service` SHALL treat the quote as `EXPIRED`.
4. WHEN an `EXPIRED` quote `quoteId` is submitted at checkout, THE `Checkout_Validator` SHALL reject the order with a descriptive error.
5. WHEN a quote is successfully consumed by a completed order, THE `Quote_Service` SHALL mark the quote `status` as `CONSUMED`.
6. WHEN a quote's `status` is `CONSUMED`, THE `Quote_Service` SHALL reject any subsequent use of the same `quoteId` in a new order.
7. THE configured quote validity period SHALL be changeable via `PricingConfig` without a service restart.
8. FOR ALL quotes, `issuedAt < expiresAt` SHALL always hold (invariant).

---

### Requirement 6: Checkout Security — Server-Side Price Enforcement

**User Story:** As a platform operator, I want the server to always recalculate and validate the delivery fee at checkout, so that no buyer can manipulate the shipping cost by modifying client-side data.

#### Acceptance Criteria

1. THE `Checkout_Validator` SHALL NOT accept a client-supplied `shippingCost` value as the authoritative delivery fee.
2. WHEN an order is placed, THE `Checkout_Validator` SHALL require a valid `quoteId` in the order request.
3. WHEN a `quoteId` is provided, THE `Checkout_Validator` SHALL look up the persisted quote and verify: it exists, its `status` is `ACTIVE`, and it has not expired.
4. WHEN the quote is valid, THE `Checkout_Validator` SHALL use the quote's persisted `deliveryFee` as the authoritative shipping cost — ignoring any client-supplied value.
5. IF the provided `quoteId` does not exist, THEN THE `Checkout_Validator` SHALL reject the order with HTTP 422 and a descriptive error.
6. IF the provided `quoteId` is expired, THEN THE `Checkout_Validator` SHALL reject the order with HTTP 422 indicating the quote has expired and instructing the buyer to request a new one.
7. IF the provided `quoteId` has `status: DELIVERY_UNAVAILABLE`, THEN THE `Checkout_Validator` SHALL reject the order with HTTP 422 indicating the delivery zone is not serviceable.
8. IF the provided `quoteId` is already `CONSUMED`, THEN THE `Checkout_Validator` SHALL reject the order with HTTP 422.
9. WHEN the quote is accepted, THE `Checkout_Validator` SHALL record the `quoteId` and `pricingVersion` on the order record for audit purposes.
10. THE `Checkout_Validator` SHALL enforce quote validation for ALL order placement paths — including COD, wallet, and direct-payment orders.

---

### Requirement 7: Audit Trail

**User Story:** As a platform operator or finance team member, I want a complete audit trail for every delivery fee charged, so that I can reconcile what the courier earned, what the buyer paid, and what the platform retained.

#### Acceptance Criteria

1. THE system SHALL persist an `AuditRecord` for every completed order that includes a delivery fee, containing: `orderId`, `quoteId`, `pricingVersion`, `courierCompensationEstimate`, `buyerDeliveryFee`, `platformMarginAmount`, `deliveryZone`, `packageWeight`, `distanceKm`, `durationMinutes`, and `recordedAt`.
2. THE `AuditRecord` SHALL be immutable once created — no updates shall be permitted.
3. WHEN an order is settled, THE `Settlement_Service` SHALL read the `AuditRecord` to determine the correct courier payout versus platform revenue split.
4. THE system SHALL ensure `buyerDeliveryFee = courierCompensationEstimate + platformMarginAmount` in every `AuditRecord` (invariant — before floor/ceiling/rounding adjustments, the margin relationship must hold).
5. THE `AuditRecord` SHALL reference the exact `PricingVersion` that was active when the quote was issued.

---

### Requirement 8: Routing and Distance Integration

**User Story:** As a platform operator, I want delivery pricing to use real road-based distance and duration estimates, so that fees accurately reflect actual delivery effort.

#### Acceptance Criteria

1. THE `DeliveryPricingEngine` SHALL use the existing `DistanceCalculationAlgorithm` to obtain road-based distance and estimated duration for every pricing computation.
2. WHEN the `MapsRoutingBridge` call exceeds the configured timeout, THE `DeliveryPricingEngine` SHALL fall back to the geodesic (straight-line × inflation-factor) estimate and SHALL record that a fallback was used in the `PricingBreakdown`.
3. THE `DeliveryPricingEngine` SHALL cache routing results for identical origin–destination pairs for a configurable TTL (default: 5 minutes) to avoid redundant routing calls.
4. WHEN a cached routing result is used, THE `DeliveryPricingEngine` SHALL include a `routeSource: 'cache'` indicator in the `PricingBreakdown`.
5. WHEN a live routing result is used, THE `DeliveryPricingEngine` SHALL include a `routeSource: 'live'` indicator in the `PricingBreakdown`.
6. WHEN a fallback routing result is used, THE `DeliveryPricingEngine` SHALL include a `routeSource: 'fallback'` indicator in the `PricingBreakdown`.
7. FOR ALL distance inputs, `roadDistanceKm >= straightLineDistanceKm` SHALL hold (metamorphic: road distance is always >= straight-line distance due to inflation factor ≥ 1.0).

---

### Requirement 9: Courier Compensation Separation

**User Story:** As a platform engineer, I want courier compensation and customer delivery fee to be computed by separate, independent engines, so that internal cost changes do not inadvertently affect buyer prices and vice versa.

#### Acceptance Criteria

1. THE `DeliveryPricingEngine` SHALL be implemented as a distinct domain engine, entirely separate from the `EarningsCalculationEngine`.
2. THE `EarningsCalculationEngine` SHALL continue to calculate courier compensation (BASE_RATE, DISTANCE_RATE, TIME_RATE) independently of the `DeliveryPricingEngine`.
3. THE `DeliveryPricingEngine` SHALL invoke a read-only interface to obtain the courier compensation estimate, which it uses as the cost basis for margin calculation — it SHALL NOT modify the `EarningsCalculationEngine`.
4. WHEN the `EarningsCalculationEngine` rates change, THE `DeliveryPricingEngine` output SHALL only change if the `PricingConfig` margin or other parameters are also updated.
5. WHEN the `PricingConfig` margin changes, THE `EarningsCalculationEngine` output SHALL remain unchanged (independence invariant).

---

### Requirement 10: Multi-Seller Order Compatibility

**User Story:** As a platform architect, I want the pricing engine to be compatible with the current single-seller-per-order model, so that no changes to the existing order structure are required to deliver this feature.

#### Acceptance Criteria

1. THE `DeliveryPricingEngine` SHALL compute one delivery fee per `sellerId`–`buyerId` origin–destination pair consistent with the current `Order_Order` model, which carries a single `sellerId`.
2. WHEN a quote is requested, THE `Quote_Service` SHALL accept a single seller location and a single buyer delivery address.
3. THE `Quote_Service` SHALL document that multi-seller order support (multiple seller locations per order) is out of scope for this version and deferred to a future spec.

---

### Requirement 11: Performance

**User Story:** As a buyer, I want quote responses to be fast, so that the pricing step does not noticeably delay my checkout experience.

#### Acceptance Criteria

1. WHEN the routing result is available from cache, THE `Quote_Service` SHALL respond to a quote request within 200ms at the 95th percentile under normal load.
2. WHEN the routing result requires a live call, THE `Quote_Service` SHALL respond to a quote request within 800ms at the 95th percentile under normal load.
3. THE `DeliveryPricingEngine` SHALL complete the pricing pipeline computation (excluding I/O) within 10ms for any single quote request.
4. WHILE the routing cache is populated, THE `Quote_Service` SHALL serve repeated identical origin–destination requests without additional external routing calls.
