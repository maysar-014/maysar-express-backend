# Fetch User Full Name by ID — Integration Instruction

> Resolve a human-readable name from any user ID (`buyerId`, `sellerId`, `courierId`, `enablerId`, etc.) returned by any Maysar service.

---

## Preferred: Bulk Name Resolution

**`POST /api/user/resolve-names`** — resolves a batch of user IDs to display-name fields in a single HTTP call. This is the preferred method when you need names for more than one user (e.g. an orders list, tracking page, courier job).

### Request

```http
POST /api/user/resolve-names
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "ids": ["usr_01ARZ3NDEKTSV4RRFFQ69G5FAV", "usr_02BZ4CDEKTSV4RRFFQ69G5FAV"]
}
```

| Constraint | Value |
|---|---|
| Max IDs per request | 100 (unique, after dedup) |
| Auth | Any authenticated user (any role) |
| Duplicates | Collapsed to one entry each |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "usr_01ARZ3NDEKTSV4RRFFQ69G5FAV": {
      "fullName": "Asha Mwakalobo",
      "publicCode": "MYS-SLR-01",
      "role": "seller"
    },
    "usr_02BZ4CDEKTSV4RRFFQ69G5FAV": null
  }
}
```

- Each requested ID appears as a key in `data`.
- Unresolved IDs map to `null` (never a 404) — partial success is the norm.
- Each entry contains only `fullName`, `publicCode`, `role` — no email, phone, DOB, KYC, or other PII.

### Error responses

```json
// 400 — invalid body
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "'ids' must be a non-empty array of user ID strings" } }

// 400 — too many IDs
{ "success": false, "error": { "code": "BATCH_SIZE_EXCEEDED", "message": "A maximum of 100 IDs may be resolved per request" } }

// 401 — not authenticated
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }

// 500 — unexpected failure
{ "success": false, "error": { "code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred while resolving names" } }
```

### Usage example — resolving names for an orders list

```ts
async function resolveNamesForOrders(orders: Array<{ buyerId: string; sellerId: string }>, token: string) {
  const uniqueIds = new Set<string>();
  orders.forEach(o => {
    uniqueIds.add(o.buyerId);
    uniqueIds.add(o.sellerId);
  });

  const res = await fetch('/api/user/resolve-names', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids: [...uniqueIds] }),
  }).then(r => r.json());

  // res.data is { [id]: { fullName, publicCode, role } | null }
  return res.data;
}

// Then: const sellerName = res.data[order.sellerId]?.fullName ?? order.sellerId;
```

One round-trip replaces N calls. Cache results client-side for a few minutes — names change rarely.

---

## Fallback: Single User Lookup

If you only need one user's name and the bulk endpoint is unavailable, use the existing single-fetch endpoint.

**`GET /api/user/:id`** — requires authentication (Bearer token)

This returns the full user profile including `firstName`, `lastName`, and a computed `fullName` field. Use this only when the bulk endpoint is unavailable or you need a single user's full profile (not just the display name).

### Response (200 OK, abbreviated)

```json
{
  "success": true,
  "data": {
    "id": "usr_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    "firstName": "Asha",
    "lastName": "Mwakalobo",
    "fullName": "Asha Mwakalobo",
    "publicCode": "MYS-SLR-01",
    "role": "seller",
    "email": "asha.mwakalobo@maysar.co.tz",
    "phoneNumber": "+255700000101",
    "...": "full profile fields"
  }
}
```

Note: this endpoint returns the entire user profile (email, phone, DOB, KYC data, addresses). If you only need the name for display, prefer the bulk endpoint above — it returns only `fullName`, `publicCode`, and `role`.

---

## Where this fits

| Caller | ID source | Why |
|---|---|---|
| Orders list (`GET /api/order/orders`) | `orders[].buyerId`, `orders[].sellerId` | Display "Sold by {sellerName}" / "Bought by {buyerName}" |
| Order detail (`GET /api/order/orders/:id`) | `order.buyerId`, `order.sellerId` | Same |
| Master order (`GET /api/orders/master/:id`) | `sellerOrders[].sellerId` | Label each sub-order by seller |
| Tracking lookup (`GET /api/order/orders/tracking/:identifier`) | `order.buyerId`, `order.sellerId` | Show parties on the tracking page |
| Courier delivery job | `Logistics_DeliveryJob.driverId` | Show courier name to the buyer |
| Enabler attribution | `Enabler_SellerAuthorizationScope.enablerId` | Attribute seller enablement |

---

## Related docs

- `docs/user/USER_SERVICE_FRONTEND_GUIDE.md` — full user-service API reference
- `docs/user/USER_SERVICE_SYSTEM.md` — user service system design
- `docs/order/ORDER_SERVICE_FRONTEND_GUIDE.md` — orders endpoint (source of `buyerId` / `sellerId`)
- `shared-contracts/user-service-contracts.ts` — `UserResponse` shape
