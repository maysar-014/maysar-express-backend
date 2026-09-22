# Maysar Order Service — Implementation Reference (As-Built)

> **Status:** Live and verified — full order lifecycle, COD trust model (dual-axis 5-tier), saga orchestration, seller stock verification, master order aggregation.
> **Last updated:** September 2026
> **Scope:** `services/order-service` + `prisma/schema.prisma` (`Order_*` models)

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **COD trust is dual-axis** | `deriveTier(score, lifetimeCODValue)` — both behavioral score AND lifetime value must meet thresholds simultaneously |
| **Exposure limits are hard gates** | `PlaceOrderUseCase` calls `getExposureLimit(tier)` and rejects if `activeExposure + orderAmount > limit` |
| **NEW_BUYER COD cap is TZS 30,000** | `getExposureLimit('NEW_BUYER') = 30_000` — enforced in `trust-score.functions.ts` |
| **Concurrent order limits are tier-gated** | `getConcurrentOrderLimit(tier)` — NEW_BUYER: 1, TRUSTED_BEGINNER: 2, TRUSTED_BUYER: 3, GOLD_BUYER: 5, PLATINUM_BUYER: unlimited |
| **Geographic radius is tier-gated** | NEW_BUYER: 24km Haversine from seller ward centroid; TRUSTED_BEGINNER: 50km; TRUSTED_BUYER+: region/nationwide |
| **Score replay is deterministic** | `replayScore(events)` replays from 0 — legacy `COURIER_NEGATIVE_REPORT` mapped to -5 for backward compat |
| **Order cancellation fully restores wallet** | Saga compensation in `OrderFulfillmentSaga` reverses all wallet debits on cancel |
| **Seller stock verification is time-bounded** | `VerificationTimeoutJob` auto-declines unverified stock after configurable window |

---

## 2. COD Trust Model

### 2.1 Tier derivation (`domain/engines/cod-trust/trust-score.functions.ts`)

Both axes must be satisfied simultaneously:

| Tier | Score threshold | Lifetime COD value |
|---|---|---|
| `PLATINUM_BUYER` | ≥ 85 | ≥ TZS 10,000,000 |
| `GOLD_BUYER` | ≥ 65 | ≥ TZS 2,000,000 |
| `TRUSTED_BUYER` | ≥ 41 | ≥ TZS 500,000 |
| `TRUSTED_BEGINNER` | ≥ 21 | ≥ TZS 100,000 |
| `NEW_BUYER` | all others | — |

### 2.2 Exposure limits

| Tier | Max active COD exposure | Max concurrent orders | Radius |
|---|---|---|---|
| `NEW_BUYER` | TZS 30,000 | 1 | 24 km |
| `TRUSTED_BEGINNER` | TZS 150,000 | 2 | 50 km |
| `TRUSTED_BUYER` | TZS 500,000 | 3 | same region |
| `GOLD_BUYER` | TZS 2,000,000 | 5 | nationwide |
| `PLATINUM_BUYER` | TZS 10,000,000 | unlimited | nationwide |

### 2.3 Signal weights (`trust-signal.types.ts`)

Trust score starts at 0, clamped to [0, 100]. Key signals:

| Signal | Delta |
|---|---|
| `SUCCESSFUL_DELIVERY` | +10 |
| `PAYMENT_ON_DELIVERY` | +5 |
| `REPEAT_PURCHASE` | +3 |
| `COURIER_UNREACHABLE_CUSTOMER` | -5 |
| `REFUSED_DELIVERY` | -15 |
| `FRAUDULENT_ORDER` | -30 |

### 2.4 Identity graph (`domain/engines/cod-trust/identity-graph.service.ts`)

Links buyer identities across phone numbers, devices, and addresses to detect shared-identity fraud rings. A flagged identity graph member can block COD access for all linked accounts.

### 2.5 Per-order risk assessment (`domain/engines/cod-trust/per-order-risk.assessor.ts`)

Runs on every COD order placement. Outputs: `requiresCommitmentFee`, `requiresManualReview`, `commitmentFeeAmount`. High-risk orders may require a wallet commitment fee equal to the delivery fee.

---

## 3. Domain Model

### 3.1 Order Entity (`domain/entities/order.entity.ts`)

```
OrderStatus: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → COMPLETED
                    ↘ CANCELLED (from PENDING | CONFIRMED | PROCESSING)
                    ↘ FAILED
```

Key fields: `orderId`, `masterOrderId`, `buyerId`, `sellerId`, `items[]`, `totalAmount`, `deliveryAddress`, `paymentMethod`, `paymentStatus`, `deliveryStatus`, `codTrustTier`, `shippingCost`, `quoteId`.

### 3.2 Master Order (`domain/repositories/master-order.repository.ts`)

Aggregates multiple seller orders from a single checkout session. `MasterOrderStatusEngine` derives the master status from constituent order statuses.

### 3.3 Value Objects

| Value Object | Enforces |
|---|---|
| `Money` | Positive amount, valid currency, TZS precision |
| `Address` | Required city + region; street optional |

---

## 4. Domain Engines

| Engine | File | Purpose |
|---|---|---|
| `CODEligibilityEngine` | `domain/engines/cod-eligibility.engine.ts` | Buyer verified + reputation + area support + cross-region check |
| `ProgressiveCODEligibilityEngine` | `domain/engines/progressive-cod-eligibility.engine.ts` | Full dual-axis tier + exposure + concurrent + radius checks |
| `ValidationEngine` | `domain/engines/validation.engine.ts` | Order field validation, item quantity, address completeness |
| `PricingEngine` | `domain/engines/pricing.engine.ts` | Order total calculation, discount application |
| `SettlementEngine` | `domain/engines/settlement.engine.ts` | Post-delivery settlement amount calculation |
| `WorkflowEngine` | `domain/engines/workflow.engine.ts` | Order state transition rules |
| `InventoryEngine` | `domain/engines/inventory.engine.ts` | Stock availability checks |
| `MasterOrderStatusEngine` | `domain/engines/master-order-status.engine.ts` | Derives master order status from constituent orders |

---

## 5. Application Layer (Use Cases)

| Use case | What it does |
|---|---|
| `CreateOrderUseCase` | Validates items, checks inventory, creates order in PENDING |
| `PlaceOrderUseCase` | COD eligibility check → exposure check → wallet debit/hold → emit `order.placed` |
| `BuyerConfirmCheckoutUseCase` | Confirms checkout session → creates order(s) |
| `CancelOrderUseCase` | Policy check → cancel → saga compensation (wallet restore) |
| `SellerVerifyStockUseCase` | Seller confirms stock availability → order moves to CONFIRMED |
| `SellerDeclineStockUseCase` | Seller declines → order cancelled → wallet restored |
| `ResolveCODDisputeUseCase` | Admin resolves COD delivery dispute |
| `AdminOrderActionsUseCase` | Admin force-cancel, force-complete, override status |
| `MarkOrdersOverdueUseCase` | Scheduled job — marks unverified orders as overdue |

---

## 6. Sagas

### 6.1 OrderFulfillmentSaga (`application/sagas/order-fulfillment.saga.ts`)

The main order lifecycle saga:

```
PlaceOrder → ReserveInventory → ProcessPayment → CreateShipment → AwaitDelivery → Settle
     ↓ (any step fails)
Compensate: ReleaseInventory → RefundPayment → RestoreWallet
```

### 6.2 PaymentSaga (`application/sagas/payment.saga.ts`)

Handles payment processing with retry and compensation.

### 6.3 SettlementSaga (`application/sagas/settlement.saga.ts`)

Post-delivery: releases payment to seller wallet, records commission.

### 6.4 TrainingSaga (`application/sagas/training.saga.ts`)

Triggers training certification checks for courier on first delivery.

---

## 7. HTTP Surface

Mounted at `/api/order`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/order/orders` | buyer JWT | Create order |
| GET  | `/api/order/orders` | buyer JWT | List buyer orders |
| GET  | `/api/order/orders/:orderId` | JWT | Order detail |
| POST | `/api/order/orders/:orderId/cancel` | buyer JWT | Cancel order |
| POST | `/api/order/orders/:orderId/verify-stock` | seller JWT | Confirm stock |
| POST | `/api/order/orders/:orderId/decline-stock` | seller JWT | Decline stock |
| GET  | `/api/order/master-orders/:masterOrderId` | buyer JWT | Master order detail |
| GET  | `/api/order/seller/orders` | seller JWT | Seller order inbox |
| POST | `/api/order/cod/check-eligibility` | buyer JWT | Check COD eligibility |
| POST | `/api/order/cod/disputes` | buyer JWT | Raise COD dispute |
| POST | `/api/order/cod/disputes/:disputeId/resolve` | admin JWT | Resolve dispute |
| GET  | `/api/order/admin/orders` | admin JWT | Admin order list |
| POST | `/api/order/admin/orders/:orderId/actions` | admin JWT | Admin order actions |
| GET  | `/api/order/health/live` | none | Health check |

---

## 8. Events

| Event | Emitted by | Payload |
|---|---|---|
| `order.placed` | `PlaceOrderUseCase` | `orderId, masterOrderId, buyerId, sellerId, totalAmount, paymentMethod` |
| `order.confirmed` | `SellerVerifyStockUseCase` | `orderId, sellerId` |
| `order.cancelled` | `CancelOrderUseCase` | `orderId, reason, refundAmount` |
| `order.delivered` | Delivery confirmation handler | `orderId, deliveredAt` |
| `order.completed` | `SettlementSaga` | `orderId, settlementAmount` |
| `cod.trust_signal` | Various | `buyerId, signalType, delta, newScore` |

Events consumed:
- `payment.completed` → advance order to CONFIRMED
- `delivery.completed` → advance order to DELIVERED → trigger settlement
- `inventory.reserved` → saga step confirmation
- `inventory.reservation_failed` → saga compensation

---

## 9. Verification Evidence

| Artifact | What it proves |
|---|---|
| `__tests__/cod-trust/trust-score-functions.pbt.test.ts` | Property-based tests: tier derivation invariants, score clamping |
| `__tests__/cod-trust/progressive-cod-eligibility.test.ts` | Exposure limits, concurrent order limits, radius gates |
| `application/use-cases/__tests__/place-order.use-case.test.ts` | COD rejection at TZS 30,001 for NEW_BUYER |
| `application/use-cases/__tests__/cancel-order.use-case.test.ts` | Wallet restoration on cancel |
| `application/sagas/__tests__/order-fulfillment.saga.test.ts` | Full saga + compensation |
| E2E Postman P0 suite | COD rejection, cancel-restore, end-to-end wallet order |


---

## System Maintenance Routes

Mounted at `/api/order/system/maintenance`. Guards: `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/order/system/maintenance/cleanup/outbox/report` | Dry-run count of deletable order outbox events |
| POST | `/api/order/system/maintenance/cleanup/outbox` | Batched deletion of expired outbox events. Body: `{ "dryRun": true }` to simulate |

**Retention defaults:** sent/processed → 7 days, failed → 30 days. Batch size: 1000. Max runtime: 20 s.
