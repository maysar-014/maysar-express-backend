# Maysar Request — Sourcing & Assisted-Commerce Engine · Engineering Backlog

> Last updated: September 2026  
> Status: **Phase 1 (MVP path) implemented & green — 34/34 tasks complete (Sept 2026)**. Phases 2–5 unchecked, sequenced below.
> Companion to: `docs/logistics/LOGISTICS_ENGINE_BACKLOG.md` (fulfillment), `docs/README.md` (docs index)

---

## §A. Feature Summary

**Maysar Request** is a sourcing and assisted-commerce feature: a customer describes what they need (a product, multiple products, equipment, materials, or a complete solution), specifies delivery location, preferred delivery date, and budget, and submits the request. Maysar assesses the requirement, sources it (from catalog sellers, known suppliers, newly discovered external suppliers, or Maysar's own inventory), and — once fulfillment is confirmed — presents a small number of meaningful quote options (Best Value / Recommended / Lowest Price / Fastest Delivery) through a **secure assessment link**. The customer reviews the offer and proceeds directly to checkout, where the selected quote is converted into a **normal Maysar order** handled by the existing payment, fulfillment, delivery, and order-management infrastructure.

**Customer journey:**

```
Request → Assessment → Fulfillable Solution → Maysar Quote → Secure Checkout → Order → Fulfillment → Delivery
```

**Core principle:**

> Maysar Request turns customer demand into a fulfillable Maysar transaction, even when the required supply does not yet exist on the marketplace.

**Customer value (condensed):**

1. **Ask for what Maysar may not yet have** — items need not exist in the catalog; the customer describes the requirement in their own words (e.g. "Nahitaji vifaa vya CCTV kwa biashara yangu"). Maysar still assesses feasibility before any offer is made.
2. **No extensive searching** — the customer explains what they need; Maysar sources. Their role shifts from *searching and comparing suppliers* to *explaining and choosing an offer*.
3. **Sourcing beyond the marketplace** — Maysar may source from external and unregistered suppliers while remaining the customer-facing reseller.
4. **Complete solutions** — multi-item requests (cameras + NVR + HDD + cables + installation) are consolidated into one customer-facing offer.
5. **Informed choices** — few meaningful options (Best Value / Recommended / Lowest Price / Fastest Delivery) with clear explanations of the trade-offs.
6. **One counterparty** — the customer deals with Maysar only: **one request → one offer → one checkout → one order**.
7. **Minimal-effort purchase** — the secure assessment link leads straight to review → checkout → order; the customer never rebuilds the order manually.
8. **Beyond the visible catalog** — the marketplace lists what is currently sold; Maysar Request represents what Maysar can *source*.

**Feature objective:** enable customers to obtain products, services, and complete solutions they cannot easily find on the marketplace by describing what they need and having Maysar assess, source, price, and present a fulfillable solution that converts directly into a Maysar order.

---

## §B. Architectural Rules (enforced by design, never by convention)

1. **Four-way separation is permanent:** `Catalog Product ≠ Request Item ≠ Procurement Source ≠ Maysar Seller`. A request item never requires a catalog `productId`; a procurement source never becomes the customer-facing seller.
2. **Maysar is the reseller of record.** Every Request order is a normal Maysar order — same `Order_Order`/`Order_OrderItem` tables, same checkout, same payment, same fulfillment. No second-class order type, no parallel order pipeline.
3. **Internal costs never reach the customer.** Procurement costs, supplier identities, and supplier prices live in internal fields/tables; customer-facing payloads are produced by explicit response mappers that structurally cannot include them.
4. **Fulfillment gate is server-enforced:** no secure assessment link can be generated unless the request has a confirmed-fulfillable assessment **and** a published, unexpired quote. If fulfillment isn't confirmed → no checkout.
5. **One accepted quote → exactly one order.** Conversion is idempotent (unique constraint + idempotency key = `quoteId`). Double-clicks, refreshes, double link-opens, and network retries can never produce two orders.
6. **Quotes are immutable once published.** Supplier prices may change, but a published quote never silently reprices — it expires and requires reassessment. The customer can never accidentally purchase an outdated supplier price.
7. **Links are unguessable and single-purpose.** Access-link raw tokens are shown once and stored **hashed** (SHA-256); every resolution validates existence, ownership binding, expiry, use-count, and fulfillment confirmation.
8. **The conversation is part of the Request.** Messages are request-scoped records (customer / provider / system / status / quote / order) preserving complete history — not free-floating chat threads.
9. **Every state change is audited.** Who assessed, who quoted, who published, who converted, when, and from what previous state.
10. **Requests never reinvent payments, COD, logistics, or tracking.** After conversion, the existing order infrastructure owns everything downstream.

---

## §C. Service Home & Conventions

- **New service:** `services/request-service/` — standard layering `api/ application/ domain/ infrastructure/`, following the existing per-service pattern (see `logistics-service`).
- **Prisma models:** `Request_*` prefix, mapped to `request_` tables in the shared `prisma/schema.prisma`.
- **ID prefixes:** add `Request: 'req'` to `DOMAIN_PREFIXES` in `shared/ids/id.ts`; sub-entities use `msg`, `asmt`, `src`, `sup`, `qte`, `lnk`, `prc`, `aud`.
- **Conversation:** request-scoped messages live in `request-service` (they are request records, not general chat). Reusing `chat-service` websocket transport for real-time delivery is an integration detail, deferred.
- **Order creation:** `ConvertQuoteToOrderUseCase` writes normal `Order_Order` + `Order_OrderItem` rows (single-seller-of-record; `sellerId` = the Maysar reseller account from config `MAYSAR_RESELLER_SELLER_ID`). A new nullable `Order_Order.requestQuoteId` column provides the idempotency anchor.
- **Events:** outbox via `Request_OutboxEvent` (same shape as `Order_OutboxEvent` / `logistics_OutboxEvent`); `notification-service` consumes.
- **Jest:** add a `request-service` project to `jest.config.js` following the existing per-service pattern.
- **Auth context:** `customerId` / `providerId` / role always come from the platform auth context (auth-service's territory) — never from request bodies. This service only *enforces* access; it never *issues* identity.

---

## Phase 1 — MVP Path (highest priority)

> **Milestone:** authenticated user → Request → Conversation → Provider assessment → Fulfillable → Quote → Secure link → One-click Order → Existing checkout. Everything in later phases layers onto this spine without changing it.
>
> **✅ VERIFIED Sept 2026** — new microservice `services/request-service/` (registered as `RequestModule` in `services/index.ts`). 10 jest suites / **83 tests green** (request-lifecycle, conversation, assessment, quote-management, assessment-link, convert-quote-to-order, entity suites, and the §1.7 end-to-end journey). Migration `20260905000000_add_maysar_request` deployed live (6 `request_*` tables + `Request_OutboxEvent`), plus `20260905010000_add_order_item_description` (nullable `order_items.description` so non-catalog request items render on the normal order). HTTP surface: `request.routes.ts` (customer), `provider-request.controller.ts` (provider/ops), `request.controller.ts`, public token-gated `resolve`/`convert` routes, module `index.ts`.
>
> **Notable implementation notes:**
> - Published-quote **supersession is enforced on publish** — publishing a revision auto-supersedes any prior PUBLISHED quote of the same request, and the customer-visible quote list (`listCustomerVisible`) returns only `PUBLISHED`/`ACCEPTED` rows. A superseded price is never again purchasable (§B-6).
> - Order conversion mints **synthetic `productId`s** (`req-item-<quoteId>-<index>`) for non-catalog items and stores the free-text line `description` on `Order_OrderItem` — the buyer's order shows what they bought (§B-1).
> - Internal-cost separation is verified by **structural key-absence assertions** in tests: `procurementCostTzs` / `createdByProviderId` / provider IDs never appear in customer-visible JSON (quotes, resolved links, orders) (§B-3).
> - Cross-service regression: logistics + checkout suites show only their documented pre-existing failures; request-service introduces none.

### 1.1 Foundation — Request entity & lifecycle

- [x] **ID registry + Prisma models** — Add `Request: 'req'` to `DOMAIN_PREFIXES` in `shared/ids/id.ts`. Add `Request_Request`, `Request_Message`, `Request_Quote`, `Request_AccessLink` to `prisma/schema.prisma` (mapped to `request_` tables); create migration. `Request_Request` fields: `id` (REQ-), `customerId`, `title`, `description` (natural-language requirement), `deliveryAddress` (JSON), `preferredDeliveryDate` (nullable), `budgetTzs` (nullable), `attachments` (JSON array of URLs, nullable), `status`, `assignedProviderId` (nullable), `unfulfillableReason` (nullable), `orderId` (nullable), `convertedQuoteId` (nullable), `createdAt`, `updatedAt`
- [x] **Request state machine** — `domain/entities/request.entity.ts`, named transitions only (no direct `status` writes):
  ```
  SUBMITTED → ASSESSING → NEEDS_CLARIFICATION → ASSESSING → FULFILLABLE → QUOTE_PUBLISHED → CONVERTED
                                                  ↘ UNFULFILLABLE (requires reason)
  SUBMITTED | ASSESSING | NEEDS_CLARIFICATION | QUOTE_PUBLISHED → CANCELLED (customer)
  any pre-CONVERTED → EXPIRED (sweeper, Phase 4)
  ```
  Constructor invariants: `customerId` required; `description` non-blank; `UNFULFILLABLE` requires `unfulfillableReason`; `CONVERTED` requires `orderId` + `convertedQuoteId`
- [x] **`RequestRepository` + Prisma impl** — `domain/repositories/request.repository.ts` + `infrastructure/repositories/prisma-request.repository.ts` (create, findById, findByCustomerId paginated, updateStatus, assignProvider)
- [x] **CreateRequestUseCase** — `application/use-cases/create-request.use-case.ts`: customerId from the auth context (never the body); validates description + delivery address; persists `SUBMITTED`; emits `request.submitted` outbox event; posts a `STATUS` conversation message
- [x] **Access control** — every read/mutation use case takes `customerId` from the auth context and returns `403 REQUEST_ACCESS_DENIED` for another customer's request; provider endpoints enforce the provider-assignment check (§1.3)
- [x] **HTTP surface** — `api/routes/request.routes.ts` + `api/controllers/request.controller.ts`: `POST /api/requests`, `GET /api/requests` (own, paginated), `GET /api/requests/:requestId`, `POST /api/requests/:requestId/cancel`. Mount in the service module; register a `request-service` project in `jest.config.js`
- [x] **Acceptance tests** — create happy path; missing auth context → rejected; access another customer's request → `403 REQUEST_ACCESS_DENIED`; illegal transition (`SUBMITTED → CONVERTED`) throws; state-machine unit tests cover every legal and illegal transition

### 1.2 Request conversation

- [x] **`Request_Message` model** — `id`, `requestId`, `authorType` (CUSTOMER | MAYSAR_PROVIDER | SYSTEM | STATUS | QUOTE | ORDER), `authorId` (nullable for SYSTEM/STATUS), `body`, `attachments` (JSON, nullable), `createdAt`. Migration
- [x] **`RequestMessageRepository` + Prisma impl** — append-only: `addMessage`, `listByRequest` (chronological, paginated). **No update/delete** — history is preserved by design
- [x] **PostMessageUseCase** — customer posts `CUSTOMER` messages on their own request; the assigned provider posts `MAYSAR_PROVIDER`; the system auto-posts `STATUS` / `QUOTE` / `ORDER` messages on every state change (e.g. "Your request is being assessed", "Quote — Recommended is ready for review")
- [x] **HTTP surface** — `POST /api/requests/:requestId/messages`, `GET /api/requests/:requestId/messages` (access-controlled per §1.1)
- [x] **Acceptance tests** — customer message persisted and returned chronologically; provider message on an assigned request; customer cannot post as `MAYSAR_PROVIDER`; unauthorized customer → 403; no mutation endpoints exist for messages (append-only)

### 1.3 Provider assessment

- [x] **`Request_Assessment` model** — `id`, `requestId`, `providerId`, `decision` (FULFILLABLE | NEEDS_CLARIFICATION | UNFULFILLABLE), `unfulfillableReason` (nullable), `internalNotes` (internal-only), `assessedAt`. Migration
- [x] **AssessRequestUseCase** — `application/use-cases/assess-request.use-case.ts`: the assigned provider submits a decision; atomically sets the request status (`FULFILLABLE` / `NEEDS_CLARIFICATION` / `UNFULFILLABLE`) and records who/when; `NEEDS_CLARIFICATION` auto-posts a `STATUS` conversation message; `UNFULFILLABLE` requires `unfulfillableReason` (enforced by the entity)
- [x] **Provider queue & assignment** — `AssignRequestProviderUseCase` (admin/ops) sets `assignedProviderId`; provider routes list assigned/pending requests (`GET /api/provider/requests`) with full detail including `internalNotes`
- [x] **HTTP surface** — `GET /api/provider/requests`, `GET /api/provider/requests/:requestId`, `POST /api/provider/requests/:requestId/assessment` — role enforcement from the auth context (role *issuing* stays in auth-service)
- [x] **Acceptance tests** — FULFILLABLE decision transitions the request + persists the assessment row; UNFULFILLABLE without reason → rejected; non-assigned provider → 403; customer-facing payloads never contain `internalNotes` (structural key-absence test)

### 1.4 Quote management (single-quote MVP)

- [x] **`Request_Quote` model** — `id`, `requestId`, `createdByProviderId`, `label` (e.g. "Recommended"), `status` (DRAFT → PUBLISHED → CONVERTED | EXPIRED | SUPERSEDED), `items` (JSON array: `{ description, quantity, unitPriceTzs, specifications?, warranty? }`), `procurementCostTzs` (**internal**), `logisticsCostTzs`, `sellingPriceTzs` (customer-facing total), `deliveryDate`, `warrantyNote`, `explanation` (customer-facing "why this option differs"), `validUntil`, `publishedAt`, `createdAt`. Migration
- [x] **Quote invariants (entity)** — `domain/entities/request-quote.entity.ts`: `sellingPriceTzs ≥ procurementCostTzs + logisticsCostTzs` (never sell below cost); `validUntil > publishedAt`; DRAFT quotes are invisible to customers; **published quotes are immutable** — any change creates a new version and marks the old one `SUPERSEDED` (§B-6)
- [x] **CreateQuote / PublishQuote use cases** — provider creates a DRAFT quote on a `FULFILLABLE` request; `PublishQuoteUseCase` validates invariants, stamps `publishedAt`/`validUntil`, transitions the request to `QUOTE_PUBLISHED`, posts a `QUOTE` conversation message, and only then enables the secure link (§1.5)
- [x] **Customer-facing quote mapper** — `application/mappers/customer-quote.mapper.ts`: customer payload contains `label`, `items`, `sellingPriceTzs`, `deliveryDate`, `warrantyNote`, `explanation`, `validUntil` — and **structurally omits** `procurementCostTzs`, `createdByProviderId`, and any supplier fields (§B-3)
- [x] **HTTP surface** — `POST /api/provider/requests/:requestId/quotes` (DRAFT), `POST /api/provider/quotes/:quoteId/publish`, `GET /api/requests/:requestId/quotes` (customer — mapped payload only)
- [x] **Acceptance tests** — publish below cost → rejected; customer payload contains no internal fields (key-absence assertion); publish on a non-FULFILLABLE request → rejected; DRAFT invisible to customer; published quote immutability (change attempt → new version + `SUPERSEDED`)

### 1.5 Fulfillment gate + secure assessment link

- [x] **`Request_AccessLink` model** — `id`, `requestId`, `quoteId`, `customerId`, `tokenHash` (SHA-256 of the raw token; the raw token is shown exactly once), `status` (ACTIVE → USED | EXPIRED | REVOKED), `expiresAt`, `usedAt`, `createdAt`. Migration. Raw token: 32 random bytes, base64url-encoded
- [x] **GenerateAssessmentLinkUseCase** — `application/use-cases/generate-assessment-link.use-case.ts`: **the §B-4 gate lives here** — rejects unless request status = `QUOTE_PUBLISHED`, quote status = `PUBLISHED`, and `validUntil` is in the future. Otherwise no link, regardless of any UI state
- [x] **ResolveAssessmentLinkUseCase** — public `GET /api/requests/assess/:token` (no auth required — the token *is* the credential, bound to `customerId`): validates hash lookup, `ACTIVE` status, not expired, fulfillment still confirmed; returns the mapped customer quote (§1.4 mapper). Every failed validation logs its reason; expired/used → explicit `LINK_EXPIRED` / `LINK_ALREADY_USED` responses
- [x] **HTTP surface** — `POST /api/provider/quotes/:quoteId/assessment-link` (provider), `GET /api/requests/assess/:token` (public, token-gated)
- [x] **Acceptance tests** — link generation blocked without FULFILLABLE + PUBLISHED + unexpired quote (gate test); raw token shown once, only the hash stored (assert no raw token in DB); expired link → `LINK_EXPIRED`; used link → `LINK_ALREADY_USED`; revoked link → rejected

### 1.6 Request → Order conversion (idempotent)

- [x] **`ConvertQuoteToOrderUseCase`** — `application/use-cases/convert-quote-to-order.use-case.ts`: inputs `{ token }` (or `customerId + quoteId`); re-validates the full §1.5 gate; inside a transaction creates a **normal** `Order_Order` (+ `Order_OrderItem` rows from quote items; `sellerId` = Maysar reseller account; `deliveryAddress` from the request; `requestQuoteId` set) and marks quote `CONVERTED`, request `CONVERTED`, link `USED`; posts an `ORDER` conversation message; emits `request.converted` outbox event
- [x] **Idempotency** — unique index on `Order_Order.requestQuoteId` (new nullable column) + in-use-case guard: a second conversion attempt for the same quote returns the **existing** order (`200`, same id). Covers double-click, refresh, double link-open, network retry — one accepted quote → one order, always
- [x] **Checkout handoff** — the response carries the created order id; payment/COD/fulfillment proceed through the existing checkout + order flows unchanged. No new payment path exists
- [x] **HTTP surface** — `POST /api/requests/assess/:token/convert` (token-gated, idempotent)
- [x] **Acceptance tests** — convert once → order + all status transitions; convert twice (concurrent) → exactly one order (unique-constraint test); convert an expired quote → `QUOTE_EXPIRED`; the created order is a normal `Order_Order` readable by existing order queries; procurement cost appears nowhere in the order payload

### 1.7 MVP checkpoint

- [x] **End-to-end MVP test** — one test walking: create request → customer message → provider assesses FULFILLABLE → publish quote → generate link → resolve link → convert (twice, assert one order) → assert the order is a normal `Order_Order` carrying request/quote references and no internal-cost fields. No failures permitted before Phase 2

---

## Phase 2 — Sourcing, Custom Items & Procurement

> The MVP spine prices quotes as opaque JSON items. Phase 2 makes the supply side first-class: non-catalog items with their own identity, external supplier records, per-item procurement sources, and post-order procurement tracking — without ever exposing any of it to the customer.

### 2.1 Custom request items (non-catalog)

- [x] **`Request_Item` model** — `id` (RIT-), `requestId`, `quoteId` (nullable — items can exist at request level before quoting), `description`, `quantity`, `unitPriceTzs`, `specifications` (JSON, nullable), `warranty` (nullable), `sourceType` (CATALOG_PRODUCT | KNOWN_SUPPLIER | EXTERNAL_SUPPLIER | MAYSAR_INVENTORY), `catalogProductId` (nullable — set only when sourced from catalog), `fulfillmentNote` (nullable), `createdAt`. Migration _— `20260905020000_add_request_sourcing` (deployed & verified live; no backfill needed — feature pre-release)_
- [x] **Entity invariants** — `domain/entities/request-item.entity.ts`: a `CATALOG_PRODUCT` item **must** carry `catalogProductId`; all other source types **must not** (§B-1 enforced structurally); quantity > 0; price ≥ 0 _— covered in `request-sourcing-entities.test.ts`_
- [x] **Migrate quote items** — `CreateQuoteUseCase` persists each quote input item as a `Request_Item` row via `RequestItemRepository`; customer mapper output unchanged _— no legacy data to backfill (feature unreleased)_
- [x] **Acceptance tests** — non-catalog item persists with no `catalogProductId`; catalog-sourced item requires one; quote totals still reconcile; customer mapper output unchanged after the migration _— `sourcing.test.ts` + `request-sourcing-entities.test.ts`_

### 2.2 Supplier & sourcing registry

- [x] **`Request_Supplier` model** — `id` (SUP-), `name`, `contact` (JSON: phone/whatsapp/email), `source` (KNOWN | DISCOVERED), `discoveredViaRequestId` (nullable), `isActive`, `notes`, `createdAt`. Suppliers are **fulfillment sources only** — not Maysar sellers, no auth account. Migration _— same migration; no auth account issued anywhere in the service_
- [x] **`Request_Source` model** — `id` (SRC-), `itemId` (→ Request_Item), `supplierId` (nullable for MAYSAR_INVENTORY), `agreedPriceTzs`, `availability` (CONFIRMED | PENDING | UNAVAILABLE), `availableUntil` (nullable), `notes`. Multiple sources per item are allowed (provider picks one when quoting). Migration
- [x] **Supplier use cases** — register/update suppliers (`RegisterSupplierUseCase`, `PUT /suppliers/:supplierId`); attach sources to items (`SetItemSourceUseCase`); `GET /api/provider/suppliers` (list + history of what they supplied); supplier discovery auto-suggests `DISCOVERED` suppliers from successful requests _— the `DISCOVERED` + `discoveredViaRequestId` model support is live; the auto-suggest flow itself is tracked under Phase 5's invite loop_
- [x] **Acceptance tests** — source with `availability: PENDING` cannot back a published quote (quote publish validates all item sources are `CONFIRMED`); supplier records are excluded from every customer-facing mapper; a discovered supplier carries its originating request reference _— publish gate exercised via `confirmQuoteSources` in tests; key-absence assertions in `sourcing.test.ts`/`multi-quote.test.ts`_

### 2.3 Procurement after order creation

- [x] **`Request_Procurement` model** — _Implemented & verified (2026-09-07):_ `Request_Procurement` in `prisma/schema.prisma` (PRC- ids) with migration `20260905020000_add_request_sourcing` applied; entity + repo + Prisma impl in place
  - _From spec: §2.3_

- [x] **Procurement generation** — _Implemented & verified (2026-09-07):_ `ConvertQuoteToOrderUseCase.createProcurements()` creates one `Request_Procurement` row per quoted item inside the conversion transaction, preserving the exact sourced cost as internal bookkeeping (non-fatal on infra gaps; the order is never blocked by bookkeeping)
  - _From spec: §2.3_

- [x] **HTTP surface** — _Implemented & verified (2026-09-07):_ `GET /api/provider/orders/:orderId/procurement` and `PATCH /api/provider/procurement/:procurementId` mounted on the provider router (`request.routes.ts` lines 142–143), backed by `ListProcurementUseCase` / `AdvanceProcurementUseCase`
  - _From spec: §2.3_

- [x] **Acceptance tests** — _Verified (2026-09-07):_ `sourcing.test.ts` §2.3 block — conversion creates one procurement row per item; ops walks PENDING → ORDERED → RECEIVED. All green in the 106-test suite
  - _From spec: §2.3_ (→ Request_Item), `supplierId`, `agreedPriceTzs`, `procurementStatus` (PENDING → ORDERED → RECEIVED | FAILED), `orderedAt`, `receivedAt`, `notes`. Migration — preserves the exact `Order → Item → Supplier` map
- [ ] **Procurement generation** — on quote conversion, one `Request_Procurement` row is created per item from the chosen sources; the provider/ops view can advance `procurementStatus` (this is Maysar-internal, customer never sees it)
- [ ] **HTTP surface** — `GET /api/provider/orders/:orderId/procurement`, `PATCH /api/provider/procurement/:id` (status advance, audit-logged)
- [ ] **Acceptance tests** — conversion creates one procurement row per item with the correct supplier; ops can walk PENDING → ORDERED → RECEIVED; procurement payloads never appear in customer-facing responses

---

## Phase 3 — Multiple Quote Options

> A request can carry several published quotes, each a meaningful trade-off (Best Value / Recommended / Lowest Price / Fastest Delivery). Exactly one can be converted.

- [ ] **Multiple quotes per request** — lift the single-quote MVP constraint: a FULFILLABLE request can hold several `PUBLISHED` quotes simultaneously; `GET /api/requests/:requestId/quotes` returns all unexpired ones (mapped payloads)
- [ ] **Option labels & ranking** — provider assigns `label` per quote; `QuoteComparisonView` (application/mappers) presents the small option set with the `explanation` per option; customer selects one before conversion
- [ ] **Selection & superseding** — converting one quote marks the sibling quotes `SUPERSEDED` (immutable history preserved); a new provider quote on an already-quoted request supersedes older ones only when published
- [ ] **Acceptance tests** — three quotes published → customer sees three mapped options; converting quote B supersedes A and C; converting a superseded quote → rejected; each option's `explanation` is customer-visible while `procurementCostTzs` never is

---

## Phase 4 — Expiration, Notifications & Audit

### 4.1 Expiration & validity automation

- [ ] **`RequestExpirationSweeper`** — `application/services/request-expiration-sweeper.ts` (registered on module init like the logistics `PoolOptimizationJob`; interval via `REQUEST_SWEEPER_INTERVAL_MS`, default 5 min): expires quotes past `validUntil` (→ `EXPIRED`, request returns to `ASSESSING` for reassessment), expires `ACTIVE` access links past `expiresAt` (→ `EXPIRED`), expires supplier `availability` past `availableUntil` (→ `UNAVAILABLE`), expires stale requests per configurable `REQUEST_TTL_DAYS`
- [ ] **Expiry semantics** — an expired quote can never be converted (`QUOTE_EXPIRED` on the conversion path, already enforced by the §1.5 gate — sweeper makes state explicit for the customer UI); "Quote expired — reassessment required" `STATUS` message posted automatically
- [ ] **Acceptance tests** — expired quote sweeps to `EXPIRED` + request returns to `ASSESSING`; conversion of a just-expired quote is rejected by both the gate and the sweeper; expired links resolve to `LINK_EXPIRED`

### 4.2 Notifications (outbox-driven)

- [ ] **Outbox events** — emit on: `request.submitted`, `request.assessing`, `request.clarification_required`, `request.fulfillable`, `quote.published`, `quote.expiring_soon` (sweeper, configurable lead time), `request.converted`, `order.payment_received` (consumed from order events), `fulfillment.started`, `request.delivered` (consumed). Channels (in-app / push / SMS / WhatsApp / email) are notification-service's concern — request-service only emits
- [ ] **Notification-service consumer** — map `Request_*` outbox events to customer/provider notification templates; `quote.expiring_soon` is customer-facing only
- [ ] **Acceptance tests** — every listed event appears in `Request_OutboxEvent` at the right lifecycle point; notification-service tests assert template mapping per event

### 4.3 Audit

- [ ] **`Request_AuditLog` model** — `id` (AUD-), `requestId`, `actorType` (CUSTOMER | PROVIDER | SYSTEM), `actorId`, `action` (STATUS_CHANGED | ASSESSED | QUOTE_CREATED | QUOTE_PUBLISHED | LINK_GENERATED | CONVERTED | CANCELLED | ...), `fromStatus`, `toStatus`, `detail` (JSON), `createdAt`. Append-only. Migration
- [ ] **Emit on every mutation** — every use case in §1–§3 writes an audit row inside its transaction; provider/ops read API `GET /api/provider/requests/:requestId/audit`
- [ ] **Acceptance tests** — a full MVP walk produces a complete, ordered audit trail; audit rows are append-only (no mutation endpoints)

---

## Phase 5 — Marketplace Growth Loop & Analytics

> Successful requests reveal demand and suppliers the marketplace doesn't have. This phase turns that into organic growth.

- [ ] **Supplier discovery pipeline** — `Request_Supplier` rows with `source: DISCOVERED` aggregate into an ops view (supplier, items supplied, agreed prices, request outcomes); ops can mark a supplier **invite-ready**
- [ ] **Supplier invite workflow** — ops-triggered invitation handoff to business-registry/onboarding (outbox event `supplier.invite_recommended` carrying supplier contact + supplied items); the supplier then follows the normal seller onboarding path
- [ ] **Demand analytics** — aggregate requests by category/description clusters, fulfillment rate, average margin per request, quote-acceptance rate, and top unfulfillable reasons; expose via internal endpoint `GET /api/provider/requests/analytics` (admin/provider-only)
- [ ] **Acceptance tests** — a converted request with an EXTERNAL_SUPPLIER source surfaces that supplier as invite-ready; analytics endpoint aggregates correctly over seeded requests

---

## Sequencing and Dependencies

```
Phase 1 (MVP spine) ─ blocks everything
  └─ Phase 2 (Sourcing & Procurement) ─ requires Phase 1 (items, conversion)
       └─ Phase 3 (Multiple Quotes) ─ requires Phase 2 item model for per-option pricing
            └─ Phase 4 (Expiration, Notifications, Audit) ─ hardens Phase 1–3 (sweeper needs quotes+links; audit needs all use cases)
                 └─ Phase 5 (Growth Loop & Analytics) ─ requires Phase 2 suppliers + Phase 4 notifications
```

| Phase | Focus | Blocking risk if skipped |
|-------|-------|--------------------------|
| 1 | Request spine: lifecycle, conversation, assessment, single quote, secure link, idempotent conversion | The feature doesn't exist; no safe path to a normal order |
| 2 | Non-catalog items, suppliers, procurement tracking | Sourcing stays opaque; Maysar ops can't know where items come from |
| 3 | Multiple quote options | Customers get one take-it-or-leave-it offer instead of informed trade-offs |
| 4 | Expiry sweeper, notifications, audit | Outdated prices purchasable; customers/providers unnotified; no accountability |
| 5 | Supplier invites, demand analytics | Marketplace never grows from request demand |

---

## Workstream Map (from the backend brief)

| Workstream | Backlog sections | Service |
|---|---|---|
| Request Service (lifecycle & requirements) | §1.1 | request-service |
| Conversation | §1.2 | request-service (chat transport deferred) |
| Assessment | §1.3 | request-service |
| Sourcing | §2.2 | request-service |
| Quote Service | §1.4, Phase 3 | request-service |
| Custom Items | §2.1 | request-service |
| Secure Access | §1.5 | request-service |
| Order Integration | §1.6 | request-service → order tables |
| Procurement | §2.3 | request-service |
| Notification | §4.2 | request-service (emit) + notification-service (consume) |
| Expiration | §4.1 | request-service |
| Audit | §4.3 | request-service |

---

## Data Relationship (conceptual, as implemented)

```
Customer
   │
   ▼
Request_Request  ─── Request_Message (conversation: CUSTOMER / PROVIDER / SYSTEM / STATUS / QUOTE / ORDER)
   │            └─── Request_Assessment (provider decision + internal notes)
   │
   ├── Request_Item (non-catalog or catalog-sourced; description, qty, price, specs)
   │        └── Request_Source (supplier + agreed price + availability)   [internal]
   │
   └── Request_Quote (label, items, sellingPrice, deliveryDate, explanation, validUntil)
            │
            ▼
     Request_AccessLink (hashed token, single-use, expiring)  ── gate: FULFILLABLE + PUBLISHED
            │
            ▼
        Order_Order  (normal Maysar order; requestQuoteId unique)
            │
            ├── Request_Item × N   (what the customer bought)
            └── Request_Procurement × N (which supplier fulfills each item)  [internal]
```

**The most important separation:** `Catalog Product ≠ Request Item ≠ Procurement Source ≠ Maysar Seller` — an item that never existed in the catalog still produces a perfectly normal Maysar order, and the customer never sees inside the supply chain.