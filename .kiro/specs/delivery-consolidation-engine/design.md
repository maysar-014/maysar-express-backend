# Design Document: Delivery Consolidation Engine

## Overview

The Delivery Consolidation Engine determines whether seller orders in a master order can share a single courier operation. When sellers are geographically close, their packages travel together — the buyer pays one delivery fee for the group instead of N separate fees.

The architecture respects three hard constraints:
1. `consolidate()` is a **pure function** — no async, no I/O, no side effects
2. All existing single-seller delivery paths are **unchanged**
3. Seller isolation is **absolute** — no cross-seller data leaks

---

## Architecture

```
CHECKOUT SESSION (multi-seller)
         │
         ▼
Step 1: Pre-compute distances
  - Haversine(sellerA ↔ sellerB), Haversine(seller → buyer) for all pairs
  - MapsRoutingBridge.getRoute(seller → buyer) for each seller individually
         │
         ▼
Step 2: ConsolidationEngine.consolidate(sellers, buyer, config)
  PURE FUNCTION — greedy proximity-first grouping
  Returns: DeliveryGroupPlan[]
         │
         ▼
Step 3: For each DeliveryGroupPlan
  if group.size == 1:
    → RequestDeliveryQuoteUseCase (existing path, unchanged)
  if group.size >= 2:
    → MapsRoutingBridge.getMultiWaypointRoute(pickupSequence, destination)
    → DeliveryPricingEngine.compute(multiPickupInput, config)
    → One Logistics_Quote for the group
         │
         ▼
Step 4: CostAllocator.allocate(group, totalCost, weights)
  weight_proportional algorithm
  Returns: { sellerOrderId → allocatedCost }[]
         │
         ▼
Step 5: Store on session
  { deliveryGroupId → quoteId }[]
  { sellerOrderId → allocatedCost }[]
```

---

## Data Models

### New: Logistics_DeliveryGroup

```prisma
model Logistics_DeliveryGroup {
  id                String   @id @db.VarChar(64)   // DCG-{ULID}
  masterOrderId     String   @db.VarChar(64)
  sellerOrderIds    Json                            // string[] — ordered
  pickupSequence    Json                            // {lat, lng, address}[] — ordered
  buyerDestination  Json                            // {lat, lng, address}
  totalDeliveryCost Decimal  @db.Decimal(12, 2)
  pricingVersion    Int
  allocationAlgorithm String @default("weight_proportional") @db.VarChar(32)
  status            String   @default("PENDING_PRICING") @db.VarChar(32)
  quoteId           String?  @db.VarChar(64)       // set when QUOTE_ISSUED
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([masterOrderId])
  @@index([status])
  @@map("logistics_delivery_groups")
}
```

### New: Logistics_ConsolidationAudit

```prisma
model Logistics_ConsolidationAudit {
  id               String   @id @db.VarChar(64)
  masterOrderId    String   @db.VarChar(64)
  deliveryGroupIds Json                          // string[]
  groupSizes       Json                          // number[] — one per group
  rulesApplied     Json                          // {proximity, weight, routeEfficiency, timeWindow}
  totalSavingsTzs  Decimal  @db.Decimal(12, 2)
  fallbackReason   String?  @db.Text
  pricingVersion   Int
  consolidatedAt   DateTime @default(now())

  @@index([masterOrderId])
  @@map("logistics_consolidation_audits")
}
```

### Modified: Logistics_Quote

Add two nullable fields for backward compatibility:

```prisma
  deliveryGroupId  String?  @db.VarChar(64)   // null for single-seller legacy quotes
  sellerOrderIds   Json?                       // string[] — null for single-seller legacy quotes
```

### Modified: PricingConfig (new consolidation fields)

```typescript
// Added to PricingConfigData and PricingConfig class:
consolidationRadiusKm: number;             // default 5.0
maxConsolidatedRouteOverheadPct: number;   // default 1.40  (i.e. 40% overhead allowed)
maxGroupWeightKg: number;                  // default 20.0
allocationAlgorithm: 'weight_proportional'; // enum, only value in v1
```

---

## New Domain Files

### 1. `consolidation.engine.ts` — Pure consolidation function

```typescript
export interface SellerPickupInput {
  sellerOrderId: string;
  sellerId: string;
  pickupPoint: GeoPoint;
  packageWeightKg: number;
  expectedConfirmByHour?: number; // 0-23, optional; if absent, time rule skipped
  // Pre-computed — passed in, never computed inside consolidate()
  haversineToOtherSellers: Record<string, number>; // sellerId → km
  haversineToDestination: number;                  // km
  individualRouteDistanceKm: number;               // road distance seller → buyer
}

export interface ConsolidationConfig {
  consolidationRadiusKm: number;
  maxConsolidatedRouteOverheadPct: number;
  maxGroupWeightKg: number;
  allocationAlgorithm: 'weight_proportional';
}

export interface DeliveryGroupPlan {
  tempGroupId: string;           // ephemeral — replaced by DCG- id when persisted
  sellerOrderIds: string[];      // ordered by pickup sequence
  pickupSequence: GeoPoint[];    // ordered: nearest-to-destination first
  totalWeightKg: number;
  consolidationBenefit: 'CONSOLIDATED' | 'SINGLETON';
}

/**
 * Pure function — no I/O, no async, no side effects.
 * All distances pre-computed by caller.
 */
export function consolidate(
  sellers: SellerPickupInput[],
  buyer: GeoPoint,
  config: ConsolidationConfig,
): DeliveryGroupPlan[];
```

**Algorithm:**

```
1. Sort sellers by haversineToDestination ASC (nearest to buyer first)
2. For each seller:
   a. Try to assign to an existing candidate group:
      - Proximity check: haversineToSeller <= consolidationRadiusKm for ALL existing members
      - Weight check: groupWeight + seller.weight <= maxGroupWeightKg
      - Time window check: expectedConfirmByHour within ±4 hours of group window (if present)
   b. If no group accepts, create new singleton group
3. Route overhead check (post-assignment):
   - For each group with size >= 2:
     - longestIndividualRoute = max(seller.individualRouteDistanceKm for sellers in group)
     - combinedHaversineRoute = sum of consecutive Haversine distances in pickup sequence + final leg to buyer
     - if combinedHaversineRoute > longestIndividualRoute * maxConsolidatedRouteOverheadPct:
       - Split: remove last-added seller from group, create singleton for it
4. Compute pickup sequence for each multi-seller group:
   - Nearest-neighbour starting from seller with largest haversineToDestination (furthest from buyer = picked up first)
   - Result: pickupSequence[0] is furthest seller, pickupSequence[N-1] is nearest seller (last pickup before buyer)
5. Return DeliveryGroupPlan[]
```

### 2. `cost-allocator.ts` — Weight-proportional allocation

```typescript
export interface AllocationInput {
  sellerOrderId: string;
  weightKg: number;
}

export interface AllocationResult {
  sellerOrderId: string;
  allocatedCostTzs: number; // integer TZS
}

/**
 * Pure function. Allocates totalCostTzs across sellers by weight.
 * Uses largest-remainder adjustment to ensure sum === totalCostTzs exactly.
 */
export function allocateByWeight(
  sellers: AllocationInput[],
  totalCostTzs: number,
): AllocationResult[];
```

**Algorithm:**
```
1. Compute raw share for each seller: rawShare = totalCost × (weight / totalWeight)
2. Floor each share → flooredShares[]
3. Compute remainders: rawShare - floor
4. Remainder = totalCost - sum(flooredShares)
5. Sort sellers by remainder DESC, assign +1 TZS to top `remainder` sellers
6. Return allocations
```

### 3. `delivery-group.entity.ts`

```typescript
export type DeliveryGroupStatus =
  'PENDING_PRICING' | 'PRICED' | 'QUOTE_ISSUED' | 'CONSUMED' | 'CANCELLED';

export interface DeliveryGroupData {
  id: string;
  masterOrderId: string;
  sellerOrderIds: string[];
  pickupSequence: GeoPoint[];
  buyerDestination: GeoPoint;
  totalDeliveryCost: number;
  pricingVersion: number;
  allocationAlgorithm: 'weight_proportional';
  status: DeliveryGroupStatus;
  quoteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DeliveryGroup { /* immutable getters, markQuoteIssued(), markConsumed() */ }
```

---

## Integration Changes

### `RequestDeliveryQuoteUseCase` — Extended for multi-pickup

```typescript
export interface DeliveryQuoteRequest {
  // existing fields...
  
  // NEW: multi-pickup support
  additionalPickupPoints?: Array<{
    lat: number; lng: number; address: string; sellerOrderId: string;
  }>;
}
```

When `additionalPickupPoints` is present:
- Route = `origin → additionalPickupPoints[0] → ... → destination`
- `MapsRoutingBridge.getMultiWaypointRoute(points, destination)` called instead of `getRoute()`
- `ZoneClassifier` uses `origin → destination` (first pickup to buyer)
- Package weight = sum of all sellers in group

### `MapsRoutingBridge` — New method

```typescript
async getMultiWaypointRoute(
  waypoints: GeoPoint[],   // [seller1, seller2, ..., sellerN, buyer]
): Promise<RoutingResult>  // total distanceKm and durationMinutes for full route
```

Falls back to sequential Haversine × 1.35 road factor if routing service unavailable.

### `MultiSellerCheckoutUseCase` — Consolidation step inserted

```typescript
// NEW step before quote generation:
const consolidationPlan = await this.consolidationOrchestrator.plan(
  sellerGroups,       // Map<sellerId, { items, pickupPoint, weightKg }>
  buyerDestination,
  config,
);

// Request one quote per delivery group (not per seller)
for (const group of consolidationPlan.groups) {
  const quote = await this.requestDeliveryQuoteUseCase.execute({
    // first seller as origin, additionalPickupPoints for rest
    ...
    deliveryGroupId: group.tempGroupId,
  });
  groupQuotes.set(group.tempGroupId, quote.quoteId);
}
```

---

## Checkout Flow Changes

**Before:**
```
For each seller: request quote → { sellerId: quoteId }
```

**After:**
```
1. Fetch seller locations from catalog
2. Pre-compute Haversine distances
3. consolidate(sellers, buyer, config) → DeliveryGroupPlan[]
4. For each group:
   - Request quote (single or multi-pickup)
5. Store: { deliveryGroupId: quoteId }[] on session
6. At confirmation: validate group quotes (not per-seller quotes)
```

**Session changes:**
```typescript
// Checkout_CheckoutSession
sellerQuotes     Json?  // { [sellerId]: { quoteId } }    ← existing
deliveryGroups   Json?  // { [groupId]: { quoteId, sellerOrderIds[], totalCost } }  ← new
```

---

## Buyer API Response

**Before (per-seller):**
```json
{
  "delivery": {
    "sellerA": { "fee": 3850 },
    "sellerB": { "fee": 3850 }
  },
  "totalDelivery": 7700
}
```

**After (per-group):**
```json
{
  "deliveryGroups": [
    {
      "groupId": "DCG-...",
      "sellerCount": 2,
      "fee": 4200,
      "label": "2-seller pickup"
    }
  ],
  "totalDelivery": 4200
}
```

---

## Analytics Events

```typescript
// Emitted when any multi-seller group exists
{
  type: 'delivery.consolidated',
  masterOrderId: string,
  deliveryGroupId: string,
  sellerCount: number,
  totalDeliveryCost: number,
  estimatedSavings: number,   // sum(individual quotes) - group cost
  pricingVersion: number,
  createdAt: ISO8601,
}
```

---

## Configuration Seed Update

```typescript
// Added to scripts/seed-pricing-config.ts PRICING_CONFIG_V2:
consolidationRadiusKm: 5.0,
maxConsolidatedRouteOverheadPct: 1.40,
maxGroupWeightKg: 20.0,
allocationAlgorithm: 'weight_proportional',
```

---

## Correctness Properties

1. **Partition invariant**: every seller order in a master order belongs to exactly one delivery group
2. **Cost sum invariant**: `sum(allocatedCost for sellers in group) === group.totalDeliveryCost`
3. **Consolidation cost invariant**: `group.totalDeliveryCost ≤ sum(individual quotes for same sellers)`
4. **Weight capacity invariant**: `sum(weights in group) ≤ maxGroupWeightKg`
5. **Proximity invariant**: `haversine(sellerA, sellerB) ≤ consolidationRadiusKm` for all pairs in a group
6. **Determinism**: identical inputs → identical output for `consolidate()` and `allocateByWeight()`
7. **Seller isolation**: no cross-seller data in any seller-facing API response
8. **Zero fallback**: if consolidation engine fails, individual quotes are issued — buyer is never left without a delivery fee

---

## Migration

Single SQL migration:
1. `CREATE TABLE logistics_delivery_groups (...)`
2. `CREATE TABLE logistics_consolidation_audits (...)`
3. `ALTER TABLE logistics_quotes ADD COLUMN deliveryGroupId ...`
4. `ALTER TABLE logistics_quotes ADD COLUMN sellerOrderIds ...`
5. `ALTER TABLE checkout_sessions ADD COLUMN deliveryGroups JSONB`
