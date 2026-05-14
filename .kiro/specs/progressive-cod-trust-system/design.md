# Progressive COD Trust System — Design Document

## Overview

The Progressive COD Trust System replaces the current fixed "3 successful orders" COD eligibility gate with a dynamic, score-based trust model. Every buyer has a persistent `COD_Eligibility_Score` (0–100) that grows with positive trust signals and shrinks with negative ones. The score determines a `Trust_Tier`, and each tier enforces its own order-value cap, geographic constraints, and concurrency limits.

The new `ProgressiveCODEligibilityEngine` is a **drop-in replacement** for the existing `CODEligibilityEngine` — it implements the same three-method interface (`checkBuyerEligibility`, `checkSellerEligibility`, `checkOrderEligibility`) so `PlaceOrderUseCase` requires no structural changes.

---

## Architecture Overview

```
PlaceOrderUseCase
    │
    ├── checkBuyerEligibility(buyerId)
    ├── checkSellerEligibility(sellerId)
    └── checkOrderEligibility(order, sellerAddress)
            │
            ▼
  ProgressiveCODEligibilityEngine          ← new, replaces CODEligibilityEngine
    │
    ├── CODTrustScoreRepository            ← reads/writes order_CODTrustScore
    ├── CODScoreEventRepository            ← appends to order_CODScoreEvent
    ├── CODRestrictionRepository           ← reads order_CODRestriction
    ├── IAuthServiceClient                 ← existing (seller verification)
    └── ILogisticsServiceClient            ← existing (area support check)

TrustSignalIngestionService               ← new, called by other services
    │
    └── CODTrustScoreRepository + CODScoreEventRepository
```

---

## Data Model

### New Prisma Tables

```prisma
model order_CODTrustScore {
  id          String   @id @default(cuid()) @db.VarChar(64)
  buyerId     String   @unique @db.VarChar(64)
  score       Int      @default(0)           // 0–100
  tier        String   @default("NEW_BUYER") // NEW_BUYER | TRUSTED_BEGINNER | TRUSTED_BUYER
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  @@index([buyerId])
  @@map("order_cod_trust_scores")
}

model order_CODScoreEvent {
  id            String   @id @default(cuid()) @db.VarChar(64)
  buyerId       String   @db.VarChar(64)
  signalType    String   @db.VarChar(64)     // e.g. SUCCESSFUL_DELIVERY
  delta         Int                           // positive or negative
  scoreBefore   Int
  scoreAfter    Int
  sourceService String   @db.VarChar(64)     // e.g. order-service
  sourceEntityId String  @db.VarChar(64)     // e.g. orderId
  createdAt     DateTime @default(now())

  @@index([buyerId, createdAt])
  @@map("order_cod_score_events")
}

model order_CODRestriction {
  id        String   @id @default(cuid()) @db.VarChar(64)
  buyerId   String   @db.VarChar(64)
  reason    String
  startAt   DateTime @default(now())
  endsAt    DateTime
  permanent Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([buyerId, endsAt])
  @@map("order_cod_restrictions")
}
```

---

## Trust Signal Weight Table

| Signal Type                  | Delta | Trigger                                              |
|------------------------------|-------|------------------------------------------------------|
| `SUCCESSFUL_DELIVERY`        | +8    | COD order confirmed delivered by courier             |
| `PHONE_VERIFIED`             | +5    | Buyer's phone number verified in auth service        |
| `HIGH_VALUE_COMPLETION`      | +10   | COD order > TZS 100,000 successfully delivered       |
| `ACCOUNT_AGE_MILESTONE`      | +7    | Account reaches 180 days without suspension          |
| `POST_DISPATCH_CANCELLATION` | -10   | Buyer cancels after order dispatched                 |
| `DELIVERY_REFUSED`           | -15   | Courier reports buyer refused delivery               |
| `DISPUTE_LOST`               | -12   | Dispute resolved against buyer                       |
| `COURIER_NEGATIVE_REPORT`    | -8    | Courier submits negative behavioural report          |

Score is always clamped to [0, 100] after applying any delta.

---

## Trust Tier Classification

| Score Range | Tier               | COD Limit    | Geographic Constraint      | Max Active COD Orders |
|-------------|--------------------|--------------|-----------------------------|----------------------|
| 0–20        | `NEW_BUYER`        | TZS 30,000   | Same city as seller only    | 1                    |
| 21–40       | `TRUSTED_BEGINNER` | TZS 150,000  | None                        | Unlimited            |
| 41–100      | `TRUSTED_BUYER`    | Unlimited    | None                        | Unlimited            |

Tier is derived from score on every read — it is not stored independently (the `tier` column in `order_CODTrustScore` is a denormalised cache updated atomically with the score).

---

## Component Design

### ProgressiveCODEligibilityEngine

```typescript
export class ProgressiveCODEligibilityEngine {
  constructor(
    private readonly trustScoreRepo: ICODTrustScoreRepository,
    private readonly restrictionRepo: ICODRestrictionRepository,
    private readonly orderRepo: OrderRepository,           // for active COD order count
    private readonly authService: IAuthServiceClient,      // seller verification
    private readonly logisticsService: ILogisticsServiceClient
  ) {}

  async checkBuyerEligibility(buyerId: string): Promise<EligibilityResult>
  async checkSellerEligibility(sellerId: string): Promise<EligibilityResult>
  async checkOrderEligibility(order: Order, sellerAddress: any): Promise<EligibilityResult>
}
```

#### checkBuyerEligibility(buyerId)

1. Load `order_CODRestriction` for `buyerId` where `endsAt > now()` OR `permanent = true`
2. If active restriction found → return `{ eligible: false, reason: 'COD temporarily restricted: <reason>' }`
3. If permanent restriction → return `{ eligible: false, reason: 'COD_PERMANENTLY_DISABLED' }`
4. Load `order_CODTrustScore` for `buyerId` (default score = 0 if not found)
5. Derive tier from score
6. Return `{ eligible: true, tier, score, codLimit }`

#### checkSellerEligibility(sellerId)

1. Call `authService.isUserVerified(sellerId)`
2. If not verified → return `{ eligible: false, reason: 'SELLER_NOT_VERIFIED' }`
3. Return `{ eligible: true }`

(Seller COD-disabled flag is a future extension — not in scope for v1.)

#### checkOrderEligibility(order, sellerAddress)

1. Load buyer's trust score and tier (via `trustScoreRepo`)
2. **Value check**: if `order.totalAmount > tier.codLimit` → ineligible with limit reason
3. **Geographic check** (NEW_BUYER only): if `order.deliveryAddress.city !== sellerAddress.city` → ineligible
4. **Concurrency check** (NEW_BUYER only): count active COD orders for buyer → if ≥ 1 → ineligible
5. **Area support check**: call `logisticsService.isCODSupportedInArea(order.deliveryAddress)` → if false → ineligible
6. **High-risk item check**: check `product.codAccepted` flag from catalogue (already on `Product` model) → if any item has `codAccepted = false` → ineligible with `HIGH_RISK_ITEM`
7. All checks pass → return `{ eligible: true }`

Fail-fast: return on first failing check.

---

### TrustSignalIngestionService

Called by other services (order-service, auth-service, logistics-service) to record trust signal events.

```typescript
export class TrustSignalIngestionService {
  constructor(
    private readonly trustScoreRepo: ICODTrustScoreRepository,
    private readonly scoreEventRepo: ICODScoreEventRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  async recordSignal(dto: {
    buyerId: string;
    signalType: TrustSignalType;
    sourceService: string;
    sourceEntityId: string;
  }): Promise<void>
}
```

**recordSignal flow:**
1. Validate `buyerId` exists (reject with error if unknown)
2. Look up delta from `SIGNAL_WEIGHTS` map
3. Load current score (default 0)
4. Compute `newScore = clamp(currentScore + delta, 0, 100)`
5. Derive new tier from `newScore`
6. Persist `order_CODScoreEvent` (immutable append)
7. Upsert `order_CODTrustScore` with `newScore` and `tier` (atomic with score event in a DB transaction)
8. Publish `CODScoreUpdated` domain event: `{ buyerId, newScore, newTier, timestamp }`
9. If persistence fails → do NOT publish event, return error

---

### Score Computation (Pure Function)

```typescript
const SIGNAL_WEIGHTS: Record<TrustSignalType, number> = {
  SUCCESSFUL_DELIVERY:        +8,
  PHONE_VERIFIED:             +5,
  HIGH_VALUE_COMPLETION:      +10,
  ACCOUNT_AGE_MILESTONE:      +7,
  POST_DISPATCH_CANCELLATION: -10,
  DELIVERY_REFUSED:           -15,
  DISPUTE_LOST:               -12,
  COURIER_NEGATIVE_REPORT:    -8,
};

function applySignal(currentScore: number, signal: TrustSignalType): number {
  const delta = SIGNAL_WEIGHTS[signal];
  return Math.max(0, Math.min(100, currentScore + delta));
}

function deriveTier(score: number): TrustTier {
  if (score <= 20) return 'NEW_BUYER';
  if (score <= 40) return 'TRUSTED_BEGINNER';
  return 'TRUSTED_BUYER';
}

function getCODLimit(tier: TrustTier): number | null {
  if (tier === 'NEW_BUYER')        return 30_000;
  if (tier === 'TRUSTED_BEGINNER') return 150_000;
  return null; // unlimited
}
```

These are pure functions — no I/O, fully testable with property-based tests.

---

## Correctness Properties

### Property 1: Score Round-Trip (Event Sourcing)
For any sequence of `TrustSignalType[]` applied to a buyer starting from score 0, replaying the `order_CODScoreEvent` log must reproduce the current `order_CODTrustScore.score` exactly.

```
∀ events: ScoreEvent[], replay(events) === currentScore
```

### Property 2: Tier Completeness (No Gaps, No Overlaps)
For all integers in [0, 100], `deriveTier(score)` returns exactly one tier.

```
∀ score ∈ [0, 100]: deriveTier(score) ∈ { NEW_BUYER, TRUSTED_BEGINNER, TRUSTED_BUYER }
  AND exactly one tier matches
```

### Property 3: Score Bounds
For any starting score and any signal, `applySignal` always returns a value in [0, 100].

```
∀ score ∈ [0, 100], ∀ signal: applySignal(score, signal) ∈ [0, 100]
```

### Property 4: Eligibility Idempotence
Given the same score, tier, and restriction state, `checkBuyerEligibility` always returns the same result.

```
∀ (score, tier, restrictions): checkBuyerEligibility(buyerId) is deterministic
```

### Property 5: Confluence (Check Ordering)
For any order where all individual checks pass, `checkOrderEligibility` returns eligible regardless of check execution order.

---

## Integration Points

### Signal Sources

| Signal                       | Source Service    | Trigger Event                          |
|------------------------------|-------------------|----------------------------------------|
| `SUCCESSFUL_DELIVERY`        | order-service     | `OrderDelivered` event                 |
| `PHONE_VERIFIED`             | auth-service      | `PhoneVerified` event                  |
| `HIGH_VALUE_COMPLETION`      | order-service     | `OrderDelivered` where amount > 100k   |
| `ACCOUNT_AGE_MILESTONE`      | auth-service      | Scheduled job at 180-day mark          |
| `POST_DISPATCH_CANCELLATION` | order-service     | `OrderCancelled` after dispatch        |
| `DELIVERY_REFUSED`           | logistics-service | `CourierReportSubmitted` (REFUSED)     |
| `DISPUTE_LOST`               | order-service     | `DisputeResolved` (buyer at fault)     |
| `COURIER_NEGATIVE_REPORT`    | logistics-service | `CourierReportSubmitted` (NEGATIVE)    |

### Temporary Restriction API

Operators and automated fraud rules can apply restrictions via:

```typescript
async applyRestriction(dto: {
  buyerId: string;
  reason: string;
  durationHours: number;  // 0 = permanent
}): Promise<void>
```

Stored in `order_CODRestriction`. Auto-expires when `endsAt < now()` — no cron job needed, checked at eligibility time.

---

## Migration Strategy

1. Add new Prisma tables (`order_CODTrustScore`, `order_CODScoreEvent`, `order_CODRestriction`) via migration
2. Seed initial scores: all existing buyers start at score 0 (New_Buyer tier) — this is intentionally conservative
3. Backfill: for each buyer with ≥ 1 historical successful delivery, apply `SUCCESSFUL_DELIVERY` signal retroactively via a one-time migration script
4. Swap `CODEligibilityEngine` → `ProgressiveCODEligibilityEngine` in DI wiring (`src/main.ts` and `index.ts`)
5. Remove the old `MIN_SUCCESSFUL_ORDERS = 3` and `MIN_REPUTATION_SCORE = 50` constants

The old `CODEligibilityEngine` is kept in the codebase but no longer wired — it can be deleted in a follow-up cleanup PR.

---

## Testing Strategy

### Unit Tests (Pure Functions)
- `applySignal`: property-based test over all score × signal combinations — verify bounds [0, 100]
- `deriveTier`: exhaustive test over all integers [0, 100] — verify no gaps/overlaps
- `getCODLimit`: verify correct limits per tier

### Integration Tests
- `checkBuyerEligibility`: new buyer (score 0) → eligible; restricted buyer → ineligible; permanently disabled → ineligible
- `checkOrderEligibility`: New_Buyer with order > TZS 30k → ineligible; same buyer with order ≤ TZS 30k → eligible; cross-city delivery for New_Buyer → ineligible
- `recordSignal`: verify score persisted, event appended, domain event published; verify round-trip replay

### Property-Based Tests
- Score round-trip: generate random signal sequences, replay events, verify score matches
- Tier completeness: generate random scores [0, 100], verify exactly one tier assigned
- Score bounds: generate random (score, signal) pairs, verify result always in [0, 100]
