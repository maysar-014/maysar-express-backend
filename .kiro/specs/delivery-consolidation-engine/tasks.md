# Implementation Plan: Delivery Consolidation Engine

## Overview

Introduces a Delivery Consolidation Engine that groups geographically close sellers in a master order into shared courier operations, reducing unnecessary duplicate delivery fees. All existing single-seller delivery paths remain unchanged.

---

## Tasks

- [x] 1. Prisma schema — new consolidation tables + quote extensions
  - Append `Logistics_DeliveryGroup` model to `prisma/schema.prisma`
  - Append `Logistics_ConsolidationAudit` model
  - Add `deliveryGroupId String? @db.VarChar(64)` and `sellerOrderIds Json?` to `Logistics_Quote`
  - Add four new fields to `Logistics_PricingConfig`: `consolidationRadiusKm Decimal?`, `maxConsolidatedRouteOverheadPct Decimal?`, `maxGroupWeightKg Decimal?`, `allocationAlgorithm String?`
  - Add `deliveryGroups Json?` to `Checkout_CheckoutSession`
  - Run `npx prisma generate`
  - _Requirements: 1.1, 6.3, 11.1_

- [x] 2. Migration SQL for consolidation tables
  - Create `prisma/migrations/20260823100000_add_delivery_consolidation_engine/migration.sql`
  - `CREATE TABLE logistics_delivery_groups` with all fields
  - `CREATE TABLE logistics_consolidation_audits`
  - `ALTER TABLE logistics_quotes ADD COLUMN deliveryGroupId`, `sellerOrderIds`
  - `ALTER TABLE checkout_sessions ADD COLUMN deliveryGroups JSONB`
  - `ALTER TABLE logistics_pricing_configs ADD COLUMN` the four new consolidation fields with defaults
  - _Requirements: 1.1, 6.3, 11.1_

- [x] 3. Update PricingConfig value object and seed script
  - Add four new optional fields to `PricingConfigData` interface and `PricingConfig` class in `pricing-config.value-object.ts`
  - Add getters: `consolidationRadiusKm`, `maxConsolidatedRouteOverheadPct`, `maxGroupWeightKg`, `allocationAlgorithm`
  - Update validation: `maxGroupWeightKg > 0` required, `consolidationRadiusKm >= 0` required
  - Add to `scripts/seed-pricing-config.ts` PRICING_CONFIG_V2: `consolidationRadiusKm: 5.0, maxConsolidatedRouteOverheadPct: 1.40, maxGroupWeightKg: 20.0, allocationAlgorithm: 'weight_proportional'`
  - _Requirements: 11.1–11.8_

- [x] 4. DeliveryGroup entity + repository
  - Create `services/logistics-service/src/domain/entities/delivery-group.entity.ts`
    - `DeliveryGroupStatus` type with valid transitions
    - `DeliveryGroupData` interface
    - `DeliveryGroup` class with immutable getters, `markQuoteIssued(quoteId)`, `markConsumed()`
    - Enforce: `sellerOrderIds.length === pickupSequence.length` at construction
  - Create `services/logistics-service/src/domain/repositories/delivery-group.repository.ts`
  - Create `services/logistics-service/src/infrastructure/repositories/prisma-delivery-group.repository.ts`
  - _Requirements: 1.1–1.7_

- [x] 5. Haversine distance utility
  - Create `services/logistics-service/src/domain/services/haversine.ts`
  - Implement `haversineKm(a: GeoPoint, b: GeoPoint): number`
  - Pure function, no dependencies
  - Property: `haversineKm(a, b) === haversineKm(b, a)` (symmetry)
  - Property: `haversineKm(a, a) === 0` (identity)
  - _Requirements: 2.4, 3.1_

- [x] 6. ConsolidationEngine — pure consolidation function
  - Create `services/logistics-service/src/domain/engines/consolidation.engine.ts`
  - Implement `SellerPickupInput`, `ConsolidationConfig`, `DeliveryGroupPlan` interfaces
  - Implement `consolidate(sellers, buyer, config): DeliveryGroupPlan[]` as a pure synchronous function
  - Algorithm: greedy proximity-first, four eligibility rules in order (proximity → weight → route efficiency → time window)
  - Pickup sequencing: nearest-neighbour, furthest-from-buyer seller picked up first
  - Edge cases: N=0 returns [], N=1 returns one singleton group, consolidationRadiusKm=0 returns all singletons
  - _Requirements: 2.1–2.7, 3.1–3.8, 12.1–12.5_

- [x] 7. CostAllocator — weight-proportional allocation
  - Create `services/logistics-service/src/domain/engines/cost-allocator.ts`
  - Implement `AllocationInput`, `AllocationResult` interfaces
  - Implement `allocateByWeight(sellers, totalCostTzs): AllocationResult[]`
  - Largest-remainder adjustment ensures `sum(results) === totalCostTzs` exactly
  - Pure function — no I/O
  - Edge case: single seller → 100% allocated to that seller
  - _Requirements: 5.1–5.6_

- [x] 8. MapsRoutingBridge — multi-waypoint route support
  - Add `getMultiWaypointRoute(waypoints: GeoPoint[], destination: GeoPoint): Promise<RoutingResult>` to `MapsRoutingBridge`
  - Computes total road distance and duration for the full waypoint chain
  - Fallback: if routing service unavailable, compute sequential Haversine × 1.35 road factor + sum durations
  - Update `MapsRoutingAdapter` to support the new method
  - _Requirements: 4.2, 4.4_

- [x] 9. RequestDeliveryQuoteUseCase — multi-pickup extension
  - Add optional `additionalPickupPoints?: GeoPoint[]` to `DeliveryQuoteRequest`
  - Add optional `deliveryGroupId?: string`
  - When `additionalPickupPoints` is present, use `getMultiWaypointRoute` instead of `getRoute`
  - Zone classified from `originLat/Lng → destination` (first pickup → buyer, unchanged)
  - Package weight = sum of all sellers when multi-pickup
  - Single-seller path is 100% unchanged
  - _Requirements: 4.1–4.6_

- [x] 10. ConsolidationOrchestrator — coordinates the full consolidation flow
  - Create `services/logistics-service/src/application/services/consolidation-orchestrator.service.ts`
  - `plan(sellerGroups, buyerDestination, config)` method:
    1. Fetch seller pickup GeoPoints from catalog via globalThis.prisma
    2. Pre-compute all pairwise Haversine distances + individual route distances (via RoutingProvider)
    3. Call pure `consolidate()` function
    4. For each group: call `RequestDeliveryQuoteUseCase` with single or multi-pickup request
    5. Allocate costs with `allocateByWeight()`
    6. Persist `Logistics_DeliveryGroup` records
    7. Persist `Logistics_ConsolidationAudit` record
    8. Return `ConsolidationResult`: `{ groups: DeliveryGroupWithQuote[], totalSavings: number }`
  - Fallback: if consolidation fails, return singleton groups (individual quotes)
  - _Requirements: 2.4, 7.1–7.7, 9.4_

- [x] 11. MultiSellerCheckoutUseCase — integrate consolidation
  - Import and use `ConsolidationOrchestrator` instead of requesting per-seller quotes directly
  - When consolidation returns groups: store `{ deliveryGroupId → quoteId }[]` on session as `deliveryGroups`
  - At confirmation: validate group quotes (not per-seller quotes)
  - Remove per-seller quote validation loop for consolidated sellers
  - Maintain backward compat: if no consolidation (all singletons), store under both old `sellerQuotes` and new `deliveryGroups`
  - Emit `delivery.consolidated` event for any multi-seller group
  - _Requirements: 7.1–7.7, 8.1–8.6, 9.2_

- [x] 12. Buyer API — delivery group fee display
  - Update checkout session response to include `deliveryGroups[]` with `groupId`, `sellerCount`, `fee`, `label`
  - `totalDelivery = sum(group.fee for groups)`
  - Never expose `allocatedDeliveryCost` in buyer-facing responses
  - Single-seller groups display identically to current single-seller fee (no UX change)
  - _Requirements: 8.1–8.6_

- [x] 13. Seller isolation enforcement
  - Verify no `deliveryGroupId`, co-seller identity, or co-seller pickup address in any seller-facing API response
  - Add check in `OrderController` seller endpoints: strip `deliveryGroupId` from response
  - `allocatedDeliveryCost` field visible only in internal/platform responses
  - _Requirements: 10.1–10.7_

- [x] 14. Analytics event emission
  - Emit `delivery.consolidated` event in `ConsolidationOrchestrator` when any group has size ≥ 2
  - Event: `{ masterOrderId, deliveryGroupId, sellerCount, totalDeliveryCost, estimatedSavings, pricingVersion, createdAt }`
  - _Requirements: 9.2–9.3_

- [ ] 15. Migration execution and seed update
  - Apply: `npx prisma migrate deploy`
  - Reseed: `npx tsx scripts/seed-pricing-config.ts` (seeds v2 with new consolidation params)
  - _Requirements: 11.1_

---

## Notes

- Tasks 1–5 are pure foundations (schema, entities, pure functions) — no integration dependencies
- Task 6 (ConsolidationEngine) is the core algorithm — must be thoroughly unit-tested independently
- Task 10 (ConsolidationOrchestrator) is the only async orchestration layer; Tasks 6 and 7 feed into it but are never called directly from controllers
- The existing `RequestDeliveryQuoteUseCase` single-seller path (Task 9) must not regress — it is called with identical inputs when a group has exactly one seller
- Task 11 is the highest-risk integration point; the existing multi-seller checkout flow depends on it
