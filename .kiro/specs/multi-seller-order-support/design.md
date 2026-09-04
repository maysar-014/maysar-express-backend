# Design Document: Multi-Seller Order Support

## Overview

This design implements Approach A (split-at-checkout) for multi-seller orders. The `Order_Order` table is unchanged — each record still has exactly one `sellerId`. A new `Order_MasterOrder` table groups N seller orders created from a single buyer checkout. All existing seller-order business logic (stock verification, COD, chat, settlement, logistics) operates without modification.

---

## Architecture

```
CART (multi-seller, buyer-owned)
         │
         ▼
POST /api/checkout/confirm
         │
         ▼
CheckoutService.confirmMultiSellerCheckout()
    1. Group items by sellerId (catalog lookup)
    2. Validate N per-seller quotes
    3. Begin DB transaction
       a. PlaceOrderUseCase(sellerA, items_A, quoteA)  → Order_Order A
       b. PlaceOrderUseCase(sellerB, items_B, quoteB)  → Order_Order B
       c. PlaceOrderUseCase(sellerC, items_C, quoteC)  → Order_Order C
       d. Create Order_MasterOrder linking A, B, C
    4. Commit transaction (or rollback all)
    5. Mark quotes consumed
    6. Emit analytics events
         │
         ▼
Response: { masterOrderId, sellerOrders: [...] }
```

---

## Data Models

### New: Order_MasterOrder

```prisma
model Order_MasterOrder {
  id            String   @id @db.VarChar(64)  // MSR-MO-{YYYYMMDD}-{6alphanum}
  buyerId       String   @db.VarChar(64)
  totalAmount   Decimal  @db.Decimal(14, 2)
  currency      String   @default("TZS") @db.VarChar(8)
  paymentMethod String   @db.VarChar(32)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  sellerOrders  Order_MasterOrderItem[]

  @@index([buyerId])
  @@index([createdAt])
  @@map("order_master_orders")
}

model Order_MasterOrderItem {
  masterOrderId  String @db.VarChar(64)
  sellerOrderId  String @db.VarChar(64)

  masterOrder    Order_MasterOrder @relation(fields: [masterOrderId], references: [id])
  sellerOrder    Order_Order       @relation(fields: [sellerOrderId], references: [id])

  @@id([masterOrderId, sellerOrderId])
  @@index([sellerOrderId])
  @@map("order_master_order_items")
}
```

### Modified: Order_Order

Add one optional back-reference (non-breaking):

```prisma
model Order_Order {
  // ... all existing fields unchanged ...
  masterOrderItems  Order_MasterOrderItem[]  // optional back-reference
}
```

### Modified: Checkout_CheckoutSession

The session needs to store N per-seller quotes. The existing `quoteId` column stays for backward compatibility; a new JSON column holds the multi-seller quote map.

```
sellerQuotes  Json?   // { [sellerId: string]: { quoteId: string } }
```

---

## ID Format

```
MSR-MO-{YYYYMMDD}-{6 uppercase alphanumeric}
e.g.  MSR-MO-20260823-A3K7PQ
```

Generated in `shared/ids/id.ts` using a new `makeMasterOrderId()` function.

---

## Checkout Flow (Detailed)

### 1. Pre-checkout: Requesting Per-Seller Quotes

The frontend must call `POST /api/logistics/v1/quote` once per distinct seller before confirming checkout. The request body includes the seller's warehouse coordinates as origin and the buyer's address as destination.

The checkout session stores these as `sellerQuotes`:
```json
{
  "sellerA-id": { "quoteId": "qte_..." },
  "sellerB-id": { "quoteId": "qte_..." }
}
```

### 2. Checkout Confirmation

`POST /api/checkout/confirm` (existing endpoint, extended):

**Step 1 — Session load and basket validation**
- Load session, validate not expired
- Check minimum basket value against combined total

**Step 2 — Seller grouping**
- For each `productId` in session items, fetch `sellerId` from catalog (`Product.sellerId`)
- Group items: `Map<sellerId, items[]>`

**Step 3 — Quote validation (per seller)**
- For each `sellerId` in the group map, look up `session.sellerQuotes[sellerId].quoteId`
- If any seller has no `quoteId` → error `MISSING_DELIVERY_QUOTE`
- Call logistics internal endpoint to validate each quote
- If any quote is expired → error `QUOTE_EXPIRED`
- If any quote is already consumed → error `QUOTE_CONSUMED`

**Step 4 — Atomic transaction**
```typescript
await prisma.$transaction(async (tx) => {
  const sellerOrderIds: string[] = [];
  for (const [sellerId, items] of sellerGroups) {
    const result = await placeOrderUseCase.execute({
      buyerId,
      sellerId,
      items,
      paymentMethod,
      deliveryAddress,
      quoteId: sellerQuotes[sellerId].quoteId,
    });
    sellerOrderIds.push(result.orderId);
  }
  
  const masterOrderId = makeMasterOrderId();
  await tx.order_MasterOrder.create({
    data: {
      id: masterOrderId,
      buyerId,
      totalAmount: totalAcrossAllSellers,
      currency: 'TZS',
      paymentMethod,
      sellerOrders: {
        create: sellerOrderIds.map(id => ({ sellerOrderId: id }))
      }
    }
  });
  
  return masterOrderId;
});
```

**Step 5 — Post-transaction side effects**
- Mark all Per-Seller Quotes as `CONSUMED`
- Emit `master_order.created` analytics event
- Each `PlaceOrderUseCase` already emits `order.pending_seller_verification` per seller (no change needed)

---

## API Design

### New Buyer Endpoints

#### GET /api/orders/master

Returns paginated list of the buyer's master orders.

```
Authorization: Bearer <buyer-token>

Query params:
  page      integer  default=1
  pageSize  integer  default=20, max=100

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "masterOrderId": "MSR-MO-20260823-A3K7PQ",
        "status": "CONFIRMED",           // derived
        "totalAmount": 95000,
        "currency": "TZS",
        "paymentMethod": "SELLER_VERIFICATION",
        "sellerOrderCount": 2,
        "itemCount": 4,
        "isVirtual": false,
        "createdAt": "2026-08-23T..."
      }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 20
  }
}
```

#### GET /api/orders/master/:masterOrderId

Returns master order with all child seller orders.

```
Response 200:
{
  "success": true,
  "data": {
    "masterOrderId": "MSR-MO-20260823-A3K7PQ",
    "status": "CONFIRMED",
    "totalAmount": 95000,
    "currency": "TZS",
    "paymentMethod": "SELLER_VERIFICATION",
    "isVirtual": false,
    "createdAt": "...",
    "sellerOrders": [
      {
        "orderId": "ord_...",
        "sellerId": "usr_...",
        "status": "SELLER_VERIFIED",
        "totalAmount": 60000,
        "deliveryFee": 3850,
        "items": [...],
        "verificationDeadlineAt": "...",
        "chatConversationId": "..."
      },
      {
        "orderId": "ord_...",
        "sellerId": "usr_...",
        "status": "PENDING_SELLER_VERIFICATION",
        "totalAmount": 35000,
        "deliveryFee": 16000,
        "items": [...],
        "verificationDeadlineAt": "..."
      }
    ]
  }
}
```

### Virtual Master Order Support

Legacy orders (no `Order_MasterOrder` link) are served as Virtual Master Orders at read time. No DB writes occur.

```
GET /api/orders/master/VIRTUAL-ord_01ABC...
→ wraps the existing Order_Order in master order response shape
  with isVirtual: true
```

### Modified Checkout Confirmation Request

`POST /api/checkout/confirm` body now accepts:

```json
{
  "sessionId": "chk_...",
  "paymentMethodId": "SELLER_VERIFICATION",
  "sellerQuotes": {
    "usr_sellerA": { "quoteId": "qte_..." },
    "usr_sellerB": { "quoteId": "qte_..." }
  }
}
```

Backward compatible: if `sellerQuotes` is absent but `quoteId` is present (existing single-seller flow), the system wraps it as a single-seller `sellerQuotes` map using the product's seller.

---

## Master Order Status Derivation

Computed on every read — not stored in the DB:

```typescript
function deriveMasterStatus(sellerOrders: Order[]): string {
  const statuses = sellerOrders.map(o => o.status);
  
  if (statuses.every(s => s === 'DELIVERED' || s === 'COMPLETED')) return 'COMPLETED';
  if (statuses.every(s => s === 'cancelled')) return 'CANCELLED';
  if (statuses.some(s => s === 'cancelled')) return 'PARTIALLY_CANCELLED';
  if (statuses.some(s => s === 'SHIPPED' || s === 'IN_TRANSIT')) return 'IN_TRANSIT';
  if (statuses.some(s => s === 'SELLER_CONFIRMED' || s === 'SELLER_VERIFIED')) return 'CONFIRMED';
  if (statuses.every(s => s === 'PENDING' || s === 'PENDING_SELLER_VERIFICATION')) return 'PENDING';
  return 'PROCESSING';
}
```

---

## Seller Isolation

All existing seller-scoped queries already filter by `WHERE sellerId = :authenticatedSellerId`. No changes needed to existing seller endpoints.

New rules:
- Master order endpoints are **buyer-only** — no seller JWT can call them
- Seller API responses never include `masterOrderId` or sibling order information
- Forbidden cross-seller access attempts are logged at WARN level

---

## Payment Flow

### Single Payment for Multi-Seller Checkout

1. Checkout service collects a single payment authorisation for `masterOrder.totalAmount`
2. `Order_Payment` record is linked to `masterOrderId` (not to individual seller orders)
3. For COD: single COD commitment for the master total
4. For WALLET: single wallet hold for the master total at confirmation time
5. Settlement distributes independently per seller order upon delivery confirmation

### Order_Payment Schema Change

Currently `Order_Payment.orderId` references `Order_Order`. Add optional `masterOrderId`:

```prisma
model Order_Payment {
  // ... existing fields ...
  masterOrderId  String?  @db.VarChar(64)
}
```

---

## Analytics Events

```typescript
// Emitted by Checkout_Service after transaction commit
{
  type: 'master_order.created',
  masterOrderId: string,
  buyerId: string,
  sellerCount: number,
  totalAmount: number,
  currency: 'TZS',
  paymentMethod: string,
  createdAt: ISO8601
}

// Emitted by PlaceOrderUseCase per seller (already exists, add masterOrderId)
{
  type: 'seller_order.created',
  sellerOrderId: string,
  sellerId: string,
  masterOrderId: string,    // ← new field
  buyerId: string,
  itemCount: number,
  totalAmount: number,
  currency: 'TZS'
}
```

---

## Migration Strategy

### Zero Downtime

1. Add `Order_MasterOrder` and `Order_MasterOrderItem` tables (purely additive)
2. Add `Order_Payment.masterOrderId` nullable column (non-breaking)
3. Add `Checkout_CheckoutSession.sellerQuotes` JSON column (non-breaking)
4. Deploy new code
5. Legacy orders continue working via Virtual Master Order logic

No backfill of legacy orders needed — Virtual Master Orders handle historical reads.

---

## Correctness Properties

1. **Atomicity**: A master checkout either creates all seller orders + master order, or creates none.
2. **Seller isolation**: No seller API endpoint returns data for a different seller's orders.
3. **Quote consumption**: Each per-seller quote is consumed exactly once, even in retry scenarios.
4. **No double charging**: One buyer payment per master order; settlement per seller order upon delivery.
5. **Virtual backward compatibility**: Every historical `Order_Order` is reachable via the master order buyer API without DB writes.
6. **Derived status**: Master order status is always computed from live child order states — never stale.

---

## Assumptions and Constraints

1. The `Product` table in the catalog has `sellerId` accessible from the checkout service via `globalThis.prisma` (already used in checkout controller).
2. `PlaceOrderUseCase` signature is unchanged — multi-seller support is in the orchestration layer above it.
3. The logistics service per-seller quote endpoint (`GET /api/logistics/internal/quotes/:quoteId`) is already implemented and operational.
4. Consolidation delivery (multiple sellers → single delivery) is NOT supported in this version; each seller order has its own independent delivery.
5. The existing seller verification workflow (chat, confirm/decline) operates independently per seller order — no changes required.
