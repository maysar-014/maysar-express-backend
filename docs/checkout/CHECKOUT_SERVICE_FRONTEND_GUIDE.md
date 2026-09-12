# Checkout Service — Frontend Integration Guide

> Mount path: `/api/checkout`

---

## Business Rules (from domain code)

### Security: server-authoritative pricing

The `_shippingCost` parameter in `InitiateCheckoutUseCase.execute()` is explicitly marked `@deprecated Ignored`. The authoritative shipping cost **always comes from the validated logistics quote**. Any client-supplied shipping cost is silently discarded. Never calculate or display a shipping cost before receiving the server response.

### quoteId is mandatory

`quoteId` is required on every checkout initiation. Without it the use case returns:
```
{ success: false, errors: [{ field: 'quoteId', message: 'A valid delivery quote is required to proceed with checkout.' }] }
```

### Quote rejection reasons → user messages

| `rejectionReason` | Message to show |
|---|---|
| `NOT_FOUND` | "Delivery quote not found. Please request a new quote." |
| `EXPIRED` | "Delivery quote has expired. Please request a new quote." |
| `CONSUMED` | "Delivery quote has already been used. Please request a new quote." |
| `DELIVERY_UNAVAILABLE` | "Delivery is not available for this route. Please choose a different address." |
| `SERVICE_UNAVAILABLE` | "Delivery pricing service is temporarily unavailable. Please try again." |

### Delivery window preference
Valid values: `FLEXIBLE` | `STANDARD` | `EXPRESS`

Any other value → `422` with `{ field: 'deliveryWindowPreference', message: 'deliveryWindowPreference must be one of FLEXIBLE, STANDARD or EXPRESS.' }`

### Checkout session expiry
`expiresAt = now + 3600000 ms` (**1 hour**). Show a countdown. On expiry, inventory reservations are released automatically.

### Enabler attribution
Optional `enablerCode` field. Rules:
- Enabler must have `status === APPROVED` or `status === ACTIVE`
- Enabler cannot be the same user as the buyer (`enabler.userId !== userId`)
- Invalid format → `INVALID_ENABLER_CODE`
- Not found → `ENABLER_NOT_FOUND`

### Cart item pricing
If `CatalogPriceValidatorService` is wired, each item's `priceAtTime` is replaced with the server-authoritative catalog price. Client-supplied prices are overwritten silently.

### Discount rules (PricingPolicy)
- Discount cannot exceed subtotal
- Percentage discounts: value must be 0–100
- Fixed discounts: value must be ≥ 0

### Cart item rules (CartItem)
- `quantity` must be > 0
- `priceAtTime` must be ≥ 0
- Adding same `productId` + `variantId` → quantity is incremented, not duplicated
- Setting quantity to 0 via `updateItemQuantity` → item is removed

---

## Route Reference

### Cart

#### Get current cart
```
GET /api/checkout/cart/current
```

#### Get cart by ID
```
GET /api/checkout/cart/:cartId
```

#### Add item to cart
```
POST /api/checkout/cart/items
```
```jsonc
{
  "productId": "prd_01J...",
  "variantId": "var_01J...",   // optional
  "quantity": 2,
  "priceAtTime": 15000
}
```

#### Update cart item
```
PATCH /api/checkout/cart/items
```
```jsonc
{ "productId": "prd_01J...", "variantId": "var_01J...", "quantity": 3 }
```
Setting `quantity: 0` removes the item.

#### Remove item from cart
```
DELETE /api/checkout/cart/items
```
```jsonc
{ "productId": "prd_01J...", "variantId": "var_01J..." }
```

#### Clear cart
```
DELETE /api/checkout/cart/:cartId
```

#### Merge carts (guest → authenticated)
```
POST /api/checkout/cart/merge
```

---

### Delivery options
```
POST /api/checkout/delivery-options
```
```jsonc
{ "cartId": "cart_01J...", "deliveryAddress": { "city": "Dar es Salaam", "region": "Kinondoni" } }
```

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "groups": [
      {
        "sellerId": "usr_02J...",
        "options": [
          {
            "type": "MAYSAR_EXPRESS",
            "label": "Express Delivery",
            "deliveryFee": 5000,
            "estimatedDelivery": "2026-09-01T14:00:00Z",
            "quoteId": "lqt_01J..."
          }
        ]
      }
    ],
    "totalDeliveryFee": 5000,
    "consolidationSavingsTzs": 1500
  }
}
```

The `quoteId` from the selected option **must** be passed to checkout initiation. Quotes expire — re-fetch if the user takes too long.

---

### Initiate checkout
```
POST /api/checkout/initiate
```

```jsonc
{
  "cartId": "cart_01J...",
  "userId": "usr_01J...",
  "shippingAddressId": "addr_01J...",
  "billingAddressId": "addr_01J...",
  "shippingMethodId": "method_standard",
  "quoteId": "lqt_01J...",                        // required
  "deliveryWindowPreference": "STANDARD",          // FLEXIBLE | STANDARD | EXPRESS
  "enablerCode": "ENB-XXXX"                        // optional
}
```

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "id": "cks_01J...",
    "status": "initiated",
    "shippingCost": 5000,       // server-authoritative — display this
    "subtotal": 30000,
    "taxAmount": 0,
    "discountAmount": 0,
    "totalAmount": 35000,
    "expiresAt": "2026-09-01T11:00:00Z",
    "quoteId": "lqt_01J...",
    "deliveryWindowPreference": "STANDARD"
  },
  "pricing": {
    "subtotal": 30000,
    "taxAmount": 0,
    "shippingCost": 5000,
    "discountAmount": 0,
    "total": 35000
  }
}
```

Always display `pricing.shippingCost` from the response — never a client-calculated value.

---

### Get checkout session
```
GET /api/checkout/:id
```

Session statuses and what the frontend should do:

| Status | Meaning | Frontend action |
|---|---|---|
| `initiated` | Session active, awaiting confirmation | Show order summary, countdown timer |
| `CONFIRMED` | Checkout confirmed, order created | Navigate to order tracking |
| `EXPIRED` | 1-hour TTL elapsed, inventory released | Show expiry message, restart checkout |
| `ABANDONED` | Session inactive, cleaned up by sweeper | Treat same as EXPIRED |

When `status === 'EXPIRED'` or `status === 'ABANDONED'`: restart from `POST /delivery-options`.

---

## Multi-Seller Checkout

When a cart contains items from more than one seller, the confirm endpoint automatically routes to the multi-seller flow. There is no separate initiation step — the same `POST /api/checkout/:id/confirm` endpoint is used, but the request body must include `sellerQuotes`.

### When to use multi-seller confirm

The `/delivery-options` response groups options by `sellerId`. If there are multiple sellers in `groups[]`, each seller needs its own `quoteId`.

### Multi-seller confirm
```
POST /api/checkout/:id/confirm
```

```jsonc
{
  "sellerQuotes": {
    "usr_seller_01J...": "lqt_01J...",
    "usr_seller_02J...": "lqt_02J..."
  }
}
```

**All-or-nothing validation:** If one seller's quote is invalid, expired, or consumed, the entire checkout fails. The error response includes which `sellerId` caused the failure:

```jsonc
// Response 422 — one quote invalid
{
  "success": false,
  "error": {
    "code": "QUOTE_VALIDATION_FAILED",
    "message": "Quote for seller usr_seller_02J... is expired",
    "sellerId": "usr_seller_02J..."
  }
}
```

On failure, re-fetch delivery options for that seller and try again. The other sellers' quotes remain valid.

**Response on success:**
```jsonc
{
  "success": true,
  "data": {
    "masterOrderId": "MOR-01J...",
    "sellerOrders": [
      { "orderId": "ORD-01J...", "sellerId": "usr_seller_01J..." },
      { "orderId": "ORD-02J...", "sellerId": "usr_seller_02J..." }
    ]
  }
}
```

**Price lock:** On successful confirmation, the server writes a `FulfillmentCommitment` for each seller's delivery price. This locks the logistics cost — subsequent courier pricing changes do not affect this order.

---

## Confirm checkout (single seller)
```
POST /api/checkout/:id/confirm
```

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "orderId": "ORD-01J...",
    "masterOrderId": "MOR-01J...",
    "totalAmount": 35000,
    "paymentStatus": "COMPLETED"
  }
}
```

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `QUOTE_EXPIRED` | 410 | Quote TTL elapsed — re-fetch delivery options |
| `QUOTE_CONSUMED` | 409 | Quote already used — re-fetch delivery options |
| `QUOTE_NOT_FOUND` | 404 | Quote ID invalid |
| `DELIVERY_UNAVAILABLE` | 422 | Route not serviceable |
| `INVALID_DELIVERY_WINDOW` | 422 | Value not FLEXIBLE/STANDARD/EXPRESS |
| `CART_NOT_FOUND` | 404 | Cart ID invalid |
| `INVENTORY_UNAVAILABLE` | 409 | Item out of stock — remove from cart |
| `SESSION_EXPIRED` | 410 | 1-hour session window elapsed — restart checkout |
| `INSUFFICIENT_WALLET_BALANCE` | 400 | Wallet balance too low |
| `INVALID_ENABLER_CODE` | 422 | Enabler code format invalid |
| `ENABLER_NOT_FOUND` | 404 | Enabler code not found |
| `ENABLER_NOT_ACTIVE` | 422 | Enabler status is not APPROVED or ACTIVE |
| `ENABLER_IS_BUYER` | 422 | Enabler cannot be the same user as the buyer |

---

## Events

| Event | When | Key payload |
|---|---|---|
| `checkout.initiated` | `POST /initiate` completes | `sessionId, buyerId, cartSnapshot, shippingCost` |
| `checkout.confirmed` | `POST /:id/confirm` completes | `sessionId, orderId, masterOrderId` |
| `checkout.abandoned` | Session expires without confirmation | `sessionId, buyerId` |

---

## Full checkout sequence

### Single-seller
```
1. POST /delivery-options  →  get quoteId per seller
2. User selects delivery option
3. POST /initiate  { quoteId, deliveryWindowPreference }
   →  session with server-authoritative shippingCost + expiresAt
4. Show order summary (use server pricing, not client-calculated)
5. Show countdown from expiresAt
6. POST /:id/confirm
   →  orderId + masterOrderId
7. Navigate to order tracking
```

### Multi-seller (groups[] has >1 seller)
```
1. POST /delivery-options  →  get quoteId per seller (groups[0].quoteId, groups[1].quoteId, ...)
2. User selects delivery option per seller
3. POST /initiate  { quoteId (primary seller), deliveryWindowPreference }
   →  session created
4. POST /:id/confirm  { sellerQuotes: { "sellerId1": "quoteId1", "sellerId2": "quoteId2" } }
   →  all-or-nothing validation; if one quote fails → 422 with sellerId
   →  masterOrderId + sellerOrders[]
5. Navigate to order tracking (show per-seller status)
```

