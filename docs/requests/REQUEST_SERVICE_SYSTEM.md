# Maysar Request Service — Implementation Reference (As-Built)

> **Status:** Live and verified — Phase 1 (request lifecycle) and Phase 2 (supplier & sourcing) implemented (103/103 tests).
> **Last updated:** September 2026
> **Scope:** `services/request-service` + `prisma/schema.prisma` (`Request_*` models)
> **Where this fits:** this is the *as-built* companion to the [Engineering Backlog](./MAYSAR_REQUEST_BACKLOG.md). The backlog records *what was planned and completed*; this document records *how the system is actually built* and how the pieces connect.

---

## 1. Guiding Principles Enforced by the Code

The request domain keeps a small set of hard invariants. They are enforced by entity constructors and use-case gates, not by convention.

| Principle | Where it lives in code |
|---|---|
| **Quotes are immutable once PUBLISHED** | `RequestQuote.publish()` freezes the row; repricing creates a **new** quote and supersedes the old one — the old row never mutates |
| **DRAFT quotes are invisible to customers** | `ListCustomerQuotesUseCase` only returns `PUBLISHED`+ quotes |
| **Internal numbers never leak** | `Request_Quote.procurementCostTzs` is internal; customer-facing payloads expose `sellingPriceTzs` + `deliveryDate` only |
| **Assessment links are single-use and token-hashed** | Only the SHA-256 `tokenHash` is stored; the raw token is shown exactly once; resolve/convert transitions the link `ACTIVE → USED/EXPIRED` |
| **Access link == acceptance** | The public convert endpoint is idempotent (`created: true/false`) and is the **only** path that turns a quote into an Order |
| **Sourcing gates publishing** | `PublishQuoteUseCase` refuses to publish until every item has a `CONFIRMED` source (`Request_Source.availability = 'CONFIRMED'` or Maysar inventory) |
| **Suppliers are not sellers** | Suppliers never have an auth account and are never customer-facing (§B, `Request_Supplier`) |
| **Conversations are append-only** | `Request_Message` has no update/delete path |
| **Events are best-effort outbox** | A publish failure never fails the primary operation; consumers reconcile from tables |

---

## 2. Domain Model (Prisma `Request_*` models)

All models live in `prisma/schema.prisma` (lines ~4955–5175), mapped to `request_*` tables. Prefixes: `REQ-` request, `RQI-` item, `RQO-` quote, `RQS-` source, `SUP-` supplier, `RQP-` procurement, `RAL-` link, `RQM-` message.

### 2.1 Phase 1 — Request lifecycle

| Model | Purpose |
|---|---|
| `Request_Request` | The buyer's request: customer, title, delivery address (JSON), budget, status, assignment; carries `orderId` + `convertedQuoteId` once converted |
| `Request_Item` | First-class line items (never require a catalog product — §B-1); `sourceType` ∈ `CATALOG_PRODUCT | KNOWN_SUPPLIER | EXTERNAL_SUPPLIER | MAYSAR_INVENTORY` |
| `Request_Quote` | A Maysar offer: items JSON, `procurementCostTzs` (internal), `logisticsCostTzs`, `sellingPriceTzs`, `validUntil`, immutable once published |
| `Request_Message` | Append-only conversation thread (author type/id, body, attachments) |
| `Request_Assessment` | Provider assessment record — `internalNotes` never leave the service |
| `Request_AccessLink` | Secure single-use check-out link — **SHA-256 hash of the token only** |
| `Request_OutboxEvent` | Append-only event outbox (`request.submitted`, `quote.published`, …) |

### 2.2 Phase 2 — Supplier registry & sourcing

| Model | Purpose |
|---|---|
| `Request_Supplier` | Third-party supplier registry — no auth account, never customer-facing |
| `Request_Source` | Sourcing record linking an item to a supplier (or Maysar inventory when `supplierId = null`); `availability` ∈ `CONFIRMED | PENDING | UNAVAILABLE`. Multiple sources may exist per item; one is committed at publish |
| `Request_Procurement` | Post-order map `Order → Item → Supplier` — Maysar-internal, customer never sees it; `procurementStatus` ∈ `PENDING → ORDERED → RECEIVED | FAILED` |
---

## 3. Domain Entities & State Machines

All entities live in `services/request-service/src/domain/entities/` and follow the immutable-data-holder pattern: a `private readonly data` object plus named domain methods. No direct `status` writes.

### 3.1 Request (`request.entity.ts`)

```
SUBMITTED → ASSESSING ⇄ NEEDS_CLARIFICATION → ASSESSING
         → FULFILLABLE → QUOTE_PUBLISHED → … → CONVERTED
         → UNFULFILLABLE        (dead end — cannot be quoted)
         → CANCELLED            (customer-cancellable from SUBMITTED | ASSESSING | NEEDS_CLARIFICATION)
         → EXPIRED
```

Named transitions: `markAssessing()`, `markNeedsClarification()`, `markFulfillable()`, `markUnfulfillable(reason)`, `markCancelled()`, `markQuotePublished()`, `markConverted(orderId, quoteId)`, `markExpired()`. Constructor invariants: non-empty title, valid delivery address (city+region), valid initial status. `UNFULFILLABLE` requests can never be quoted.

### 3.2 Quote (`request-quote.entity.ts`)

```
DRAFT → PUBLISHED → CONVERTED
     → EXPIRED
     → SUPERSEDED        (a re-priced quote replaces the old one)
```

- `publish()` throws unless `status === 'DRAFT'`; after publish the object is immutable (`publishedAt` set).
- `convert()` throws unless `PUBLISHED`.
- Create-time invariants: `sellingPriceTzs ≥ procurementCostTzs + logisticsCostTzs`, `validUntil` in the future, non-empty items.
- `SUPERSEDED`/`EXPIRED` transitions are read-only derivations — the old row is never mutated in place.

### 3.3 Item / Source / Supplier / Procurement (Phase 2)

| Entity | Key invariants |
|---|---|
| `request-item.entity.ts` | `sourceType` ∈ the four-way union; `catalogProductId` only set for `CATALOG_PRODUCT`; quantity > 0 |
| `request-source.entity.ts` | `availability` ∈ `CONFIRMED | PENDING | UNAVAILABLE`; `supplierId` null **only** for `MAYSAR_INVENTORY`; `markConfirmed()` validates supplier existence |
| `request-supplier.entity.ts` | `source` ∈ `KNOWN | DISCOVERED`; never references an auth account |
| `request-procurement.entity.ts` | Status chain `PENDING → ORDERED → RECEIVED | FAILED`; `agreedPriceTzs` immutable from creation |

### 3.4 Access link (`request-access-link.entity.ts`)

- Only the SHA-256 `tokenHash` is stored — the raw token is displayed exactly once at creation.
- Status `ACTIVE → USED | EXPIRED`; single-use enforced by transition (a second resolve/convert on a used link throws `LINK_CONSUMED`).

### 3.5 Message (`request-message.entity.ts`)

Append-only. Fields: authorType (`CUSTOMER`/`PROVIDER`/`SYSTEM`), authorId, body, attachments. No mutation methods exist.

---

## 4. Repositories

Domain interfaces in `services/request-service/src/domain/repositories/`, Prisma implementations in `services/request-service/src/infrastructure/repositories/prisma-*.repository.ts`. All resolve the shared client via `(globalThis).prisma` (set by `RequestModule.initialize`).

| Repository | Notes |
|---|---|
| `request.repository.ts` | `create/listByCustomer/getByCustomerId/cancel` with customer-scoping |
| `request-quote.repository.ts` | Create DRAFT, list by request+status, find published, save transitions |
| `request-item.repository.ts` | Create item rows, attach to quote, list by request |
| `request-message.repository.ts` | Append + cursor-paginated list, request-scoped |
| `request-assessment.repository.ts` | Record assessment, list per request |
| `request-access-link.repository.ts` | `save` (hash), `findByTokenHash`, status transitions |
| `request-supplier.repository.ts` | Register/list/update suppliers |
| `request-source.repository.ts` | Attach source, list per item, `setAvailability` |
| `request-procurement.repository.ts` | Create/list by order, advance status |

---

## 5. Application Layer (use cases)

All use cases live in `services/request-service/src/application/use-cases/`; controllers construct them with `Prisma*Repository` instances in `request.routes.ts` (`getCustomerController` / `getProviderController`).

### 5.1 Customer lifecycle

| Use case | What it does |
|---|---|
| `create-request.use-case.ts` | Validates title + delivery address, creates request + item rows, emits `request.submitted` |
| `list-requests.use-case.ts` / `get-request.use-case.ts` | Customer-scoped list (limit/cursor) and detail |
| `cancel-request.use-case.ts` | Guards cancellable states, transitions `CANCELLED`, emits `request.cancelled` |
| `post-message.use-case.ts` / `list-messages.use-case.ts` | Append + read conversation |
| `list-customer-quotes.use-case.ts` | Returns **PUBLISHED+ only** (never DRAFT/superseded) |
| `resolve-assessment-link.use-case.ts` | Token → hash → find active link → return quote summary; `LINK_EXPIRED`/`LINK_CONSUMED` (410) |
| `convert-quote-to-order.use-case.ts` | **Idempotent** acceptance: creates a normal `Order_Order` + item/subtotals row in a transaction, marks quote `CONVERTED`, request `CONVERTED`, link `USED`, emits `request.converted`. Returns `{ orderId, quoteId, created }` |

### 5.2 Provider/ops lifecycle

| Use case | What it does |
|---|---|
| `list-provider-requests.use-case.ts` / `get-provider-request-detail.use-case.ts` | Ops inbox + detail (incl. items) |
| `assign-request-provider.use-case.ts` | Claim/assign a request to a provider (sets `assignedProviderId`) |
| `assess-request.use-case.ts` | Marks `FULFILLABLE` or `UNFULFILLABLE(reason)`; emits `request.fulfillable` / `request.unfulfillable` |
| `create-quote.use-case.ts` | Creates DRAFT quote — enforces price integrity + non-empty items + future `validUntil` |
| `get-provider-quote-detail.use-case.ts` | Full quote detail (incl. internal procurement cost) |
| `publish-quote.use-case.ts` | **Publish gate:** every item must have a `CONFIRMED` source (or Maysar inventory); then freezes quote + emits `quote.published` |
| `generate-assessment-link.use-case.ts` | Creates `RAL-` link, stores SHA-256 hash, returns the raw token **exactly once** |

### 5.3 Phase 2 — Sourcing & procurement

| Use case | What it does |
|---|---|
| `register-supplier.use-case.ts` / `list-suppliers.use-case.ts` | Registry with discoverability; suppliers validated never to be auth accounts |
| `set-item-source.use-case.ts` | Attaches a source (supplier or Maysar inventory) to an item; validates supplier existence |
| `advance-procurement.use-case.ts` | Moves a procurement row `PENDING → ORDERED → RECEIVED | FAILED` |
| `list-procurement.use-case.ts` | Post-order procurement state per order |

---

## 6. Events (outbox)

Events are written by `request-outbox.ts` (`publishRequestEvent`) to the append-only `Request_OutboxEvent` table — same pattern as the logistics outbox.

| Event | Emitted by | Payload highlights |
|---|---|---|
| `request.submitted` | `CreateRequestUseCase` | requestId, customerId |
| `request.assessing` / `request.needs_clarification` | `AssessRequestUseCase` | requestId, providerId |
| `request.fulfillable` / `request.unfulfillable` | `AssessRequestUseCase` | requestId, providerId, reason |
| `request.cancelled` | `CancelRequestUseCase` | requestId |
| `quote.published` | `PublishQuoteUseCase` | requestId, quoteId, sellingPriceTzs |
| `request.converted` | `ConvertQuoteToOrderUseCase` | requestId, quoteId, orderId |

Publishing is **best-effort** — a failure logs and never fails the primary operation; consumers reconcile from tables.

---

## 7. HTTP Surface

Mounted at `/api/request` by `app.ts` (`RequestModule` in `services/request-service/index.ts`). Auth is per-route inside `createRequestRoutes()`:

- **Public (no JWT):** `GET  /requests/assess/:token` and `POST /requests/assess/:token/convert` — the token is the credential.
- **Provider/ops:** `requireRole(['provider','admin','ops'])` on the `/provider/requests*` subtree.
- **Customer:** `requireAuth` (buyer JWT) on the remaining `/requests*` routes.

Full route map (27 routes) is in the [Frontend Integration Guide](./REQUEST_SERVICE_FRONTEND_GUIDE.md) §9. Route-order is load-bearing here: `/quotes/:quoteId` is registered **before** `/:requestId` in the provider router so quote detail is never captured by the parameterized segment.
---

## 8. Security Model

| Control | Implementation |
|---|---|
| **Assessment-link secrecy** | Only SHA-256 token hash persisted (`Request_AccessLink.tokenHash`); raw token shown once at generation; `tokenHash` is `@unique` |
| **Single-use acceptance** | Link transitions `ACTIVE → USED`; a replayed convert returns `created: false` for the **same** order (idempotent), never a duplicate order; a consumed/expired link resolves to `LINK_CONSUMED`/`LINK_EXPIRED` (410) |
| **Quote immutability** | PUBLISHED quote rows never update; repricing supersedes (new row) — buyers can never see a silently changed price |
| **Price integrity** | `sellingPriceTzs ≥ procurementCostTzs + logisticsCostTzs` enforced at quote creation; internal cost columns never serialized to customer payloads |
| **Sourcing gate** | No quote publishes without a confirmed source per item — prevents phantom offers |
| **Supplier isolation** | Suppliers have no auth account; never exposed to buyers |
| **Draft invisibility** | Customer quote list filters to `PUBLISHED+` at the use-case layer |
| **Route-order safety** | `/quotes/:quoteId` before `/:requestId` prevents path capture in the provider router |

---

## 9. Verification Evidence

| Artifact | What it proves |
|---|---|
| Fresh `npx jest --selectProjects=request-service` | **103/103 tests pass, 12 suites** (exit 0) |
| `src/application/use-cases/__tests__/mvp-e2e.test.ts` | Full lifecycle end-to-end: create → assess → quote → publish → link → convert (idempotent; second convert returns `created: false`) |
| `convert-quote-to-order.test.ts` | Transactional order creation, idempotency guard, quote/request/link transitions |
| `sourcing.test.ts` | Supplier registry → attach source → confirm → publish gate enforcement |
| `quote-management.test.ts` | DRAFT invisibility, publish immutability, supersede semantics |
| `assessment-link.test.ts` | Hash-only storage, TTL expiry, single-use, 410 codes |
| `request-lifecycle.test.ts` | Full state machine transitions + invalid-transition rejection |
| Entity suites (request, quote, item, source, supplier, procurement, access-link) | Constructor invariants + state machine guards |

**Known pre-existing suite failures:** none for request-service — the project is fully green end-to-end.