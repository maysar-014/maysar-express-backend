# Request Service — Frontend Integration Guide

> Mount path: `/api/request`
> Audience: Buyer app (customer), provider/ops portal, admin panel

The request service handles the "I need something sourced" flow — a customer describes a need, Maysar assesses it, sources it, and publishes a quote. The customer then converts the quote into an order.

---

## Request Status Machine

```
SUBMITTED → ASSESSING ⇄ NEEDS_CLARIFICATION
ASSESSING → FULFILLABLE → QUOTE_PUBLISHED → CONVERTED (terminal)
ASSESSING → UNFULFILLABLE (terminal)
SUBMITTED | ASSESSING | NEEDS_CLARIFICATION | QUOTE_PUBLISHED → CANCELLED (terminal)
any pre-CONVERTED state → EXPIRED (terminal, via sweeper)
FULFILLABLE | QUOTE_PUBLISHED → ASSESSING (re-assessment when quote expires)
```

**Customer-cancellable from:** `SUBMITTED`, `ASSESSING`, `NEEDS_CLARIFICATION`, `QUOTE_PUBLISHED`

---

## Customer Routes

All require auth.

### Create a Request
`POST /api/request/requests`

```jsonc
{
  "title": "50 cotton shirts for my shop",
  "description": "I need 50 men's cotton shirts in sizes M and L, white and blue. For my retail shop in Kariakoo.",
  "deliveryAddress": {
    "city": "Dar es Salaam",       // required
    "region": "Dar es Salaam",     // required
    "street": "Kariakoo Market",   // optional
    "area": "Kariakoo",            // optional
    "postalCode": "11101",         // optional
    "country": "Tanzania",         // optional
    "latitude": -6.8161,           // optional
    "longitude": 39.2803           // optional
  },
  "preferredDeliveryDate": "2024-09-15T00:00:00.000Z",  // optional
  "budgetTzs": 1200000,                                  // optional
  "attachments": ["https://cdn.example.com/ref-shirt.jpg"]  // optional
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "request": {
      "id": "REQ_01J...",
      "customerId": "usr_01J...",
      "title": "50 cotton shirts for my shop",
      "status": "SUBMITTED",
      "deliveryAddress": { "city": "Dar es Salaam", "region": "Dar es Salaam" },
      "budgetTzs": 1200000,
      "createdAt": "2024-09-01T10:00:00.000Z"
    },
    "messageId": "msg_01J..."
  }
}
```

`customerId` is always taken from the auth context — never send it in the body.

### List Own Requests
`GET /api/request/requests`

```jsonc
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "REQ_01J...",
      "title": "50 cotton shirts for my shop",
      "status": "QUOTE_PUBLISHED",
      "createdAt": "2024-09-01T10:00:00.000Z",
      "updatedAt": "2024-09-02T09:00:00.000Z"
    }
  ]
}
```

### Get a Request
`GET /api/request/requests/:requestId`

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "id": "REQ_01J...",
    "title": "50 cotton shirts for my shop",
    "description": "I need 50 men's cotton shirts...",
    "status": "QUOTE_PUBLISHED",
    "assignedProviderId": "prv_01J...",
    "unfulfillableReason": null,
    "orderId": null,
    "convertedQuoteId": null,
    "deliveryAddress": { "city": "Dar es Salaam", "region": "Dar es Salaam" },
    "budgetTzs": 1200000,
    "createdAt": "2024-09-01T10:00:00.000Z"
  }
}
```

When `status === "UNFULFILLABLE"`, `unfulfillableReason` is always populated — display it to the customer.

### Cancel a Request
`POST /api/request/requests/:requestId/cancel`

No body required. Only allowed from `SUBMITTED`, `ASSESSING`, `NEEDS_CLARIFICATION`, `QUOTE_PUBLISHED` → 409 otherwise.

```jsonc
// Response 200
{ "success": true, "data": { "id": "REQ_01J...", "status": "CANCELLED" } }
```

### Post a Message
`POST /api/request/requests/:requestId/messages`

```jsonc
{ "body": "Can you also include 10 shirts in size XL?" }
```

```jsonc
// Response 201
{
  "success": true,
  "data": { "id": "msg_01J...", "requestId": "REQ_01J...", "authorType": "CUSTOMER", "body": "Can you also include 10 shirts in size XL?", "createdAt": "2024-09-01T11:00:00.000Z" }
}
```

### List Messages
`GET /api/request/requests/:requestId/messages`

```jsonc
// Response 200
{
  "success": true,
  "data": [
    { "id": "msg_01J...", "authorType": "STATUS", "body": "Your request has been submitted and is awaiting Maysar assessment.", "createdAt": "2024-09-01T10:00:00.000Z" },
    { "id": "msg_02J...", "authorType": "MAYSAR_PROVIDER", "body": "We have sourced your shirts. Please review the quote.", "createdAt": "2024-09-02T09:00:00.000Z" }
  ]
}
```

`authorType` values: `CUSTOMER` | `MAYSAR_PROVIDER` | `SYSTEM` | `STATUS` | `QUOTE` | `ORDER`

### List Customer-Visible Quotes
`GET /api/request/requests/:requestId/quotes`

Only returns `PUBLISHED` quotes. `DRAFT` quotes are invisible to customers.

```jsonc
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "RQT_01J...",
      "label": "Option A — Standard delivery",
      "status": "PUBLISHED",
      "sellingPriceTzs": 1150000,
      "deliveryDate": "2024-09-14T00:00:00.000Z",
      "warrantyNote": "7-day return policy",
      "explanation": "Sourced from two suppliers to meet your quantity.",
      "validUntil": "2024-09-05T00:00:00.000Z",
      "items": [
        { "description": "Men's Cotton Shirt M — White", "quantity": 25, "unitPriceTzs": 12000 },
        { "description": "Men's Cotton Shirt L — Blue", "quantity": 25, "unitPriceTzs": 12000 }
      ]
    }
  ]
}
```

**Never show `procurementCostTzs` or `logisticsCostTzs` to the customer.**

---

## Assessment Link Flow (Token-Gated, No Auth Required)

The provider generates a link and sends it to the customer. The token is the credential — no JWT needed.

### Resolve Assessment Link
`GET /api/request/requests/assess/:token`

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "request": { "id": "REQ_01J...", "title": "50 cotton shirts for my shop", "status": "QUOTE_PUBLISHED" },
    "quote": {
      "id": "RQT_01J...",
      "label": "Option A — Standard delivery",
      "sellingPriceTzs": 1150000,
      "deliveryDate": "2024-09-14T00:00:00.000Z",
      "validUntil": "2024-09-05T00:00:00.000Z",
      "items": [...]
    }
  }
}
```

### Convert Quote to Order
`POST /api/request/requests/assess/:token/convert`

Idempotent — safe to call multiple times with the same token.

No body required.

```jsonc
// Response 200
{
  "success": true,
  "data": {
    "orderId": "ord_01J...",
    "requestId": "REQ_01J...",
    "quoteId": "RQT_01J...",
    "status": "CONVERTED"
  }
}
```

---

## Quote Status Machine

```
DRAFT → PUBLISHED → CONVERTED (terminal)
DRAFT | PUBLISHED → EXPIRED (terminal)
DRAFT | PUBLISHED → SUPERSEDED (terminal — replaced by a newer quote)
```

- `DRAFT` quotes are **invisible to customers**.
- `PUBLISHED` quotes are **immutable** — any change creates a new quote row; the old one becomes `SUPERSEDED`.
- Only `PUBLISHED` quotes can be converted.

**Quote invariants (enforced server-side):**
- `sellingPriceTzs` ≥ `procurementCostTzs` + `logisticsCostTzs`
- `validUntil` must be after `publishedAt`
- At least one item required
- Each item: non-blank `description`, `quantity > 0`, `unitPriceTzs ≥ 0`

---

## Provider Routes

Require role `provider`, `admin`, or `ops`.

### List Provider Queue
`GET /api/request/provider/requests`

### Get Request Detail (provider view)
`GET /api/request/provider/requests/:requestId`

### Assign Provider (admin/ops)
`POST /api/request/provider/requests/:requestId/assignment`

```jsonc
{ "providerId": "prv_01J..." }
```

### Assess a Request
`POST /api/request/provider/requests/:requestId/assessment`

```jsonc
{
  "outcome": "FULFILLABLE",           // FULFILLABLE | UNFULFILLABLE | NEEDS_CLARIFICATION
  "notes": "Sourced from two suppliers",
  "unfulfillableReason": null         // required when outcome = UNFULFILLABLE
}
```

### Create a Quote (DRAFT)
`POST /api/request/provider/requests/:requestId/quotes`

```jsonc
{
  "label": "Option A — Standard delivery",
  "items": [
    { "description": "Men's Cotton Shirt M — White", "quantity": 25, "unitPriceTzs": 12000 },
    { "description": "Men's Cotton Shirt L — Blue",  "quantity": 25, "unitPriceTzs": 12000 }
  ],
  "procurementCostTzs": 550000,
  "logisticsCostTzs": 45000,
  "sellingPriceTzs": 1150000,   // must be ≥ 550000 + 45000 = 595000
  "deliveryDate": "2024-09-14T00:00:00.000Z",
  "warrantyNote": "7-day return policy",
  "explanation": "Sourced from two suppliers to meet your quantity.",
  "validUntil": "2024-09-05T00:00:00.000Z"
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": { "id": "RQT_01J...", "requestId": "REQ_01J...", "status": "DRAFT", "sellingPriceTzs": 1150000 }
}
```

### Publish a Quote (DRAFT → PUBLISHED)
`POST /api/request/provider/quotes/:quoteId/publish`

No body required. Returns 422 if `validUntil` has already passed.

```jsonc
// Response 200
{ "success": true, "data": { "id": "RQT_01J...", "status": "PUBLISHED", "publishedAt": "2024-09-02T09:00:00.000Z" } }
```

### Generate Assessment Link
`POST /api/request/provider/quotes/:quoteId/assessment-link`

```jsonc
// Response 200
{ "success": true, "data": { "token": "abc123...", "url": "https://app.maysar.co.tz/assess/abc123..." } }
```

### Get Quote Detail (provider)
`GET /api/request/provider/quotes/:quoteId`

Includes `procurementCostTzs` and `logisticsCostTzs` — provider-only fields.

### List Provider Messages
`GET /api/request/provider/requests/:requestId/messages`

### Request Audit Trail
`GET /api/request/provider/requests/:requestId/audit`

Append-only audit log of all status transitions and actions.

---

## Supplier Registry (provider)

```
GET  /api/request/provider/suppliers
POST /api/request/provider/suppliers
PUT  /api/request/provider/suppliers/:supplierId
POST /api/request/provider/suppliers/:supplierId/invite-ready
POST /api/request/provider/suppliers/:supplierId/invited
```

---

## Item Sourcing & Procurement (provider)

```
POST  /api/request/provider/items/:itemId/sources
POST  /api/request/provider/sources/:sourceId/confirm
GET   /api/request/provider/orders/:orderId/procurement
PATCH /api/request/provider/procurement/:procurementId
```

---

## Demand Analytics (provider/admin)

`GET /api/request/provider/analytics`

Returns aggregate demand data across all requests.

---

## Error Codes

| Code | HTTP | Meaning | UI action |
|------|------|---------|-----------|
| `VALIDATION_ERROR` | 400 | Missing title/description, blank fields | Highlight fields |
| `UNAUTHORIZED` | 401 | No/expired JWT | Re-login |
| `FORBIDDEN` | 403 | Insufficient role or invalid token | Show error |
| `NOT_FOUND` | 404 | Request/quote not found | Show 404 |
| `INVALID_STATUS_TRANSITION` | 409 | e.g. cancelling a CONVERTED request | Refresh status, hide cancel |
| `QUOTE_BELOW_COST` | 422 | `sellingPriceTzs` < procurement + logistics | Show minimum price |
| `QUOTE_EXPIRED` | 422 | `validUntil` already passed on publish | Show expiry, update date |

---

## Display Notes

- Show the full status timeline to the customer so they can track progress.
- In `NEEDS_CLARIFICATION`: surface a prominent message prompt — the customer needs to respond.
- When `QUOTE_PUBLISHED`: show a clear CTA "Review & Accept Quote" leading to the assessment link flow.
- Quote `validUntil` should show as a countdown — expired quotes cannot be converted.
- `SUPERSEDED` status: show "Replaced by newer quote".
- Never render `procurementCostTzs` or `logisticsCostTzs` in the customer-facing UI.
- The convert endpoint is idempotent — safe to retry on network failure.

---

## Route Map

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/request/requests` | JWT (buyer) | Create request |
| GET | `/api/request/requests` | JWT (buyer) | List own requests |
| GET | `/api/request/requests/:requestId` | JWT (buyer) | Get request detail |
| POST | `/api/request/requests/:requestId/cancel` | JWT (buyer) | Cancel request |
| POST | `/api/request/requests/:requestId/messages` | JWT (buyer) | Post message |
| GET | `/api/request/requests/:requestId/messages` | JWT (buyer) | List messages |
| GET | `/api/request/requests/:requestId/quotes` | JWT (buyer) | List customer-visible quotes |
| GET | `/api/request/requests/assess/:token` | none (token-gated) | Resolve assessment link |
| POST | `/api/request/requests/assess/:token/convert` | none (token-gated) | Convert quote to order (idempotent) |
| GET | `/api/request/provider/requests` | JWT (provider/admin/ops) | Provider request queue |
| GET | `/api/request/provider/requests/:requestId` | JWT (provider/admin/ops) | Request detail (provider view) |
| POST | `/api/request/provider/requests/:requestId/assignment` | JWT (admin/ops) | Assign provider |
| POST | `/api/request/provider/requests/:requestId/assessment` | JWT (provider/admin/ops) | Submit assessment |
| POST | `/api/request/provider/requests/:requestId/quotes` | JWT (provider/admin/ops) | Create DRAFT quote |
| POST | `/api/request/provider/quotes/:quoteId/publish` | JWT (provider/admin/ops) | Publish quote |
| GET | `/api/request/provider/quotes/:quoteId` | JWT (provider/admin/ops) | Quote detail (incl. internal costs) |
| POST | `/api/request/provider/quotes/:quoteId/assessment-link` | JWT (provider/admin/ops) | Generate assessment link |
| GET | `/api/request/provider/requests/:requestId/messages` | JWT (provider/admin/ops) | List messages (provider view) |
| GET | `/api/request/provider/requests/:requestId/audit` | JWT (provider/admin/ops) | Audit trail |
| GET | `/api/request/provider/suppliers` | JWT (provider/admin/ops) | List suppliers |
| POST | `/api/request/provider/suppliers` | JWT (provider/admin/ops) | Register supplier |
| PUT | `/api/request/provider/suppliers/:supplierId` | JWT (provider/admin/ops) | Update supplier |
| POST | `/api/request/provider/items/:itemId/sources` | JWT (provider/admin/ops) | Attach source to item |
| POST | `/api/request/provider/sources/:sourceId/confirm` | JWT (provider/admin/ops) | Confirm source availability |
| GET | `/api/request/provider/orders/:orderId/procurement` | JWT (provider/admin/ops) | List procurement by order |
| PATCH | `/api/request/provider/procurement/:procurementId` | JWT (provider/admin/ops) | Advance procurement status |
| GET | `/api/request/provider/analytics` | JWT (provider/admin/ops) | Demand analytics |
