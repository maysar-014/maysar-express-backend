# Per-Seller Quote Request Flow (Multi-Seller Checkout)

> Backlog reference: `LOGISTICS_ENGINE_BACKLOG.md` §1.4 — "Define per-seller quote request flow"  
> Status: Implemented and verified by `services/checkout-service/src/api/controllers/__tests__/multi-seller-routing.controller.test.ts`  
> Last updated: September 2026

> **Note (Phase 4+):** a newer, fuller alternative exists — `POST /api/logistics/v1/fulfillment-options` generates ranked options (including `MAYSAR_SHARED` / `MAYSAR_EXPRESS` / `CUSTOMER_PICKUP`) per buyer, feasibility-gated and fairness-filtered. This per-seller `quote` flow remains the backward-compatible single-seller path and the per-seller-consolidation primitive the multi-seller checkout still consumes. See [`LOGISTICS_IMPLEMENTATION.md`](./LOGISTICS_IMPLEMENTATION.md) §6.1.

---

## Overview

A multi-seller checkout requires **one delivery quote per seller**, because each seller
ships from a different pickup location. Quotes are obtained from the Logistics Service
**before** the buyer confirms checkout, and the confirm request carries the full
per-seller quote map. The server re-validates every quote at confirm time — a client
can never assert its own shipping cost.

**Invariants enforced server-side:**

1. `shippingCost` sent by the client is **never trusted** (backlog §1.2). Every fee is
   read from a validated, `ACTIVE` quote.
2. A quote is single-use: `markConsumed` runs after the order transaction commits; a
   reused `quoteId` is rejected with `QUOTE_CONSUMED`.
3. `MultiSellerCheckoutUseCase` validates **all** seller quotes before placing any
   order — one invalid quote aborts the whole checkout with `422` and the offending
   `sellerId`.

---

## API Sequence

```
Buyer App                     Checkout Service                Logistics Service
   │                                │                                │
   │ POST /api/checkout/initiate    │                                │
   │  (cartId, addresses,           │                                │
   │   per-seller quoteIds*)        │                                │
   │───────────────────────────────>│ validate each quoteId          │
   │                                │───────────────────────────────>│
   │                                │   GET /internal/quotes/:id     │
   │                                │<─── deliveryFee, pricingVersion│
   │                                │ session.shippingCost = Σ fees  │
   │<──── session (server-priced) ──│                                │
   │                                │                                │
   │ POST /api/logistics/v1/quote   │                                │
   │  per seller (if not done yet)  │                                │
   │───────────────────────────────────────────────────────────────>│
   │<──── quoteId, deliveryFee, breakdown (per seller) ────────────│
   │                                │                                │
   │ POST /api/checkout/:id/confirm │                                │
   │  { paymentMethodId,            │                                │
   │    sellerQuotes: {             │                                │
   │      sellerA: { quoteId },     │                                │
   │      sellerB: { quoteId } } }  │                                │
   │───────────────────────────────>│                                │
   │                                │ MultiSellerCheckoutUseCase:    │
   │                                │  1. validate ALL quotes        │
   │                                │  2. tx: PlaceOrder × N sellers │
   │                                │  3. tx: create MasterOrder     │
   │                                │  4. markConsumed × N           │
   │<── masterOrderId, orders[] ────│                                │
```

\* On `initiate`, each seller group's `quoteId` is validated and the
server-authoritative fee is stored on the session; the client-supplied `shippingCost`
is accepted for backward compatibility but ignored.

---

## Step 1 — Obtain one quote per seller

`POST /api/logistics/v1/quote` is called once per seller group, using the **seller's
pickup location as origin** and the buyer's delivery address as destination:

```ts
// Buyer app — one call per seller in the cart
const sellerQuotes: Record<string, { quoteId: string }> = {};

for (const group of sellersInCart) {
  const res = await fetch('https://api.maysar.com/api/logistics/v1/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      originLat: group.pickupLat,          // seller's primary location
      originLng: group.pickupLng,
      originAddress: group.pickupAddress,
      destinationLat: buyer.lat,
      destinationLng: buyer.lng,
      destinationAddress: buyer.address,
      packageWeightKg: group.totalWeightKg,
      isCod: paymentMethod === 'COD',
    }),
  });
  const { quoteId, status } = await res.json();   // status === 'ACTIVE'
  sellerQuotes[group.sellerId] = { quoteId };
}
```

Quote validity is bounded by the active `PricingConfig.quoteValiditySeconds`; the buyer
must confirm checkout before the quotes expire or confirm returns `422 QUOTE_EXPIRED`.

## Step 2 — Initiate the checkout session

```ts
await fetch(`/api/checkout/initiate`, {
  method: 'POST',
  body: JSON.stringify({
    cartId,
    shippingAddressId, billingAddressId, shippingMethodId,
    sellerQuotes,        // per-seller quoteIds (shippingCost is ignored by the server)
  }),
});
```

`InitiateCheckoutUseCase` validates every `quoteId` via `QuoteValidationService`,
stores `shippingCost` (Σ validated fees), `quoteId`(s), and `pricingVersion` on the
session, and marks each quote consumed **only after the session is persisted**.

## Step 3 — Confirm checkout

```ts
await fetch(`/api/checkout/${sessionId}/confirm`, {
  method: 'POST',
  body: JSON.stringify({
    paymentMethodId: 'COD',
    sellerQuotes,      // same map used at initiate
  }),
});
```

The controller routes to `MultiSellerCheckoutUseCase` when
`sellerQuotes` spans **more than one seller** (verified in
`multi-seller-routing.controller.test.ts`); a single-seller map falls through to the
standard confirmation path.

## Failure modes

| Condition | HTTP | Error code |
|-----------|------|-----------|
| Missing `quoteId` at initiate | 400 | field error on `quoteId` |
| Quote expired | 422 | `QUOTE_EXPIRED` |
| Quote already consumed | 422 | `QUOTE_CONSUMED` |
| Delivery unavailable for lane | 422 | `DELIVERY_UNAVAILABLE` |
| Any single seller's quote invalid at confirm | 422 | per-seller code + `sellerId` |

---

## Delivery options before quotes exist

When the buyer views delivery options before any seller quote exists,
`GetDeliveryOptionsUseCase` responds gracefully with an **empty group list** —
`{ groups: [], totalDeliveryFee: 0, consolidationSavingsTzs: 0 }` — rather than an
error. This happens when the session is unknown, the consolidation orchestrator is not
registered, or the orchestrator reports `usedFallback` (no consolidatable group). The
buyer app should treat an empty `groups` array as "quotes not yet requested" and trigger
Step 1.
