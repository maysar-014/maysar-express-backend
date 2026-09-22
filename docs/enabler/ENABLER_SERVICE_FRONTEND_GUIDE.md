# Enabler Service — Frontend Integration Guide

> **Audience:** Client engineers building the Enabler portal, the admin panel and the buyer-facing Hub.
> **Service:** `services/enabler-service` · **Mount path:** `/api/enabler`
> **Status:** As-built — verified against the mounted router, validators, middleware and lifecycle policy. Last updated: September 2026.

---

## 1. What the Enabler Service Does

Maysar **Enablers** are third-party sales facilitators. They list products from the catalog, facilitate orders on behalf of buyers, earn commissions and run promotion campaigns. The service exposes two surfaces:

- **Enabler management** (`/enablers`) — registration, approval, capability lifecycle, listings, orders, earnings, promotion jobs, referral links
- **Hub** (`/hub`) — buyer-facing product discovery across all enabler listings

```
Register → Approve → Accept terms → (Training) → Activate → List products → Facilitate orders → Earn commissions
                                        └────────────► Accept promotion jobs → Track referrals
```

**`APPROVED` ≠ `ACTIVE`.** An `APPROVED` enabler may list products; only an `ACTIVE` enabler may facilitate orders. Between the two sit two **mandatory, server-enforced gates**: terms acceptance and training completion (when mandatory modules exist). The backend re-enforces every capability on every request — frontend gating is presentation only.

---

## 2. Service at a Glance

| Aspect | Detail |
|---|---|
| Mount path | `/api/enabler` |
| Enabler routes | `/api/enabler/enablers` |
| Hub routes | `/api/enabler/hub` |
| Maintenance routes | `/api/enabler/system/maintenance` (admin/system role **and** `x-service-key` header) |
| Auth | `requireAuth` on every enabler and hub route |
| KYC gate | Level 1 + listing capacity for `POST /enablers/:enablerId/listings` |
| ID format | `<prefix>_<ULID-26>`, e.g. `enb_01J…` — pattern `^[a-z]{2,6}(_[a-z]{2,6})?_[0-9A-HJKMNP-TV-Z]{26}$` |
| Success envelope | `{ "success": true, "data": … }` on the lifecycle, referral, hub, earnings and promotion controllers |
| Error envelope | Most enabler controllers return plain `{ "error": "<message>" }`; Joi validation and the KYC middleware return `{ "success": false, "error": { code, message, details? } }` |

---

## 3. Authentication & Authorization

| Endpoint | Auth chain | Notes |
|---|---|---|
| `POST /enablers/register` | `requireAuth` + Joi | Any authenticated user |
| `POST /enablers/:id/approve` | `requireAuth` + Joi | Admin approval |
| `GET /enablers/:id` | `requireAuth` + Joi | Profile (stub returned if not registered yet) |
| `GET /enablers/:enablerId/capabilities` | `requireAuth` + `authorizeEnablerIdentity` | Enabler-self; **works in every status**, including RESTRICTED/SUSPENDED |
| `POST /enablers/:enablerId/terms` | `requireAuth` + `authorizeEnablerIdentity` | Enabler-self |
| `POST /enablers/:enablerId/activation` | `requireAuth` + `authorizeEnablerIdentity` | Enabler-self; empty body |
| `POST /enablers/:enablerId/enforcement` | `requireAuth` + `requireRoleOrService(['admin','system'])` | Admin/system only |
| `GET /enablers/:enablerId/enforcement-history` | `requireAuth` + `requireRoleOrService(['admin','system'])` | Admin/system only |
| `POST /enablers/:enablerId/listings` | `requireAuth` + `authorizeEnabler` + KYC L1 + capacity check | Operational enabler |
| All other `/enablers/:enablerId/*` routes (listings, orders, earnings, promotion-jobs, referral-link) | `requireAuth` + `authorizeEnabler` | Status must be `APPROVED` or `ACTIVE` |
| `GET /hub/products` | `requireAuth` | Any authenticated user |

**Middleware semantics**

- `authorizeEnablerIdentity` resolves the enabler from the **authenticated user** — never from a client-supplied `enablerId`; a mismatched `:enablerId` param returns `403`. It deliberately does *not* require an operational status, so a RESTRICTED/SUSPENDED enabler can still read why it was cut off.
- `authorizeEnabler` (operational routes) additionally rejects any status other than `APPROVED`/`ACTIVE` with `403`.
- `requireEnablerCapability(capability)` is defined in the middleware layer and is available for use on individual routes. It delegates to `EnablerLifecyclePolicy.canPerform(status, capability)` and returns `403` with `{ error, code: "STATUS_NOT_PERMITTED", capability, status }` on denial. It is **not currently applied** to any route in `enabler.routes.ts` — operational access is gated solely by `authorizeEnabler` (status `APPROVED`/`ACTIVE`). The capability matrix in §4.3 reflects domain policy; HTTP enforcement of per-capability granularity is not yet wired at the route level.

**Route-ordering note:** capability/enforcement routes are registered **before** the operational-only `authorizeEnabler` guard — this is intentional, so a RESTRICTED/SUSPENDED enabler can still read its status and admins can always enforce.

---

## 4. Lifecycle & Capability Model

### 4.1 Statuses

| Status | Meaning |
|---|---|
| `PENDING` | Registered, awaiting admin approval |
| `APPROVED` | Admin-approved; may list products; **not** yet operational |
| `ACTIVE` | Terms accepted + training completed; fully operational |
| `RESTRICTED` | Capability-limited by admin (keeps discovery/sharing) |
| `SUSPENDED` | Cut off by admin; no capabilities |
| `REJECTED` | Approval refused (terminal) |
| `DEACTIVATED` | Terminal; no capabilities |

### 4.2 Status machine

```text
PENDING ──approve──► APPROVED ──activate──► ACTIVE ⇄ RESTRICTED
   │                                         │  ▲          │
   └─► REJECTED (approval refused)           ▼  │          │
                                          SUSPENDED ◄─────┘
                                                │  REACTIVATE → ACTIVE
                 any non-terminal status ──────► DEACTIVATED (terminal)
```

### 4.3 Capability matrix (`EnablerLifecyclePolicy`)

| Status | View eligible products | Share product | Build order draft | Generate customer link | Access permanent link | Qualify earning |
|---|---|---|---|---|---|---|
| `PENDING` | – | – | – | – | – | – |
| `APPROVED` | ✓ | – | – | – | – | – |
| `ACTIVE` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `RESTRICTED` | ✓ | ✓ | – | – | – | – |
| `SUSPENDED` / `REJECTED` / `DEACTIVATED` | – | – | – | – | – | – |

`RESTRICTED` keeps read/sharing capabilities (sharing only records attribution — it cannot move money or create orders) but loses Order Builder and customer links.

### 4.4 Activation gates (`canActivate`)

Activation from `APPROVED` succeeds only when **all** of the following hold:

1. Current status is `APPROVED`.
2. Terms are accepted (`termsAcceptedAt` set) **and** the accepted `termsVersion` equals the required version — `ENABLER_REQUIRED_TERMS_VERSION` (default `2026-01`).
3. Training is completed when mandatory modules exist. The outcome is read from the shared training domain; the client can never assert it.

### 4.5 Admin enforcement transitions (`canApplyEnforcement`)

| Action | Permitted from | Resulting status |
|---|---|---|
| `RESTRICT` | `ACTIVE` | `RESTRICTED` |
| `SUSPEND` | `ACTIVE`, `RESTRICTED`, `APPROVED` | `SUSPENDED` |
| `REACTIVATE` | `SUSPENDED`, `RESTRICTED` | `ACTIVE` |
| `DEACTIVATE` | any status except `DEACTIVATED` | `DEACTIVATED` (terminal) |

Invalid transitions are refused with `409` **even for admins**.

---

## 5. API Reference

All paths below are relative to `/api/enabler`.

### 5.1 Register as an enabler

`POST /enablers/register` → **201**

```jsonc
{
  "userId": "usr_01J…",
  "businessName": "Karibu Sales Co.",
  "contactEmail": "sales@example.com",
  "contactPhone": "+255712345678",
  "businessDescription": "We facilitate sales in Dar es Salaam",
  "taxId": "123456789",
  "yearsInBusiness": 3,
  "hasBusinessLicense": true,
  "salesExperience": 2.5
}
```

Server-enforced validation (unknown fields are rejected):

| Field | Rule |
|---|---|
| `userId` | Required system id (ULID format) |
| `businessName` | Required, ≤ 255 chars, non-blank |
| `contactEmail` | Required, valid email, 14–76 chars |
| `contactPhone` | Optional; `+255[67]` followed by 8 digits when present |
| `businessDescription` | Optional, ≤ 1000 chars, non-blank |
| `taxId` | Optional; exactly 9 digits when present |
| `yearsInBusiness` | Optional, ≥ 0 |
| `hasBusinessLicense` | Required, must be `true` |
| `salesExperience` | Required, ≥ 0.5 (years) |

> ⚠️ **Known validator quirk (as-built):** `contactEmail` must currently also match `@example.com` (`EXAMPLE_DOT_COM_EMAIL_PATTERN` in `enabler.routes.ts`) — a contract-test accommodation. Real client domains are rejected with `400` until this pattern is relaxed.

The response includes `status: "PENDING"` (lowercase as returned by the controller) and the assigned `id`. No `enablerCode` yet — codes are assigned on approval.

### 5.2 Approve an enabler (admin)

`POST /enablers/:id/approve` → **200**

```jsonc
{ "adminId": "usr_admin_01J…", "completenessEvents": ["terms_accepted", "registration_complete"] }
```

`adminId` is optional; `completenessEvents` is an optional string array. When omitted, the Joi schema defaults it to `[]` but the controller falls back to `['registration_complete', 'terms_accepted']` — pass the field explicitly if you need a specific value. On approval the server assigns `enablerCode` (`ENB-…`) and `enablerCodeShort` (`E…`) and moves the enabler to `APPROVED`. Activation is a separate step.

### 5.3 Get enabler profile

`GET /enablers/:id` → **200**

```jsonc
{
  "success": true,
  "data": {
    "id": "enb_01J…",
    "userId": "usr_01J…",
    "businessName": "Karibu Sales Co.",
    "status": "ACTIVE",
    "tier": "SILVER",
    "commissionRate": 0.17,
    "enablerCode": "ENB-2026-001",
    "enablerCodeShort": "KSC01",
    "performanceMetrics": { "totalSales": 25000, "totalOrders": 48, "conversionRate": 0.12, "customerRating": 4.3 },
    "approvedAt": "2026-09-01T10:00:00Z"
  }
}
```

### 5.4 List a product

`POST /enablers/:enablerId/listings` → **201**

Requires KYC level 1 and available listing capacity (capacity is per KYC tier; exceeded → `KYC_LISTING_CAP_REACHED`).

```jsonc
{
  "productId": "prd_01J…",
  "customPrice": 45000,
  "priceMarkup": 0.1,
  "minOrderQuantity": 1,
  "deliveryTimeframe": "2-3 business days",
  "returnPolicy": "7-day returns",
  "warrantyPeriod": 12,
  "visibility": true
}
```

- `priceMarkup` is 0–0.5 (0 %–50 %). Provide **either** `customPrice` or `priceMarkup`, not both.
- `minOrderQuantity` is an integer ≥ 1; `warrantyPeriod` an integer ≥ 0.

### 5.5 Get enabler listings

`GET /enablers/:enablerId/listings` → **200**

### 5.6 Facilitate an order

`POST /enablers/:enablerId/orders` → **201**

```jsonc
{
  "listingId": "lst_01J…",
  "buyerId": "usr_01J…",
  "quantity": 2,
  "shippingAddressId": "addr_01J…",
  "billingAddressId": "addr_01J…"
}
```

- `quantity` is an integer ≥ 1; the two address fields are optional non-blank strings.
- Requires an **ACTIVE** enabler — an `APPROVED`-only enabler is rejected with `422`.

### 5.7 Get orders / commission breakdown

`GET /enablers/:enablerId/orders` → **200**

`GET /enablers/:enablerId/orders/:orderId/commission` → **200** — `404` if the order does not exist or does not belong to this enabler.

```jsonc
{
  "baseCommission": 4090.91,
  "tierBonus": 409.09,
  "performanceBonus": 0,
  "totalCommission": 4500,
  "commissionRate": 0.187
}
```

Components are computed by `CommissionCalculationEngine` from the order amount, the enabler's tier and `commissionRate`, and performance metrics; the total is capped at 25 %.
### 5.8 Earnings

Both earnings endpoints wrap their payload in `{ "success": true, "data": …, "meta": { "timestamp": "…" } }`.

| Endpoint | `data` shape |
|---|---|
| `GET /enablers/:enablerId/earnings/summary` | `{ currency, totalCommission, totalPaid, totalPending, totalApproved, totalOnHold, totalDisputed, totalForfeited, totalOutstanding, counts{…}, lastPaidAt }` — load first for KPI cards |
| `GET /enablers/:enablerId/earnings?status=pending&page=1&limit=20` | `{ items[], summary, pagination{ page, limit, total, totalPages } }` |

Ledger query parameters: `status` — one of `pending`, `approved`, `paid`, `on_hold`, `disputed`, `forfeited`; `page` (default 1); `limit` (1–100, default 20). Use the `pagination` block for paging — there is no cursor pagination on these endpoints.

### 5.9 Promotion jobs

| Endpoint | Status | Description |
|---|---|---|
| `GET /enablers/:enablerId/promotion-jobs` | 200 | List available/accepted jobs |
| `POST /enablers/:enablerId/promotion-jobs/:jobId/accept` | **201** | Accept a job |

List query parameters: `view` (`available` \| `accepted` \| `all`), `sellerId`, `status` (`ACTIVE` \| `SCHEDULED`), `page`, `limit` (1–100).

Accept body: `{ "note": "optional, ≤ 500 chars, non-blank" }`. Both endpoints return `{ "success": true, "data": …, "meta": { "timestamp": "…" } }`.

### 5.10 Referral links

`POST /enablers/:enablerId/referral-link` → **200**

```jsonc
{ "landingPath": "/p/ergonomic-chair", "campaignName": "launch-week", "includeQR": true }
```

All three body fields are **optional** — you may call this endpoint with an empty body `{}`. `landingPath` when provided must start with `/` and contain only URL-safe characters (`^\/[A-Za-z0-9\-._~/?=&%]*$`); `campaignName` ≤ 120 chars, non-blank; `includeQR` defaults to `true` — the controller omits the `qrCode` field only when `includeQR: false` is explicitly sent.

Response:

```jsonc
{
  "success": true,
  "data": {
    "enablerId": "enb_01J…",
    "code": "ENB-ABC123",
    "shortCode": "EABC123",
    "shareUrl": "https://maysar.co.tz/p/ergonomic-chair?enablerCode=ENB-ABC123",
    "shortUrl": "https://maysar.co.tz/p/ergonomic-chair?enablerCode=EABC123",
    "landingPath": "/p/ergonomic-chair",
    "campaignName": "launch-week",
    "generatedAt": "2026-09-12T09:00:00.000Z",
    "updatedAt": "2026-09-12T09:00:00.000Z",
    "tracking": {
      "clicks": 0, "signUps": 0, "checkouts": 0, "conversions": 0,
      "ordersAttributed": 0, "revenueAttributed": 0, "commissionEarned": 0,
      "conversionRate": 0
    },
    "qrCode": "data:image/png;base64,…"
  },
  "meta": { "timestamp": "2026-09-12T09:00:00.000Z" }
}
```

Behaviour:

- Requires an `APPROVED` or `ACTIVE` enabler — otherwise `409` ("only available for approved enablers"); unknown enabler → `404`.
- The link embeds the **public `enablerCode`** (never the internal id) as the `enablerCode` query parameter on `BASE_URL` + `landingPath`.
- If the enabler has no code yet, one is generated and persisted (idempotent repair). `GET /enablers/:enablerId/referral-link?includeQR=true` performs the same repair and returns the current link **plus the `tracking` block** (clicks, signUps, checkouts, conversions, ordersAttributed, revenueAttributed, commissionEarned, conversionRate) — there is no separate per-link stats endpoint.
- When a buyer opens the link and checks out, the **checkout service** resolves the code, validates the enabler is operational and not the buyer, and records attribution on the checkout session and the resulting order.

Funnel events: `POST /enablers/:enablerId/referral-link/events` with `{ "eventType": "click" \| "signup" \| "checkout" \| "conversion" }` (required).

### 5.11 Capability snapshot

`GET /enablers/:enablerId/capabilities` → **200** — works in every status.

```jsonc
{
  "success": true,
  "data": {
    "enablerId": "enb_01J…",
    "userId": "usr_01J…",
    "status": "ACTIVE",
    "isOperational": true,
    "capabilities": {
      "viewEligibleProducts": true,
      "shareProduct": true,
      "buildOrderDraft": true,
      "generateCustomerLink": true,
      "accessPermanentLink": true,
      "qualifyEarning": true
    },
    "activation": {
      "termsVersion": "2026-01",
      "termsAcceptedAt": "2026-09-10T08:00:00Z",
      "trainingStatus": "completed",
      "trainingCompletedAt": "2026-09-11T14:30:00Z",
      "activatedAt": "2026-09-12T09:00:00Z",
      "requirementsSatisfied": true
    },
    "lifecycle": {
      "restrictedAt": null, "restrictedReason": null,
      "suspendedAt": null, "suspendedReason": null,
      "deactivatedAt": null, "deactivatedReason": null
    }
  }
}
```

`trainingStatus` mirrors the shared training domain: `not_started`, `in_progress`, `completed`, `failed`, `expired`. When `requirementsSatisfied` is `false` while status is `APPROVED`, drive the activation CTA from this snapshot — never from local logic. The frontend renders this answer; it must not decide capabilities itself.

### 5.12 Accept terms

`POST /enablers/:enablerId/terms` → **200**

```jsonc
{ "termsVersion": "2026-01" }
```

`termsVersion` is required, ≤ 32 chars, non-blank; timestamps are always server-generated. Idempotent — re-accepting the same version refreshes the timestamp. Rejected with `409` while `SUSPENDED` / `REJECTED` / `DEACTIVATED`.

### 5.13 Activate

`POST /enablers/:enablerId/activation` → **200** (empty body `{}`)

The request body carries **no eligibility fields**: the required terms version comes from `ENABLER_REQUIRED_TERMS_VERSION` (default `2026-01`) and the training outcome is evaluated server-side by `EnablerTrainingGateService` against the shared training domain. Success → status `ACTIVE`; unmet requirements → `409` with the precise reason (terms not accepted / version mismatch / training incomplete).

### 5.14 Admin enforcement

`POST /enablers/:enablerId/enforcement` (admin/system) → **200**

```jsonc
{ "action": "SUSPEND", "reason": "Investigating attribution anomaly" }
```

- `action`: `RESTRICT` \| `SUSPEND` \| `REACTIVATE` \| `DEACTIVATE`; `reason` optional, ≤ 500 chars, non-blank.
- Returns `{ "success": true, "data": { "enablerId", "previousStatus", "status", "action" } }`.
- Enforcement changes **capability state only** — the underlying Maysar user, wallet, orders and seller/courier duties are untouched. Every decision is written to an immutable enforcement trail and emitted as an event.
- Invalid transitions (e.g. `REACTIVATE` on `PENDING`) → `409` even for admins (§4.5).

### 5.15 Enforcement history

`GET /enablers/:enablerId/enforcement-history?limit=50` (admin/system) → **200**

`limit` is 1–100 (default 50). Returns the audit-trail entries — action, previous/new status, reason, actor and timestamp.

### 5.16 Hub products

`GET /hub/products` → **200** — buyer-facing discovery across all enabler listings (`enablerEnabled: true`, `status: "published"`); any authenticated user.

Query parameters (all optional):

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer ≥ 1 | 1 | Page number |
| `limit` | integer 1–100 | 20 | Results per page |
| `search` | string | — | Full-text match against `title`, `description`, `brand` |
| `categoryId` | string | — | Filter by category |

Response shape:

```jsonc
{
  "success": true,
  "message": "Browse Enabler Hub - Active Products",
  "data": {
    "products": [
      {
        "id": "prd_01J…",
        "title": "Ergonomic Chair",
        "description": "...",
        "price": 45000,
        "currency": "TZS",
        "categoryId": "cat_01J…",
        "brand": "ErgoComfort",
        "enablerCommissionRate": 0.05,
        "codAccepted": false,
        "freeDelivery": true,
        "mediaUrls": ["https://…"]
      }
    ],
    "total": 142,
    "page": 1,
    "limit": 20
  }
}
```

Note: this response does **not** include a `meta.timestamp` wrapper — the hub controller returns the envelope directly without the `meta` field used by other controllers.

### 5.17 System maintenance (internal)

`POST /system/maintenance/cleanup/outbox/report` and `POST /system/maintenance/cleanup/outbox` — see the System document (§7 Configuration). Guarded by `requireRoleOrService(['admin','system'])` **and** an `x-service-key` header validated against `ALLOWED_SERVICE_KEYS`.

> **There are no** `/api/enabler/profile`, `/api/enabler/referral-links`, `/api/enabler/tier` or `/api/enabler/health/*` routes — earlier revisions of this document listed those; they were never part of the mounted router. Profile data comes from `GET /enablers/:id`, tier from the profile payload, and health from the monolith's `/health`.

---

## 6. Error Handling

| Condition | HTTP | UI action |
|---|---|---|
| Status not `APPROVED`/`ACTIVE` (`authorizeEnabler`) | 403 — `{ error }` | Show the relevant blocked-state message from the capability snapshot |
| Not the enabler / not an enabler (`authorizeEnabler*`) | 403 — `{ error }` | Hide the action; do not retry |
| Activation requirements unmet | 409 — `{ error }` | Show the missing gate (terms not accepted / version mismatch / training incomplete) |
| Terms accepted while `SUSPENDED`/`REJECTED`/`DEACTIVATED` | 409 — `{ error }` | Show a support CTA |
| Invalid enforcement transition (e.g. `REACTIVATE` on `PENDING`) | 409 — `{ error }` | Hide the unavailable admin action |
| Referral link for a non-approved enabler | 409 — `{ error }` | Show the activation/training CTA |
| Enabler / order not found | 404 — `{ error }` | Show "not found" |
| Missing/invalid body or params (Joi) | 400 — `{ success: false, error: { code: "VALIDATION_ERROR", details } }` | Highlight fields |
| KYC level below 1 for listings | 403 — `KYC_LEVEL_REQUIRED` | Redirect to KYC |
| Listing cap reached | 403 — `KYC_LISTING_CAP_REACHED` | Show "upgrade KYC to list more" |
| Read failure | 400/500 — `{ error }` | Retry with backoff |

The lifecycle controller maps errors by message: `not found` → 404; `activation requirements` / `cannot be accepted` / `cannot apply` / `already deactivated` → 409; `required` / `invalid` → 422; anything else → 400. Success responses use `{ "success": true, "data": … }`.

---

## 7. Frontend Integration Patterns

**Dashboard tiles** — render from `GET /enablers/:enablerId/capabilities` + `GET /enablers/:id`:

- Status badge from `status` (and the lifecycle reason when restricted/suspended/deactivated)
- Tier badge (`BRONZE`/`SILVER`/`GOLD`/`PLATINUM`) + `commissionRate` as a percentage
- Progress to next tier: `totalSales` vs threshold, `customerRating` vs requirement, days active
- Earnings KPIs from `GET …/earnings/summary`; ledger with `page`/`limit` + `status` filter

**Tier advancement thresholds (from `TierCalculationAlgorithm`):**

| Current tier | Next tier | Requirements to advance |
|---|---|---|
| `BRONZE` | `SILVER` | `totalSales ≥ TZS 10,000` AND `customerRating ≥ 4.0` AND `daysActive ≥ 30` |
| `SILVER` | `GOLD` | `totalSales ≥ TZS 50,000` AND `customerRating ≥ 4.5` AND `daysActive ≥ 90` |
| `GOLD` | `PLATINUM` | `totalSales ≥ TZS 100,000` AND `customerRating ≥ 4.8` AND `daysActive ≥ 180` |

**Tier base commission rates (from `CommissionTierValueObject`):**

| Tier | Base rate | Multiplier | Effective rate on 15% base |
|---|---|---|---|
| `BRONZE` | 15% | 1.0 | 15% |
| `SILVER` | 17% | 1.1 | up to 18.7% |
| `GOLD` | 19% | 1.2 | up to 22.8% |
| `PLATINUM` | 22% | 1.3 | capped at 25% |

Commission rate is capped at **25%** regardless of multiplier. A `disputeRate > 10%` demotes any tier back to `BRONZE`.

**Activation flow** (terms → training → activate):

1. `POST …/terms` with the required version, then
2. the enabler completes the mandatory training modules in the training domain, then
3. `POST …/activation` with an empty body. Surface the `409` reason verbatim.

**Order facilitation** — gate behind `capabilities.buildOrderDraft` (i.e. `status === ACTIVE`), not merely `APPROVED`.

**Integration checklist:**

- [ ] Drive every gate from the `capabilities` snapshot — never decide locally
- [ ] Accept terms before offering the activation call
- [ ] Gate listing creation behind the KYC L1 check; handle `KYC_LISTING_CAP_REACHED`
- [ ] Gate order facilitation behind `ACTIVE`
- [ ] Use `page`/`limit` pagination (the `pagination` block) — there is no cursor pagination
- [ ] Show `enablerCode` / `enablerCodeShort` after approval (used for referrals)
- [ ] Render `RESTRICTED`/`SUSPENDED` reasons from the snapshot's `lifecycle` block
- [ ] Handle `authorizeEnabler` 403 (not this enabler) without retry loops
- [ ] Show tier badge and commission rate on profile; show tier upgrade progress

---

## 8. Route Map

| Method | Path (relative to `/api/enabler`) | Auth | Description |
|---|---|---|---|
| POST | `/enablers/register` | JWT | Register enabler |
| POST | `/enablers/:id/approve` | JWT (admin) | Approve; assigns codes |
| GET | `/enablers/:id` | JWT | Profile |
| GET | `/enablers/:enablerId/capabilities` | JWT (enabler identity) | Capability snapshot (any status) |
| POST | `/enablers/:enablerId/terms` | JWT (enabler identity) | Accept terms version |
| POST | `/enablers/:enablerId/activation` | JWT (enabler identity) | Activate (empty body) |
| POST | `/enablers/:enablerId/enforcement` | JWT (admin/system) | Restrict / suspend / reactivate / deactivate |
| GET | `/enablers/:enablerId/enforcement-history` | JWT (admin/system) | Enforcement audit trail |
| POST | `/enablers/:enablerId/listings` | JWT + KYC L1 + capacity | List product |
| GET | `/enablers/:enablerId/listings` | JWT | Get listings |
| POST | `/enablers/:enablerId/orders` | JWT | Facilitate order |
| GET | `/enablers/:enablerId/orders` | JWT | Get orders |
| GET | `/enablers/:enablerId/orders/:orderId/commission` | JWT | Commission breakdown |
| GET | `/enablers/:enablerId/earnings/summary` | JWT | Earnings summary |
| GET | `/enablers/:enablerId/earnings` | JWT | Earnings ledger (`status`, `page`, `limit`) |
| GET | `/enablers/:enablerId/promotion-jobs` | JWT | List promotion jobs |
| POST | `/enablers/:enablerId/promotion-jobs/:jobId/accept` | JWT | Accept job (`note`) → **201** |
| GET | `/enablers/:enablerId/referral-link` | JWT | Get/repair referral link + tracking |
| POST | `/enablers/:enablerId/referral-link` | JWT | Generate referral link |
| POST | `/enablers/:enablerId/referral-link/events` | JWT | Track funnel event |
| GET | `/hub/products` | JWT | Browse hub products (`page`, `limit`, `search`, `categoryId`) |
| POST | `/system/maintenance/cleanup/outbox/report` | JWT admin/system + service key | Outbox cleanup report |
| POST | `/system/maintenance/cleanup/outbox` | JWT admin/system + service key | Outbox cleanup (batched, dry-run capable) |
