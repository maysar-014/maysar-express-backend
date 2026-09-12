# Maysar Checkout Service — Implementation Reference (As-Built)

> **Status:** Live and verified — cart management, single-seller and multi-seller checkout, logistics quote validation, price lock, COD pre-auth.
> **Last updated:** September 2026
> **Scope:** `services/checkout-service` + logistics integration via `globalThis.__lockFulfillmentPrice`

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **Client-supplied shippingCost is ignored** | `InitiateCheckoutUseCase` stores the server-authoritative `session.shippingCost` from the validated quote — a buyer cannot set `shippingCost: 0` |
| **quoteId is required at checkout initiation** | `InitiateCheckoutUseCase` validates the quote via `QuoteValidationService` before creating the session |
| **Quote is consumed only after session save** | Single-use consume happens after successful session persistence — no orphaned consumed quotes |
| **Multi-seller routing is automatic** | `MultiSellerCheckoutUseCase` is invoked when `sellerQuotes` spans >1 seller; verified by `multi-seller-routing.controller.test.ts` |
| **Multi-seller validation is all-or-nothing** | One invalid quote in a multi-seller checkout → 422 with `sellerId` — no partial sessions |
| **Price lock is written at confirmation** | `__lockFulfillmentPrice` creates a `FulfillmentCommitment` for both single and multi-seller paths |
| **Delivery window preference is validated** | `FLEXIBLE | STANDARD | EXPRESS` — invalid value → 400 with field error |

---

## 2. Domain Model

### 2.1 Cart Value Object (`domain/value-objects/cart.value-object.ts`)

Immutable cart representation. Fields: `items[]`, `sellerId`, `subtotal`, `currency`. Validates: non-empty items, positive quantities, positive prices.

### 2.2 CheckoutSession (Prisma model)

Fields: `sessionId`, `buyerId`, `cartSnapshot`, `shippingCost` (server-authoritative), `quoteId`, `pricingVersion`, `paymentMethod`, `deliveryWindowPreference`, `status`, `expiresAt`.

Session statuses: `ACTIVE → CONFIRMED | EXPIRED | ABANDONED`.

### 2.3 Pricing Policy (`domain/policies/pricing.policy.ts`)

Validates that the checkout total matches the sum of item prices + server-authoritative shipping cost. Client-supplied totals are rejected.

---

## 3. Application Layer (Use Cases)

### 3.1 GetDeliveryOptionsUseCase

Called before checkout initiation to show delivery options to the buyer.

- Calls `__consolidationOrchestrator` (logistics service hook)
- Returns `{ groups: [], totalDeliveryFee: 0, consolidationSavingsTzs: 0 }` gracefully when no quotes exist yet
- Each group contains fulfillment options ranked by the logistics `OptionRankingEngine`

### 3.2 InitiateCheckoutUseCase

Single-seller checkout initiation:

1. Validate cart (non-empty, positive prices)
2. Validate `quoteId` via `QuoteValidationService` — fetches from logistics service
3. Store server-authoritative `shippingCost` from quote (ignore client value)
4. Validate `deliveryWindowPreference` if provided
5. Reserve inventory via `InventoryReservationService`
6. Create checkout session
7. Consume quote (single-use)

### 3.3 MultiSellerCheckoutUseCase

Multi-seller checkout:

1. Validate all `sellerQuotes` — all-or-nothing (one failure → 422 with `sellerId`)
2. Per-seller inventory reservation
3. Create per-seller checkout sessions
4. Consume all quotes atomically

### 3.4 ConfirmCheckoutUseCase (via controller)

1. Validate session is ACTIVE and not expired
2. Call `__lockFulfillmentPrice` → creates `FulfillmentCommitment`
3. Create order(s) via order service
4. Mark session CONFIRMED

---

## 4. Logistics Integration

The checkout service integrates with logistics via `globalThis` hooks set by the logistics module at init:

| Hook | Used by | Purpose |
|---|---|---|
| `__consolidationOrchestrator` | `GetDeliveryOptionsUseCase` | Get ranked fulfillment options |
| `__createOrderShipments` | Confirm controller | Create shipments after order creation |
| `__lockFulfillmentPrice` | Confirm controller | Write `FulfillmentCommitment` price lock |

The `QuoteValidationService` calls `GET /api/logistics/internal/quotes/:quoteId` to validate and then `PATCH /api/logistics/internal/quotes/:quoteId/consume` to consume.

---

## 5. HTTP Surface

Mounted at `/api/checkout`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/checkout/delivery-options` | JWT | Get ranked delivery options |
| POST | `/api/checkout/cart` | JWT | Add/update cart |
| GET  | `/api/checkout/cart` | JWT | Get current cart |
| DELETE | `/api/checkout/cart/:itemId` | JWT | Remove cart item |
| POST | `/api/checkout/initiate` | JWT | Initiate checkout session |
| POST | `/api/checkout/multi-seller/initiate` | JWT | Multi-seller checkout |
| POST | `/api/checkout/confirm` | JWT | Confirm checkout → create order |
| GET  | `/api/checkout/session/:sessionId` | JWT | Session status |
| GET  | `/api/checkout/health/live` | none | Health check |

---

## 6. Delivery Window Preferences

| Value | Mapped to | Window |
|---|---|---|
| `FLEXIBLE` | Generous next-day | ~24 hours |
| `STANDARD` | 4-hour window | Same day |
| `EXPRESS` | 2-hour window | Same day |

---

## 7. Events

| Event | Emitted by | Payload |
|---|---|---|
| `checkout.initiated` | `InitiateCheckoutUseCase` | `sessionId, buyerId, cartSnapshot, shippingCost` |
| `checkout.confirmed` | Confirm controller | `sessionId, orderId, masterOrderId` |
| `checkout.abandoned` | Expiry job | `sessionId, buyerId` |

---

## 8. Verification Evidence

| Artifact | What it proves |
|---|---|
| `api/controllers/__tests__/multi-seller-routing.controller.test.ts` | Multi-seller routing when >1 seller |
| `domain/__tests__/checkout.security.test.ts` | Client shippingCost ignored |
| `application/use-cases/__tests__/initiate-checkout.use-case.test.ts` | Quote validation, inventory reservation |
| `application/use-cases/__tests__/multi-seller-checkout.use-case.test.ts` | All-or-nothing validation |
| `tests/integration/multi-seller-consolidation.integration.test.ts` | Multi-seller consolidation (4/4) |
