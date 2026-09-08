# Maysar Request Service — Frontend Integration Guide

> Last updated: September 2026  
> Audience: Client app engineers (buyer app, provider/ops app, web dashboard)  
> Service: `services/request-service` — mounted at `/api/request` by `app.ts`

---

## 1. What the Request Service Does

The Request Service manages the **procurement-by-request** flow: a buyer posts a sourcing request (items they want), Maysar assesses it, providers quote, the buyer picks a quote, and it converts into a real order. Think "request for quotation → order" for items a buyer cannot find in the catalog.

```
Buyer posts request → Maysar assesses → Providers quote → Buyer accepts → Order created
```

It is **separate** from the catalog/order flow. The Order Service never creates a request; the Request Service never calculates a price.

---

## 2. Service at a Glance

| Aspect | Detail |
|--------|--------|
| Mount path | `/api/request` |
| Auth | JWT via `@shared/middleware/auth-context.middleware` (`requireAuth`) — **except** the public assessment-link routes (tokenless, time-limited link) |
| IDs | `REQ-` (request), `RQI-` (request item), `RQO-` (request quote), `RQS-` (source), `SUP-` (supplier), `RQP-` (procurement), `RAL-` (assessment link) |
| Conventions | JSON request/response; errors shaped `{ success: false, error: { code, message } }` |
| Module registration | `services/request-service/index.ts` → `RequestModule` |
---

## 3. Authentication & Roles

| Surface | Auth | Who can call it |
|---------|------|-----------------|
| `GET  /api/request/requests/assess/:token` | **None** (the token IS the credential) | Anyone with the link |
| `POST /api/request/requests/assess/:token/convert` | **None** (token-scoped) | Same |
| `POST/GET .../api/request/requests...` (customer) | `requireAuth` (buyer JWT) | Buyer |
| `/api/request/provider/requests...` | `requireRole(['provider','admin','ops'])` | Provider / ops |

**Security rules for frontends:**
- **Never send the customer JWT in a query string.** Assessment-link tokens are the *only* token in a URL — they are short-lived, single-purpose, and expire.
- Treat the assessment link like a password: share via WhatsApp/email deep-links, never log it, and handle `410 GONE` (`LINK_EXPIRED` / `LINK_CONSUMED`) as a "ask for a new link" state.
- `convert` is **idempotent** — retry-safe. Response body `data.created` tells you whether a new order was created (`true` → 201) or an existing one returned (`false` → 200).

---

## 4. Core Domain Objects

```
Request (REQ-)       ──1:N──►  Item (RQI-)
   │                              │
   │                              └──1:1── Source (RQS-)   ← Phase 2 sourcing
   │                                            │
   ├──1:N── Message (RQM-)   ◄── conversation thread (buyer ⇄ provider)
   ├──1:N── Quote (RQO-)     ← Maysar/provider pricing per request
   ├──1:1── AssessmentLink (RAL-)  ← public token-gated checkout
   └──1:1── Procurement (RQP-)    ← Phase 2 procurement per order
Supplier (SUP-)  ◄─1:N── Source (each source names a supplier)
```

| Entity | Prefix | Description |
|--------|--------|-------------|
| Request | `REQ-` | The buyer's procurement request (title, items, delivery address, budget) |
| RequestItem | `RQI-` | One line item within a request (description, qty, category) |
| RequestQuote | `RQO-` | A priced, dated offer against the request |
| RequestSource | `RQS-` | Where a line item is won from (Supplier ID or Maysar inventory) |
| Supplier | `SUP-` | Third-party supplier registry (Phase 2) |
| Procurement | `RQP-` | Sourcing-then-procurement wrapper per order (Phase 2) |
| AssessmentLink | `RAL-` | Token-gated link to accept a published quote |
| Message | `RQM-` | Conversation messages on a request |

### 4.1 Request state machine

```
SUBMITTED → ASSESSING ⇄ NEEDS_CLARIFICATION → ASSESSING
         → FULFILLABLE → QUOTE_PUBLISHED → … → CONVERTED
         → UNFULFILLABLE        (dead end — cannot be quoted)
         → CANCELLED            (customer)
         → EXPIRED
```

**Frontend implications:**
- `UNFULFILLABLE` requests can never receive quotes — show `unfulfillableReason` and disable the "waiting for quote" UI.
- A request is only quotable after a provider marks it `FULFILLABLE`.
- `QUOTE_PUBLISHED` means at least one quote is live; `CONVERTED` means the flow finished (order created).

### 4.2 Quote state machine

```
DRAFT → PUBLISHED → CONVERTED
     → EXPIRED
     → SUPERSEDED        (a re-priced quote replaces the old one)
```

**Immutability (important for UIs):**
- **`DRAFT` quotes are invisible to buyers.** `GET /requests/:requestId/quotes` only returns `PUBLISHED`+ quotes.
- **`PUBLISHED` quotes are immutable.** Repricing creates a **new** quote row and supersedes the old one. If the UI shows a stale quote price, re-fetch the quote list — the old quote id now points at a superseded row.
---

## 5. Buyer (Customer) API — request lifecycle

All endpoints require the buyer JWT (`Authorization: Bearer <token>`), except the two assessment-link routes.

### 5.1 Create a request
`POST /api/request/requests` → **201**

```jsonc
{
  "title": "Office chairs, 6 pcs, Dar es Salaam",
  "items": [
    { "description": "Ergonomic mesh chair", "quantity": 6, "category": "FURNITURE" }
  ],
  "deliveryAddress": { "city": "Dar es Salaam", "region": "Kinondoni", "street": "..." },
  "customerBudgetTzs": 900000,
  "notes": "Need before end of month"
}
```

Server-enforced validation: `title` and `deliveryAddress.city` + `deliveryAddress.region` are **required** (400 otherwise). Response:

```jsonc
{
  "success": true,
  "data": {
    "id": "REQ-...", "status": "SUBMITTED",
    "title": "Office chairs, 6 pcs, Dar es Salaam",
    "items": [ { "id": "RQI-...", "description": "Ergonomic mesh chair", "quantity": 6 } ],
    "deliveryAddress": { "city": "Dar es Salaam", "region": "Kinondoni" },
    "customerBudgetTzs": 900000,
    "createdAt": "2026-09-06T10:00:00Z"
  },
  "timestamp": "2026-09-06T10:00:00Z"
}
```

### 5.2 List / get / cancel

| Endpoint | Notes |
|----------|-------|
| `GET /api/request/requests?limit=20&cursor=...` | Cursor-paginated list. Use `limit` + opaque `cursor` (stable order — do not page with `page` numbers) |
| `GET /api/request/requests/:requestId` | Full request `toJSON()` incl. current `status` |
| `POST /api/request/requests/:requestId/cancel` | Allowed from `SUBMITTED | ASSESSING | NEEDS_CLARIFICATION`; 409/422 if too late |

### 5.3 Conversation

| Endpoint | Body | Returns |
|----------|------|---------|
| `POST /api/request/requests/:requestId/messages` | `{ "body": "...", "attachments": [...] }` | 201 + message JSON |
| `GET  /api/request/requests/:requestId/messages?limit=50&cursor=...` | — | `[{ id, sender, role, body, attachments, createdAt }]` |

### 5.4 View quotes
`GET /api/request/requests/:requestId/quotes` — published quote list (buyer-facing price + `validUntil`). **Only `PUBLISHED` (or later) quotes appear.**

### 5.5 Accept via assessment link (public — no JWT)
1. Customer opens `GET /api/request/requests/assess/:token`
   → **200** `{ data: { requestId, quoteId, quoteSummary, expiresAt } }`
   → **410** `{ code: 'LINK_EXPIRED' | 'LINK_CONSUMED' }` if the link is dead
2. Customer confirms → `POST /api/request/requests/assess/:token/convert`
   → **201** (new order) / **200** (idempotent replay) with `{ data: { orderId, quoteId, created: bool } }`
   → **410** if the token was consumed by a previous conversion (or expired)
---

## 6. Provider (Ops) API — Maysar operations + Phase 2 sourcing

All require `Authorization: Bearer <token>` with role `provider`, `admin`, or `ops`.

### 6.1 Assessment pipeline

| Endpoint | Body |
|----------|------|
| `GET  /api/request/provider/requests` | List requests awaiting/carrying assessment |
| `GET  /api/request/provider/requests/:requestId` | Detail incl. items + status |
| `POST /api/request/provider/requests/:requestId/assignment` | `{ "providerId": "..." }` — claim/assign |
| `POST /api/request/provider/requests/:requestId/assessment` | `{ "fulfillable": true }` **or** `{ "fulfillable": false, "unfulfillableReason": "..." }` |
| `GET  /api/request/provider/requests/:requestId/messages` | Thread view |

### 6.2 Quoting

| Endpoint | Notes |
|----------|-------|
| `POST /api/request/provider/requests/:requestId/quotes` | `{ "validUntil": "ISO-8601", "lineItems": [...], "deliveryFeeTzs": ..., "totalPriceTzs": ... }` → creates a `DRAFT` |
| `GET  /api/request/provider/requests/quotes/:quoteId` | **Registered before `/:requestId`** — keep this ordering in any API client |
| `POST /api/request/provider/requests/quotes/:quoteId/publish` | Publish (freezes the quote; immutable from here) |
| `POST /api/request/provider/requests/quotes/:quoteId/assessment-link` | Generate shareable acceptance link → returns token |

Create-quote validation (server-enforced): `validUntil` in the future, non-empty line items, and selling price ≥ procurement + logistics.

### 6.3 Phase 2 — Supplier registry & sourcing

| Endpoint | Body / Notes |
|----------|--------------|
| `GET  /api/request/provider/suppliers` | Registry + per-supplier pricing data |
| `POST /api/request/provider/suppliers` | `{ "name": "...", "categories": [...], "contact": {...} }` |
| `PUT  /api/request/provider/suppliers/:supplierId` | Update |
| `POST /api/request/provider/items/:itemId/sources` | Attach a source: `{ "supplierId": "sup_...", "unitPriceTzs": ..., "currency": "TZS", "estimatedLeadDays": 3, "isConfirmed": false }` — or `supplierId: null` for **Maysar inventory** |
| `POST /api/request/provider/sources/:sourceId/confirm` | Confirm a source (confirmation gates publish) |
| `GET  /api/request/provider/orders/:orderId/procurement` | Procurement state for an order |
| `PATCH /api/request/provider/procurement/:procurementId` | Advance procurement state |

**Publish gate (Phase 2):** a quote cannot be published until **every item has a `CONFIRMED` source** (either a confirmed supplier row or Maysar inventory). Server-enforced; the UI should walk item → source → confirm before enabling "Publish".
---

## 7. Error handling contract

Every error response is shaped the same:

```jsonc
{ "success": false, "error": { "code": "...", "message": "..." }, "timestamp": "..." }
```

Common codes frontends should handle explicitly:

| Code | Meaning | UI action |
|------|---------|----------|
| `UNAUTHORIZED` (401) | No/expired JWT | Re-login |
| `TOKEN_REQUIRED` (400) | Missing `:token` | Don't open link directly |
| `LINK_EXPIRED` (410) | Assessment link past `expiresAt` | "Request new link" |
| `LINK_CONSUMED` (410) | Already converted | Show order status instead |
| `VALIDATION_ERROR` (400) | Missing required fields (`title`, address parts, `validUntil`…) | Highlight fields |
| `RequestNotFound` (404) / wrong-status conflicts (409/422) | Request/quote not found, or action invalid in current state (cancel too late, publish with unconfirmed sources) | Disable CTA, surface reason |
| `INTERNAL_SERVER_ERROR` (500) | Server failure | Retry with backoff |

**Rule of thumb for frontends:** treat any non-2xx as a *state* problem first (stale request/quote on screen) — re-fetch `GET /requests/:requestId` before showing a raw error.

---

## 8. End-to-end sequence (buyer-app view)

```
[Buyer app]                     [Request API]            [Provider/ops]
     │ POST /requests (create)      │                         │
     ├──────────────────────────────► 201 Req REQ-1 SUBMITTED  │
     │                                │                         │
     │  (poll / push status changes)  │◄── assign + assess ─────┤
     │                                │  request.fulfillable    │
     │                                │  request.quote_published│
     │ GET /requests/REQ-1/quotes  ◄──┤                         │
     │   [PUBLISHED quote, price,     │                         │
     │    validUntil]                 │                         │
     │                                │◄─ create + publish ─────┤
     │                                │◄─ generate link ────────┤
     │  (via WhatsApp/deep-link)      │                         │
     │ GET /requests/assess/:token    │                         │
     ├──────────────────────────────► 200 { requestId, quote }  │
     │ POST /requests/assess/:token/convert                     │
     ├──────────────────────────────► 201 { orderId, created:true }
     │   └─ buyer now tracks a normal Order                     │
```

**Integration checklist for the buyer app:**
1. After creating a request, poll `GET /requests/:requestId` (or subscribe to `request.*` events) — don't assume instant `FULFILLABLE`.
2. Only enable "manage quote" UI when `status ∈ { FULFILLABLE, QUOTE_PUBLISHED }`.
3. When converting, **expect either 200 or 201** and treat both as success (idempotent).
4. Never cache quote prices beyond `validUntil`.

---

## 9. Route map (reference)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/api/request/health/live` | none | health |
| GET  | `/api/request/requests/assess/:token` | token | resolve assessment link |
| POST | `/api/request/requests/assess/:token/convert` | token | convert accepted quote → order |
| POST | `/api/request/requests` | buyer | create request |
| GET  | `/api/request/requests` | buyer | list (cursor) |
| GET  | `/api/request/requests/:requestId` | buyer | detail |
| POST | `/api/request/requests/:requestId/cancel` | buyer | cancel |
| POST | `/api/request/requests/:requestId/messages` | buyer | post message |
| GET  | `/api/request/requests/:requestId/messages` | buyer | list messages |
| GET  | `/api/request/requests/:requestId/quotes` | buyer | published quotes |
| GET  | `/api/request/provider/requests` | provider/ops | list |
| GET  | `/api/request/provider/requests/:requestId` | provider/ops | detail |
| POST | `/api/request/provider/requests/:requestId/assignment` | provider/ops | assign |
| POST | `/api/request/provider/requests/:requestId/assessment` | provider/ops | assess |
| POST | `/api/request/provider/requests/:requestId/quotes` | provider/ops | create draft quote |
| GET  | `/api/request/provider/requests/quotes/:quoteId` | provider/ops | quote detail |
| POST | `/api/request/provider/requests/quotes/:quoteId/publish` | provider/ops | publish |
| POST | `/api/request/provider/requests/quotes/:quoteId/assessment-link` | provider/ops | make link |
| GET  | `/api/request/provider/requests/:requestId/messages` | provider/ops | thread |
| GET  | `/api/request/provider/suppliers` | provider/ops | list suppliers |
| POST | `/api/request/provider/suppliers` | provider/ops | register supplier |
| PUT  | `/api/request/provider/suppliers/:supplierId` | provider/ops | update supplier |
| POST | `/api/request/provider/items/:itemId/sources` | provider/ops | attach item source |
| POST | `/api/request/provider/sources/:sourceId/confirm` | provider/ops | confirm source |
| GET  | `/api/request/provider/orders/:orderId/procurement` | provider/ops | procurement state |
| PATCH| `/api/request/provider/procurement/:procurementId` | provider/ops | advance procurement |

> **Route-order note:** `/quotes/:quoteId` **must** precede `/:requestId` in the provider router (it does in `request.routes.ts`). Mirror this ordering in any API client/gateway so `GET /provider/requests/quotes/:quoteId` is never captured by the `/:requestId` segment.
