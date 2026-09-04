# Design Document — Delivery Pricing Engine

## Overview

The Delivery Pricing Engine introduces a first-class, server-authoritative delivery fee system for the Maysar marketplace. Today, `InitiateCheckoutUseCase` accepts a client-supplied `shippingCost` without any server-side validation — a critical security gap that allows buyers to send arbitrary (including zero) delivery charges. This design resolves that gap with:

1. A **`DeliveryPricingEngine`** domain component in `logistics-service` that computes customer-facing delivery fees through an 11-stage pipeline.
2. A **`POST /api/logistics/v1/quote`** HTTP endpoint that issues time-bound, versioned pricing quotes.
3. A **Quote lifecycle** (ACTIVE → EXPIRED / CONSUMED) persisted in Postgres.
4. A **checkout security layer** in `InitiateCheckoutUseCase` (checkout-service) that validates a server-issued `quoteId` and ignores any client-supplied cost.
5. An **`AuditRecord`** for every completed delivery to support financial reconciliation.

The engine reuses existing infrastructure without duplication: `MapsRoutingBridge` + `DistanceCalculationAlgorithm` for routing, `TanzaniaLocationIndex` for zone classification, and a read-only interface to `EarningsCalculationEngine` for the courier cost basis.

---

## Architecture

### Component Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                         logistics-service                            │
│                                                                      │
│  API Layer                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  POST /api/logistics/v1/quote  (QuotePricingController)         │ │
│  └───────────────────────────────┬─────────────────────────────────┘ │
│                                  │                                   │
│  Application Layer               ▼                                   │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  RequestDeliveryQuoteUseCase                                  │   │
│  │   → validates input, orchestrates engine call, persists quote │   │
│  └───────┬───────────────────────────────────────────────────────┘   │
│          │                                                           │
│  Domain Layer                                                        │
│  ┌───────▼──────────────────────────────────────────────────────┐    │
│  │  DeliveryPricingEngine                                       │    │
│  │   Stage 1: base cost                                         │    │
│  │   Stage 2: distance cost                                     │    │
│  │   Stage 3: time cost                                         │    │
│  │   Stage 4: package factor                                    │    │
│  │   Stage 5: zone multiplier  ←─ ZoneClassifier               │    │
│  │   Stage 6: operational surcharge                             │    │
│  │   Stage 7: risk surcharge                                    │    │
│  │   Stage 8: platform margin                                   │    │
│  │   Stage 9: floor/ceiling clamp                               │    │
│  │   Stage 10: rounding                                         │    │
│  │   Stage 11: final fee                                        │    │
│  └───────┬───────────────────────┬──────────────────────────────┘    │
│          │                       │                                   │
│  ┌───────▼──────────┐  ┌─────────▼──────────────┐                   │
│  │ CourierCostCalc  │  │    ZoneClassifier       │                   │
│  │ (read-only view  │  │  (TanzaniaLocationIndex │                   │
│  │  into Earnings   │  │   + locality inference) │                   │
│  │  Engine)         │  └─────────────────────────┘                   │
│  └───────┬──────────┘                                                │
│          │                                                           │
│  ┌───────▼──────────────────────────────────────────────────────┐    │
│  │ RoutingProvider (interface)                                  │    │
│  │   └── RoutingCacheDecorator (5-min in-memory cache)         │    │
│  │         └── MapsRoutingBridge (existing)                     │    │
│  │               └── DistanceCalculationAlgorithm (fallback)   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Infrastructure Layer                                                │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  PrismaQuoteRepository      PricingConfigRepository         │    │
│  │  (Logistics_Quote table)    (Logistics_PricingConfig table)  │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        checkout-service                              │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  InitiateCheckoutUseCase (modified)                           │   │
│  │   → accepts quoteId, rejects client shippingCost             │   │
│  │   → QuoteValidationService (HTTP call to logistics-service)  │   │
│  │   → sets session.shippingCost = quote.deliveryFee            │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow — Quote Request

```
Client
  │
  │  POST /api/logistics/v1/quote
  │  { originLat, originLng, originAddress,
  │    destLat, destLng, destAddress,
  │    packageWeightKg, packageDimensions? }
  ▼
QuotePricingController
  │  validate Joi schema
  ▼
RequestDeliveryQuoteUseCase
  │  load active PricingConfig (with version)
  │
  ├──► ZoneClassifier.classify(origin, dest)
  │       uses TanzaniaLocationIndex.infer()
  │       → DeliveryZone | DELIVERY_UNAVAILABLE
  │
  ├──► RoutingProvider.getRoute(origin, dest)
  │       → RoutingCacheDecorator (check 5-min cache)
  │           hit  → { distanceKm, durationMin, source:'cache' }
  │           miss → MapsRoutingBridge → DistanceCalculationAlgorithm
  │                  → { distanceKm, durationMin, source:'live'|'fallback' }
  │
  ├──► CourierCostCalculator.estimate(distanceKm, durationMin)
  │       reads BASE_RATE/DISTANCE_RATE/TIME_RATE (read-only)
  │       → courierCompensationEstimate
  │
  ├──► DeliveryPricingEngine.compute(pricingInput)
  │       11-stage pipeline → PricingBreakdown + finalFee
  │
  ├──► QuoteRepository.save(quote)
  │       quoteId, deliveryFee, courierEst, pricingVersion,
  │       status:ACTIVE, issuedAt, expiresAt
  │
  ├──► AuditRecordRepository.save(priceAudit)
  │       (pre-order audit for reconciliation)
  │
  └──► return QuoteResponse
```

### Data Flow — Checkout Security

```
Client
  │  POST /api/checkout/v1/initiate
  │  { cartId, shippingAddressId, quoteId, ... }
  │  (shippingCost from client is IGNORED)
  ▼
InitiateCheckoutUseCase (modified)
  │
  ├──► QuoteValidationService.validate(quoteId)
  │       GET logistics-service /internal/quotes/:quoteId
  │       checks: exists, status=ACTIVE, not expired
  │       → QuoteValidationResult { deliveryFee, pricingVersion }
  │
  ├──► [if invalid] → 422 Unprocessable Entity
  │
  ├──► session.shippingCost = quote.deliveryFee  (authoritative)
  │
  ├──► session.quoteId = quoteId
  ├──► session.pricingVersion = quote.pricingVersion
  │
  ├──► QuoteRepository.markConsumed(quoteId)
  │
  └──► return CheckoutResult
```

---

## Components and Interfaces

### 1. DeliveryPricingEngine

The core domain engine. Stateless and pure — given a `PricingInput` and `PricingConfig`, it returns a `PricingResult` deterministically.

```typescript
// services/logistics-service/src/domain/engines/delivery-pricing.engine.ts

export interface PricingInput {
  distanceKm: number;
  durationMinutes: number;
  packageWeightKg: number;
  packageDimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  deliveryZone: DeliveryZone;
  isCoD: boolean;
  isOperationalPeakHour: boolean;
  courierCompensationEstimate: number; // TZS, read from CourierCostCalculator
}

export interface PricingBreakdown {
  baseCost: number;
  distanceCost: number;
  timeCost: number;
  packageFactor: number;           // multiplier applied (e.g., 1.2)
  subtotalBeforeZone: number;
  zoneMultiplier: number;          // e.g., 1.15 for cross-region
  subtotalAfterZone: number;
  operationalSurcharge: number;
  riskSurcharge: number;           // COD surcharge etc.
  premarginFee: number;            // sum of all components before margin
  marginPct: number;
  marginAmount: number;
  preclampFee: number;             // premarginFee + marginAmount
  floorPrice: number;
  ceilingPrice: number;
  postClampFee: number;
  roundingIncrement: number;
  finalFee: number;                // customer-facing delivery fee (TZS)
  routeSource: 'live' | 'cache' | 'fallback';
  pricingVersion: number;
}

export interface PricingResult {
  breakdown: PricingBreakdown;
  deliveryFee: number;             // alias for breakdown.finalFee
}

export class DeliveryPricingEngine {
  compute(input: PricingInput, config: PricingConfig): PricingResult;

  // Stage implementations (private)
  private stage1_base(config: PricingConfig): number;
  private stage2_distance(distanceKm: number, config: PricingConfig): number;
  private stage3_time(durationMinutes: number, config: PricingConfig): number;
  private stage4_packageFactor(
    subtotal: number,
    weightKg: number,
    config: PricingConfig
  ): { adjusted: number; factor: number };
  private stage5_zone(subtotal: number, zone: DeliveryZone, config: PricingConfig): number;
  private stage6_operationalSurcharge(input: PricingInput, config: PricingConfig): number;
  private stage7_riskSurcharge(input: PricingInput, config: PricingConfig): number;
  private stage8_margin(premarginFee: number, config: PricingConfig): number;
  private stage9_clamp(fee: number, config: PricingConfig): number;
  private stage10_round(fee: number, config: PricingConfig): number;
}
```

### 2. CourierCostCalculator

A read-only adapter over `EarningsCalculationEngine`. It computes the courier compensation for a single delivery. It does NOT modify the earnings engine and does not inherit from it.

```typescript
// services/logistics-service/src/domain/engines/courier-cost-calculator.ts

export interface CourierCostEstimate {
  baseRate: number;          // TZS (fixed per delivery)
  distanceCost: number;      // distanceKm × DISTANCE_RATE
  timeCost: number;          // durationMin × TIME_RATE
  totalCompensation: number; // sum
}

export class CourierCostCalculator {
  // Constants sourced from EarningsCalculationEngine (read-only reference)
  private static readonly BASE_RATE = 2000;    // TZS
  private static readonly DISTANCE_RATE = 500; // TZS/km
  private static readonly TIME_RATE = 200;     // TZS/min

  estimate(distanceKm: number, durationMinutes: number): CourierCostEstimate {
    const baseRate = CourierCostCalculator.BASE_RATE;
    const distanceCost = distanceKm * CourierCostCalculator.DISTANCE_RATE;
    const timeCost = durationMinutes * CourierCostCalculator.TIME_RATE;
    return {
      baseRate,
      distanceCost,
      timeCost,
      totalCompensation: baseRate + distanceCost + timeCost,
    };
  }
}
```

**Key architectural principle**: `CourierCostCalculator` hardcodes the same constants as `EarningsCalculationEngine` and must be kept in sync when those rates change. Any change to `EarningsCalculationEngine` rates requires a parallel update to `CourierCostCalculator`. These are intentionally separate to allow customer pricing and courier compensation to evolve independently once a proper config-driven approach is desired for courier rates.

### 3. ZoneClassifier

Wraps `TanzaniaLocationIndex` and the `MapsRoutingBridge` locality inference to produce a `DeliveryZone`.

```typescript
// services/logistics-service/src/domain/services/zone-classifier.ts

export type DeliveryZone =
  | 'same_ward'
  | 'same_district'
  | 'same_region'
  | 'cross_region';

export interface ZoneClassificationResult {
  zone: DeliveryZone | null;
  unavailable: boolean;
  reason?: string;
}

export class ZoneClassifier {
  constructor(private readonly locationIndex: TanzaniaLocationIndex) {}

  classify(origin: GeoPoint, destination: GeoPoint): ZoneClassificationResult;
}
```

The zone is resolved by calling `getLocalitySummary()` on both points (which already uses `TanzaniaLocationIndex.infer()`), then comparing `wardName`, `districtName`, and `regionName` — matching the existing logic in `MapsRoutingBridge.inferRouteProfile()`.

### 4. RoutingProvider Interface + Cache Decorator

```typescript
// services/logistics-service/src/domain/engines/ports/routing-provider.port.ts

export interface RoutingResult {
  distanceKm: number;
  durationMinutes: number;
  source: 'live' | 'cache' | 'fallback';
}

export interface RoutingProviderPort {
  getRoute(origin: GeoPoint, destination: GeoPoint): Promise<RoutingResult>;
}

// services/logistics-service/src/infrastructure/providers/routing-cache.decorator.ts

export class RoutingCacheDecorator implements RoutingProviderPort {
  private cache: Map<string, { result: RoutingResult; expiresAt: number }>;

  constructor(
    private readonly delegate: RoutingProviderPort,
    private readonly ttlMs: number = 5 * 60 * 1000 // 5 minutes
  ) {}

  async getRoute(origin: GeoPoint, destination: GeoPoint): Promise<RoutingResult>;

  private cacheKey(origin: GeoPoint, destination: GeoPoint): string;
  // Key: `${lat1.toFixed(4)},${lng1.toFixed(4)}→${lat2.toFixed(4)},${lng2.toFixed(4)}`
  // Rounding to 4 decimal places ≈ 11m precision, appropriate for same-building dedup
}

// services/logistics-service/src/infrastructure/providers/maps-routing-adapter.ts

export class MapsRoutingAdapter implements RoutingProviderPort {
  constructor(
    private readonly bridge: MapsRoutingBridge,
    private readonly algorithm: typeof DistanceCalculationAlgorithm
  ) {}

  async getRoute(origin: GeoPoint, destination: GeoPoint): Promise<RoutingResult>;
}
```

### 5. PricingConfig

```typescript
// services/logistics-service/src/domain/value-objects/pricing-config.value-object.ts

export interface ZoneMultipliers {
  same_ward: number;
  same_district: number;
  same_region: number;
  cross_region: number;
}

export interface PackageWeightTier {
  maxWeightKg: number;  // upper bound of tier (Infinity for last tier)
  multiplier: number;   // applied to (base + distance + time) subtotal
}

export interface OperationalSurchargeSchedule {
  peakHourSurchargeAmount: number;   // TZS flat amount
  peakHours: Array<{ startHour: number; endHour: number }>; // 24h
}

export interface PricingConfigData {
  version: number;                   // monotonically increasing integer
  baseFee: number;                   // TZS flat per delivery
  distanceRateTzsPerKm: number;
  timeRateTzsPerMinute: number;
  packageWeightTiers: PackageWeightTier[];
  zoneMultipliers: ZoneMultipliers;
  operationalSurcharge: OperationalSurchargeSchedule;
  riskSurchargeRateCod: number;      // fractional, e.g., 0.05 = 5% of premargin
  platformMarginPct: number;         // fractional, e.g., 0.30 = 30%
  floorPriceTzs: number;
  ceilingPriceTzs: number;
  roundingIncrementTzs: number;
  quoteValiditySeconds: number;      // default 900 (15 min)
  routingCacheTtlMs: number;         // default 300_000 (5 min)
  isActive: boolean;
  createdAt: Date;
}

export class PricingConfig {
  constructor(private readonly data: PricingConfigData) {
    this.validate();
  }

  static fromPersisted(data: PricingConfigData): PricingConfig;
  get version(): number;
  get baseFee(): number;
  // ... typed getters for all fields
  toJSON(): PricingConfigData;

  private validate(): void; // throws if fields are invalid
}
```

### 6. Quote Entity

```typescript
// services/logistics-service/src/domain/entities/quote.entity.ts

export type QuoteStatus = 'ACTIVE' | 'EXPIRED' | 'CONSUMED' | 'DELIVERY_UNAVAILABLE';

export interface QuoteData {
  quoteId: string;
  deliveryFee: number;
  courierCompensationEstimate: number;
  platformMarginAmount: number;
  pricingVersion: number;
  originLat: number;
  originLng: number;
  originAddress: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  packageWeightKg: number;
  deliveryZone: DeliveryZone | null;
  status: QuoteStatus;
  issuedAt: Date;
  expiresAt: Date;
  breakdown: PricingBreakdown;
  unavailableReason?: string;
}

export class Quote {
  constructor(private data: QuoteData) {}

  get quoteId(): string;
  get status(): QuoteStatus;
  get deliveryFee(): number;
  get isExpired(): boolean;  // returns true if Date.now() > expiresAt

  markConsumed(): void;
  toResponse(): QuoteResponse;
}
```

### 7. Repository Interfaces

```typescript
// services/logistics-service/src/domain/repositories/quote.repository.ts

export interface QuoteRepository {
  save(quote: Quote): Promise<void>;
  findById(quoteId: string): Promise<Quote | null>;
  markConsumed(quoteId: string): Promise<void>;
  markExpired(quoteId: string): Promise<void>; // used by expiry job
}

// services/logistics-service/src/domain/repositories/pricing-config.repository.ts

export interface PricingConfigRepository {
  getActive(): Promise<PricingConfig>;
  getByVersion(version: number): Promise<PricingConfig | null>;
  save(config: PricingConfig): Promise<void>;
  getNextVersion(): Promise<number>;
}
```

### 8. RequestDeliveryQuoteUseCase

```typescript
// services/logistics-service/src/application/use-cases/request-delivery-quote.use-case.ts

export interface DeliveryQuoteRequest {
  originLat: number;
  originLng: number;
  originAddress: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  packageWeightKg: number;
  packageDimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  isCoD?: boolean;
  requestedAt?: Date; // defaults to now()
}

export interface DeliveryQuoteResponse {
  quoteId: string;
  status: QuoteStatus;
  deliveryFee: number;
  currency: 'TZS';
  expiresAt: string;   // ISO 8601
  pricingVersion: number;
  deliveryZone: DeliveryZone | null;
  breakdown: PricingBreakdown;
  unavailableReason?: string;
}

export class RequestDeliveryQuoteUseCase {
  constructor(
    private readonly pricingEngine: DeliveryPricingEngine,
    private readonly courierCostCalc: CourierCostCalculator,
    private readonly zoneClassifier: ZoneClassifier,
    private readonly routingProvider: RoutingProviderPort,
    private readonly quoteRepo: QuoteRepository,
    private readonly pricingConfigRepo: PricingConfigRepository
  ) {}

  async execute(request: DeliveryQuoteRequest): Promise<DeliveryQuoteResponse>;
}
```

### 9. QuotePricingController

```typescript
// services/logistics-service/src/api/controllers/quote-pricing.controller.ts

export class QuotePricingController {
  constructor(private readonly useCase: RequestDeliveryQuoteUseCase) {}

  async requestQuote(req: Request, res: Response): Promise<void>;
  async getQuote(req: Request, res: Response): Promise<void>;  // GET for internal use
}
```

### 10. QuoteValidationService (checkout-service)

An HTTP client in the checkout-service that calls logistics-service to validate a quote.

```typescript
// services/checkout-service/src/infrastructure/services/quote-validation.service.ts

export interface QuoteValidationResult {
  valid: boolean;
  deliveryFee?: number;
  pricingVersion?: number;
  rejectionReason?: 'NOT_FOUND' | 'EXPIRED' | 'CONSUMED' | 'DELIVERY_UNAVAILABLE';
}

export class QuoteValidationService {
  constructor(
    private readonly logisticsBaseUrl: string,
    private readonly httpClient: HttpClient
  ) {}

  async validate(quoteId: string): Promise<QuoteValidationResult>;
  async markConsumed(quoteId: string): Promise<void>;
}
```

### 11. AuditRecord

```typescript
// services/logistics-service/src/domain/entities/pricing-audit-record.entity.ts

export interface PricingAuditRecordData {
  id: string;
  orderId?: string;          // null until order placed, then set
  quoteId: string;
  pricingVersion: number;
  courierCompensationEstimate: number;
  buyerDeliveryFee: number;
  platformMarginAmount: number;
  deliveryZone: DeliveryZone | null;
  packageWeightKg: number;
  distanceKm: number;
  durationMinutes: number;
  recordedAt: Date;
}

export class PricingAuditRecord {
  // Immutable — no setters, no update method
  constructor(private readonly data: PricingAuditRecordData) {}
  // read-only getters only
  toJSON(): PricingAuditRecordData;
}
```

---

## Data Models

### Prisma Schema Additions

```prisma
// Appended to prisma/schema.prisma

model Logistics_Quote {
  id                          String   @id @db.VarChar(64)
  deliveryFee                 Decimal  @db.Decimal(12, 2)
  courierCompensationEstimate Decimal  @db.Decimal(12, 2)
  platformMarginAmount        Decimal  @db.Decimal(12, 2)
  pricingVersion              Int
  originLat                   Float
  originLng                   Float
  originAddress               String   @db.VarChar(500)
  destinationLat              Float
  destinationLng              Float
  destinationAddress          String   @db.VarChar(500)
  packageWeightKg             Float
  deliveryZone                String?  @db.VarChar(20)
  status                      String   @db.VarChar(20)   // ACTIVE | EXPIRED | CONSUMED | DELIVERY_UNAVAILABLE
  breakdown                   Json
  unavailableReason           String?
  issuedAt                    DateTime @default(now())
  expiresAt                   DateTime
  consumedAt                  DateTime?
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt

  auditRecord                 Logistics_PricingAuditRecord?

  @@index([status, expiresAt])
  @@index([issuedAt])
  @@map("logistics_quotes")
}

model Logistics_PricingConfig {
  version                      Int      @id               // monotonically increasing
  baseFee                      Decimal  @db.Decimal(12, 2)
  distanceRateTzsPerKm         Decimal  @db.Decimal(10, 4)
  timeRateTzsPerMinute         Decimal  @db.Decimal(10, 4)
  packageWeightTiers           Json                        // PackageWeightTier[]
  zoneMultipliers              Json                        // ZoneMultipliers
  operationalSurcharge         Json                        // OperationalSurchargeSchedule
  riskSurchargeRateCod         Decimal  @db.Decimal(6, 4)
  platformMarginPct            Decimal  @db.Decimal(6, 4)
  floorPriceTzs                Decimal  @db.Decimal(12, 2)
  ceilingPriceTzs              Decimal  @db.Decimal(12, 2)
  roundingIncrementTzs         Int
  quoteValiditySeconds         Int
  routingCacheTtlMs            Int
  isActive                     Boolean  @default(false)
  createdAt                    DateTime @default(now())

  @@index([isActive])
  @@map("logistics_pricing_configs")
}

model Logistics_PricingAuditRecord {
  id                          String    @id @db.VarChar(64)
  orderId                     String?   @db.VarChar(64)
  quoteId                     String    @unique @db.VarChar(64)
  pricingVersion              Int
  courierCompensationEstimate Decimal   @db.Decimal(12, 2)
  buyerDeliveryFee            Decimal   @db.Decimal(12, 2)
  platformMarginAmount        Decimal   @db.Decimal(12, 2)
  deliveryZone                String?   @db.VarChar(20)
  packageWeightKg             Float
  distanceKm                  Float
  durationMinutes             Float
  recordedAt                  DateTime  @default(now())

  quote                       Logistics_Quote @relation(fields: [quoteId], references: [id])

  @@index([orderId])
  @@index([pricingVersion])
  @@index([recordedAt])
  @@map("logistics_pricing_audit_records")
}
```

### Order Schema Extension

The existing `Order_Order` Prisma model needs two additional fields for audit traceability:

```prisma
// Added to Order_Order model (existing table: order_orders)
quoteId        String?  @db.VarChar(64)
pricingVersion Int?
```

### Checkout Session Extension

The existing `Checkout_CheckoutSession` (or equivalent) needs:

```prisma
quoteId        String?  @db.VarChar(64)
pricingVersion Int?
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: PricingConfig round-trip serialization

*For any* valid `PricingConfig` object, serializing it to JSON then deserializing it back and serializing again SHALL produce an identical JSON string.

**Validates: Requirements 1.8**

---

### Property 2: PricingVersion monotonic increase

*For any* sequence of N successive `PricingConfig` updates (N ≥ 2), the version assigned to update k+1 SHALL be strictly greater than the version assigned to update k.

**Validates: Requirements 1.3**

---

### Property 3: PricingVersion recorded on every quote

*For any* valid delivery quote request processed by `RequestDeliveryQuoteUseCase`, the returned `DeliveryQuoteResponse` SHALL contain a `pricingVersion` field equal to the version of the `PricingConfig` that was active at the time of computation.

**Validates: Requirements 1.4, 4.2**

---

### Property 4: Platform margin computation correctness

*For any* pair of (premarginFee ≥ 0, marginPct ∈ [0, 1]), the `DeliveryPricingEngine` SHALL compute `marginAmount = Math.round(premarginFee × marginPct)` and the `PricingBreakdown` SHALL reflect this exact value.

**Validates: Requirements 1.6**

---

### Property 5: Pipeline determinism (idempotence)

*For any* `PricingInput` and `PricingConfig`, calling `DeliveryPricingEngine.compute(input, config)` twice with the same arguments SHALL return identical `PricingResult` values.

**Validates: Requirements 2.9, 2.11, 4.12**

---

### Property 6: Floor/ceiling invariant

*For any* `PricingInput` and `PricingConfig` with `floorPrice ≤ ceilingPrice`, the `finalFee` in the resulting `PricingBreakdown` SHALL satisfy `finalFee ≥ floorPrice AND finalFee ≤ ceilingPrice`.

**Validates: Requirements 2.6, 2.7, 2.10**

---

### Property 7: Final fee divisible by rounding increment

*For any* valid `PricingInput` and `PricingConfig` with `roundingIncrement > 0`, the `finalFee` in the `PricingBreakdown` SHALL be a positive integer multiple of `roundingIncrement` (i.e., `finalFee % roundingIncrement === 0`).

**Validates: Requirements 2.8, 4.11**

---

### Property 8: Distance cost formula

*For any* `distanceKm ≥ 0` and `distanceRateTzsPerKm ≥ 0`, `DeliveryPricingEngine.stage2_distance` SHALL return exactly `distanceKm × distanceRateTzsPerKm`.

**Validates: Requirements 2.2**

---

### Property 9: Time cost formula

*For any* `durationMinutes ≥ 0` and `timeRateTzsPerMinute ≥ 0`, `DeliveryPricingEngine.stage3_time` SHALL return exactly `durationMinutes × timeRateTzsPerMinute`.

**Validates: Requirements 2.3**

---

### Property 10: Zone classification completeness for Tanzania coordinates

*For any* latitude ∈ [−11.7, −1.0] and longitude ∈ [29.3, 40.4] (Tanzania bounding box), `ZoneClassifier.classify` SHALL return a non-null `DeliveryZone` (one of `same_ward`, `same_district`, `same_region`, `cross_region`) and SHALL NOT return `unavailable: true`.

**Validates: Requirements 3.1, 3.6**

---

### Property 11: DELIVERY_UNAVAILABLE never carries a fee

*For any* `ZoneClassificationResult` where `unavailable === true`, the resulting `DeliveryQuoteResponse` SHALL have `deliveryFee` absent or null, and the `status` SHALL be `'DELIVERY_UNAVAILABLE'`.

**Validates: Requirements 3.3, 3.4**

---

### Property 12: Quote response completeness

*For any* valid `DeliveryQuoteRequest`, the returned `DeliveryQuoteResponse` SHALL contain all of: `quoteId`, `status`, `deliveryFee` (when not UNAVAILABLE), `currency`, `expiresAt`, `pricingVersion`, `deliveryZone`, and a `breakdown` containing all 14 pipeline-component fields.

**Validates: Requirements 4.2, 4.3, 5.1**

---

### Property 13: Quote uniqueness

*For any* N ≥ 2 concurrent or sequential calls to `RequestDeliveryQuoteUseCase.execute`, all returned `quoteId` values SHALL be distinct.

**Validates: Requirements 4.5**

---

### Property 14: Quote expiry time ordering

*For any* quote persisted by `RequestDeliveryQuoteUseCase`, `quote.issuedAt < quote.expiresAt` SHALL always hold, and `expiresAt − issuedAt ≈ config.quoteValiditySeconds` (within a 2-second tolerance).

**Validates: Requirements 4.6, 5.8**

---

### Property 15: Quote lifecycle state machine — initial state

*For any* quote created by `RequestDeliveryQuoteUseCase` (excluding DELIVERY_UNAVAILABLE results), `quote.status` SHALL be `'ACTIVE'` immediately after creation.

**Validates: Requirements 5.2**

---

### Property 16: Expired quotes always rejected at checkout

*For any* `quoteId` whose `expiresAt` is in the past, `QuoteValidationService.validate(quoteId)` SHALL return `{ valid: false, rejectionReason: 'EXPIRED' }`, and `InitiateCheckoutUseCase` SHALL return HTTP 422.

**Validates: Requirements 5.3, 5.4, 6.6**

---

### Property 17: Consumed quotes always rejected at checkout

*For any* `quoteId` whose `status === 'CONSUMED'`, any subsequent call to `QuoteValidationService.validate(quoteId)` SHALL return `{ valid: false, rejectionReason: 'CONSUMED' }`, and `InitiateCheckoutUseCase` SHALL return HTTP 422.

**Validates: Requirements 5.6, 6.8**

---

### Property 18: Server-authoritative delivery fee at checkout

*For any* order placement request that includes a valid `quoteId` and any arbitrary `shippingCost` value in the request body, the delivery fee recorded on the checkout session SHALL equal `quote.deliveryFee` — not the client-supplied value.

**Validates: Requirements 6.1, 6.4**

---

### Property 19: Missing quoteId always rejected at checkout

*For any* order placement request that omits the `quoteId` field, `InitiateCheckoutUseCase` SHALL return HTTP 422 with a descriptive error, regardless of payment method (COD, wallet, direct payment, etc.).

**Validates: Requirements 6.2, 6.10**

---

### Property 20: Audit record fee decomposition invariant

*For any* `PricingAuditRecord`, `buyerDeliveryFee = courierCompensationEstimate + platformMarginAmount` SHALL hold (prior to floor/ceiling/rounding adjustments — this relationship is recorded on the pre-clamp values).

**Validates: Requirements 7.4**

---

### Property 21: Road distance >= straight-line distance

*For any* two `GeoPoint` inputs passed to `RoutingCacheDecorator.getRoute` (which delegates to `MapsRoutingAdapter`), the returned `distanceKm` SHALL be greater than or equal to the straight-line geodesic distance computed by `GeoPoint.distanceTo()`.

**Validates: Requirements 8.7**

---

### Property 22: Route caching — second identical request returns cache source

*For any* origin/destination pair, when `RoutingCacheDecorator.getRoute` is called twice within the configured TTL, the second call SHALL return `source: 'cache'` and SHALL NOT invoke the underlying `MapsRoutingAdapter`.

**Validates: Requirements 8.3, 8.4, 11.4**

---

### Property 23: Earnings engine independence

*For any* `PricingConfig` configuration and any change to `CourierCostCalculator` `BASE_RATE`, `DISTANCE_RATE`, or `TIME_RATE` constants, the `deliveryFee` output of `DeliveryPricingEngine.compute` SHALL change if and only if the margin or other `PricingConfig` parameters are also changed.

*(Reformulated: holding `PricingConfig` constant and varying only courier rate constants SHALL NOT change `deliveryFee`.)*

**Validates: Requirements 9.4**

---

## Error Handling

### Quote Endpoint Error Matrix

| Condition | HTTP Status | Response body |
|-----------|-------------|---------------|
| Missing/invalid coordinates | 400 | `{ error: "INVALID_COORDINATES", message: "..." }` |
| Negative/zero weight | 400 | `{ error: "INVALID_WEIGHT", message: "weight must be > 0 kg" }` |
| Unauthenticated | 401 | standard JWT 401 |
| Rate limit exceeded | 429 | standard rate-limit response |
| Zone unresolvable | 200 | `{ status: "DELIVERY_UNAVAILABLE", unavailableReason: "...", quoteId: null }` |
| PricingConfig not found | 500 | `{ error: "PRICING_CONFIG_UNAVAILABLE", message: "..." }` |
| Routing timeout (fallback used) | 200 | normal response with `breakdown.routeSource: "fallback"` |

### Checkout Validation Error Matrix

| Condition | HTTP Status | Error code |
|-----------|-------------|------------|
| `quoteId` missing | 422 | `QUOTE_REQUIRED` |
| `quoteId` not found | 422 | `QUOTE_NOT_FOUND` |
| Quote expired | 422 | `QUOTE_EXPIRED` |
| Quote status DELIVERY_UNAVAILABLE | 422 | `DELIVERY_UNAVAILABLE` |
| Quote already consumed | 422 | `QUOTE_CONSUMED` |

### Fallback Strategy

When `MapsRoutingBridge` times out or throws, `MapsRoutingAdapter` catches the error and calls `DistanceCalculationAlgorithm.buildFallbackResult()`. The `RoutingResult` is returned with `source: 'fallback'`. The engine continues normally; the fallback is surfaced in `breakdown.routeSource` for transparency.

### PricingConfig Unavailable

If `PricingConfigRepository.getActive()` throws (no active config exists), `RequestDeliveryQuoteUseCase` returns HTTP 500. This is a misconfiguration and should trigger an alert.

---

## Testing Strategy

### Unit Tests (example-based)

Target the pipeline stages in isolation. Key examples:
- Correct distance cost for `distanceKm=5, rate=500` → `2500`
- Floor enforcement: input fee `1000`, floor `2000` → output `2000`
- Ceiling enforcement: input fee `50000`, ceiling `30000` → output `30000`
- Rounding: fee `4321`, increment `50` → output `4350`
- DELIVERY_UNAVAILABLE when both origin and destination resolve to null
- HTTP 400 on weight = 0 and weight = -1
- HTTP 400 on latitude > 90
- HTTP 422 on expired quoteId at checkout
- HTTP 422 on consumed quoteId at checkout
- Quote with incorrect `shippingCost` in body → checkout uses `quote.deliveryFee`

### Property-Based Tests

Use **fast-check** (already a Node.js ecosystem standard, no new dependency needed for this TypeScript project).

Each test is tagged: `Feature: delivery-pricing-engine, Property N: <property text>`

**Minimum 100 iterations per property** (fast-check default is 100, set `numRuns: 200` for Properties 5, 6, 7 which are critical invariants).

| Property | Generator inputs | Assertion |
|----------|-----------------|-----------|
| 1 (config round-trip) | arbitrary PricingConfigData | `JSON.stringify(deserialize(serialize(c))) === JSON.stringify(c)` |
| 3 (version on quote) | arbitrary DeliveryQuoteRequest | `response.pricingVersion === activeConfig.version` |
| 4 (margin computation) | `fc.float({min:0}), fc.float({min:0,max:1})` | `marginAmount === Math.round(premargin × pct)` |
| 5 (determinism) | arbitrary PricingInput | `engine.compute(i,c) deep-equals engine.compute(i,c)` |
| 6 (floor/ceiling) | arbitrary PricingInput with floor≤ceiling | `floor ≤ finalFee ≤ ceiling` |
| 7 (rounding) | arbitrary PricingInput, increment 50/100/200 | `finalFee % increment === 0` |
| 8, 9 (cost formulas) | `fc.float({min:0,max:500})` for distance/time | exact product equality |
| 10 (zone completeness) | `fc.float({min:-11.7,max:-1.0}), fc.float({min:29.3,max:40.4})` | zone is one of 4 valid strings |
| 11 (unavailable no fee) | arbitrary inputs producing unavailable result | `fee === null` |
| 14 (expiry ordering) | arbitrary quote creation params | `issuedAt < expiresAt` |
| 16 (expired rejection) | any expired quoteId | checkout returns 422 EXPIRED |
| 17 (consumed rejection) | any consumed quoteId | checkout returns 422 CONSUMED |
| 18 (server-authoritative fee) | any (quoteId, arbitrary clientCost) | `session.shippingCost === quote.deliveryFee` |
| 20 (audit invariant) | any completed order | `buyerFee === courierEst + marginAmt` |
| 21 (road >= straight-line) | arbitrary GeoPoints | `road >= geodesic` |
| 22 (cache dedup) | any GeoPoint pair | second call has source `'cache'` |

### Integration Tests

- POST `/api/logistics/v1/quote` — end-to-end with real Prisma
- Checkout flow with valid quoteId transitions quote to CONSUMED
- Checkout flow with expired quoteId returns 422
- `PricingConfigRepository.save()` then `getActive()` returns same config
- Settlement service reads AuditRecord correctly

### Performance Tests

- Pipeline-only benchmark (no I/O): assert `< 10ms` per call for 1000 iterations
- Quote endpoint with warmed cache: assert p95 `< 200ms` under simulated 50 RPS
