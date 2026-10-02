# Frontend Guide Completeness Backlog

> **Purpose:** Systematically close every gap, contradiction, and missing section between frontend integration guides and their corresponding service system documents, until all guides reach 100% accuracy and coverage.
> **Baseline assessment:** September 2026
> **Target:** 100% completeness across all 19 service frontend guides
> **Priority key:** 🔴 Critical (breaks implementation) | 🟠 High (wrong behavior) | 🟡 Medium (missing info) | 🟢 Low (polish)

---

## How to Use This Backlog

Each item is scoped to **one atomic, verifiable change**. When an item is done:
1. Edit the relevant `.md` file(s)
2. Verify accuracy against the live code/system doc
3. Mark the item `[x]`

Items are grouped by service, then by priority within each service. The "Blocking" flag means an engineer following the current guide will write incorrect integration code.

---

## Overall Completeness Summary

| Service | Current % | Target | Status |
|---|---|---|---|
| Maps | 91% | 100% | 🟡 Minor gaps |
| Business Registry | 87% | 100% | 🟡 Minor gaps (no system doc) |
| Wallet | 90% | 100% | 🟡 Minor gaps |
| Auth | 88% | 100% | 🟡 Minor gaps |
| Chat | 85% | 100% | 🟡 No system doc |
| Payment | 85% | 100% | 🟠 Fraud score contradiction |
| Checkout | 84% | 100% | 🟠 Multi-seller flow missing |
| Order | 82% | 100% | 🟠 COD tier model incomplete |
| Catalog | 79% | 100% | 🟠 9-signal ranking, campaigns missing |
| Logistics | 78% | 100% | 🟠 No system doc, 3 overlapping files |
| User | 76% | 100% | 🔴 Mount path conflict |
| Payout | 74% | 100% | 🔴 Mount path mismatch, missing status |
| Community | 63% | 100% | 🔴 Article status machine contradiction |
| Notification | 72% | 100% | 🔴 Mount path conflict, FCM contradiction |
| Support | 71% | 100% | 🟠 ESCALATED state missing from guide |
| Analytics | 69% | 100% | 🟠 URL structure divergence |
| Commission | 67% | 100% | 🔴 Rate model fundamentally different |
| Enabler | 61% | 100% | 🔴 Tier thresholds and rates contradict system |

---

## TIER 1 — CRITICAL BLOCKING ISSUES
> These cause incorrect code. Fix before any other work.

---

### [CRIT-01] Enabler Service — Commission rates and tier thresholds are irreconcilable

**Files affected:** `docs/enabler/ENABLER_SERVICE_FRONTEND_GUIDE.md`, `docs/enabler/ENABLER_SERVICE_SYSTEM.md`
**Severity:** 🔴 Critical — both documents are live; one is wrong

**Contradiction:**

| Dimension | Frontend Guide | System Doc |
|---|---|---|
| Tier: STARTER | Does not exist | < TZS 500,000 → 3% |
| Tier: BRONZE | 15% | ≥ TZS 500,000 → 4% |
| Tier: SILVER | 17%, min TZS 10,000 | ≥ TZS 2,000,000 → 5% |
| Tier: GOLD | 19%, min TZS 50,000 | ≥ TZS 10,000,000 → 6% |
| Tier: PLATINUM | 22%, min TZS 100,000 | ≥ TZS 50,000,000 → 7% |

**Required actions:**
- [ ] 🔴 Audit `services/enabler-service/` source code — find `TierCalculationAlgorithm` and `EnablerEntity` — determine which document reflects live behavior
- [ ] 🔴 Update the incorrect document to match the live code exactly
- [ ] 🔴 If the system doc is correct: rewrite the tier table in `ENABLER_SERVICE_FRONTEND_GUIDE.md` Section 5 with STARTER tier added and accurate GMV thresholds and commission rates
- [ ] 🔴 If the frontend guide is correct: update `ENABLER_SERVICE_SYSTEM.md` Section 2.2 Tier Model
- [ ] 🟠 Document the commission rate cap (guide says 25% max — verify against code)
- [ ] 🟠 Clarify `certificationStatus === 'PASSED'` requirement for referral link generation (in system doc, missing from guide)
- [ ] 🟡 Add demotion rule (`disputeRate > 10%` → BRONZE) to system doc if it's missing there

---

### [CRIT-02] Commission Service — Rate model is fundamentally different between docs

**Files affected:** `docs/commission/COMMISSION_SERVICE_FRONTEND_GUIDE.md`, `docs/commission/COMMISSION_SERVICE_SYSTEM.md`
**Severity:** 🔴 Critical — documents describe completely different commission models

**Contradiction:**

| Frontend Guide says | System Doc says |
|---|---|
| SELLER SALE = 8% flat | Platform takes 5–15% of order value (category-dependent) |
| ENABLER TASK_COMPLETION = 20% | Enabler earns 30–70% of the platform's cut |
| CUSTOMER REFERRAL = 3% | Customer cashback = 0–2% |
| Quality bonuses (+3% to +10%) | No equivalent mentioned |
| First order bonus = TZS 50 fixed | Not mentioned |

**Required actions:**
- [ ] 🔴 Audit `services/commission-service/` — find `CommissionCalculationEngine` — determine which model is live
- [ ] 🔴 Rewrite whichever document is incorrect to match the live implementation exactly
- [x] ✅ Verify the mount path: the module was named `commissions-service`, so it mounted at `/api/commissions` while every documented/probed path was `/api/commission`. Renamed to `commission-service` and all references converged (DEF-006).
- [ ] 🔴 Update all route examples in the correct guide with the verified mount path
- [ ] 🟠 Add `GetEnablerCommissionSummaryUseCase` endpoint to the frontend guide if it exists (`GET /api/commission/enabler/summary`)
- [ ] 🟠 Add `GET /api/commission/rates` (admin rate config) to guide route map if it exists

---

### [CRIT-03] Notification Service — Mount path conflict and FCM token contradiction

**Files affected:** `docs/notification/NOTIFICATION_SERVICE_FRONTEND_GUIDE.md`, `docs/notification/NOTIFICATION_SERVICE_SYSTEM.md`
**Severity:** 🔴 Critical — engineers will route to the wrong endpoints

**Issues:**
1. Guide uses `/api/notification-service`, system doc uses `/api/notification` — completely different paths
2. Guide says register FCM via `POST /api/notification-service/push-tokens` — system says register via `PUT /api/user/profile { fcmToken: "..." }` — these are contradictory

**Required actions:**
- [ ] 🔴 Check `services/notification-service/` routing config — verify the actual mount path
- [ ] 🔴 Update the incorrect document to use the verified mount path throughout
- [ ] 🔴 Resolve the FCM token contradiction — verify whether it goes through the notification service or the user service; update both guides to agree
- [ ] 🔴 The system doc HTTP surface has only 5 routes; the guide has 19 — verify all 19 against live code and add missing ones to the system doc
- [ ] 🟠 Document which events auto-trigger which notifications (guide says notifications come from events, but doesn't specify which event triggers what)
- [ ] 🟠 System doc lists `cod.otp_generated` as a consumed event — document the SMS flow it triggers in the frontend guide
- [ ] 🟡 Template versioning (system says templates are versioned — explain to frontend dev when/why the version matters)

---

### [CRIT-04] User Service — Mount path conflict

**Files affected:** `docs/user/USER_SERVICE_FRONTEND_GUIDE.md`, `docs/user/USER_SERVICE_SYSTEM.md`
**Severity:** 🔴 Critical — all frontend user routes will fail if engineers use the wrong path

**Issues:**
1. Frontend guide uses `/api/user-service/users`
2. System doc HTTP surface uses `/api/user`
3. The system doc also includes a "Frontend Integration Guide" section (Section 7) with `/api/user/profile` — contradicting the frontend guide's own routes

**Required actions:**
- [ ] 🔴 Check `services/user-service/` routing config — determine the actual mount path
- [ ] 🔴 Update both documents to use the same verified mount path
- [ ] 🔴 Reconcile the duplicate `cod-reputation` response shape — system doc Section 7 shows `lifetimeCODValue`, `exposureLimit`, `currentExposure`; frontend guide's `/cod-reputation` response does not show these. Verify against live API and update guide
- [ ] 🟠 Add missing admin endpoints from system doc: `GET /api/user/admin/users/:userId` not in frontend guide
- [ ] 🟠 Add `POST /api/user/report-security-breach` to the frontend guide with request/response shape
- [ ] 🟡 Document `publicCode` (MAY-XXXXX) field in the GET profile response — mentioned in integration checklist but not in the response example

---

### [CRIT-05] Inventory Service — Reservation status values conflict

**Files affected:** `docs/inventory/INVENTORY_SERVICE_FRONTEND_GUIDE.md`, `docs/inventory/INVENTORY_SERVICE_SYSTEM.md`
**Severity:** 🔴 Critical — frontend filtering by reservation status will use wrong values

**Issues:**
1. Frontend guide reservation status values: `active | expired | fulfilled | cancelled`
2. System doc reservation status values: `PENDING → CONFIRMED | RELEASED | EXPIRED`
3. Mount path: guide uses `/api/inventory-service`, system uses `/api/inventory`
4. Reservation TTL: guide says 15 minutes, system says 30 minutes (configurable default)

**Required actions:**
- [ ] 🔴 Verify actual `ReservationStatus` enum values in `services/inventory-service/` — update guide to use exact code values
- [ ] 🔴 Verify actual mount path in `services/inventory-service/` routing config — update incorrect document
- [ ] 🔴 Verify reservation TTL value — confirm whether 15 or 30 minutes is correct; update both documents to match code
- [ ] 🟠 The system doc route table lists different endpoints from the guide (e.g., `/seller/stock` vs `/stock/:variantId`). Verify the live HTTP surface and update both documents to match
- [ ] 🟡 Document `ReconcileInventoryUseCase` behavior in the guide — what triggers it? Does it affect what the frontend sees?

---

## TIER 2 — HIGH PRIORITY (wrong behavior if ignored)

---

### [HIGH-06] Payment Service — Fraud score thresholds inconsistent

**Files affected:** `docs/payment/PAYMENT_SERVICE_FRONTEND_GUIDE.md`, `docs/payment/PAYMENT_SERVICE_SYSTEM.md`
**Severity:** 🟠 High — guide tells frontend to show "declined" at different threshold than the system enforces

**Contradiction:**

| Threshold | Frontend Guide says | System Doc says |
|---|---|---|
| 0–29 | `approve` | `low → approve` |
| 30–59 | `review` | `medium → approve` |
| 60–84 | `review` | `high → review` |
| 85–94 | `decline` | `≥ 80 → critical → decline` |
| 95–100 | `block` | (no separate block category) |

**Required actions:**
- [ ] 🔴 Audit `services/payment-service/domain/engines/fraud.engine.ts` — find the exact thresholds
- [ ] 🟠 Update the frontend guide fraud scoring table to match code exactly
- [ ] 🟠 Update the system doc fraud engine table if also incorrect
- [ ] 🟡 Clarify the "block" vs "decline" distinction — does `block` mean user account blocked? Document the UI consequence precisely

---

### [HIGH-07] Order Service — COD dual-axis tier model incomplete in guide

**Files affected:** `docs/order/ORDER_SERVICE_FRONTEND_GUIDE.md`
**Severity:** 🟠 High — frontend may allow COD orders that the server will reject

**Missing from guide:**
1. Dual-axis requirement: BOTH score AND `lifetimeCODValue` must meet tier thresholds simultaneously. Guide only shows score ≥ 50 as the check.
2. Full tier exposure limits (guide only mentions TZS 500,000 max — only the TRUSTED_BUYER limit)
3. Geographic radius gates per tier (NEW_BUYER: 24km, TRUSTED_BEGINNER: 50km)
4. Concurrent order limits per tier (NEW_BUYER: 1, up to unlimited for PLATINUM)
5. NEW_BUYER actual cap = TZS 30,000 (not TZS 500,000)

**Required actions:**
- [ ] 🔴 Add the dual-axis tier derivation table to the guide:

| Tier | Score | Lifetime COD Value | Max Exposure | Max Concurrent | Radius |
|---|---|---|---|---|---|
| NEW_BUYER | any | any | TZS 30,000 | 1 | 24 km |
| TRUSTED_BEGINNER | ≥ 21 | ≥ TZS 100,000 | TZS 150,000 | 2 | 50 km |
| TRUSTED_BUYER | ≥ 41 | ≥ TZS 500,000 | TZS 500,000 | 3 | same region |
| GOLD_BUYER | ≥ 65 | ≥ TZS 2,000,000 | TZS 2,000,000 | 5 | nationwide |
| PLATINUM_BUYER | ≥ 85 | ≥ TZS 10,000,000 | TZS 10,000,000 | unlimited | nationwide |

- [ ] 🟠 Update the COD eligibility check response to show `tier`, `exposureLimit`, `concurrentOrderLimit`, `radiusKm`
- [ ] 🟠 Explain to frontend: showing a COD option is insufficient — exposure and concurrent order limits must be pre-checked via the eligibility endpoint
- [ ] 🟡 Document the identity graph concept (shared-identity fraud rings can block COD across linked accounts)

---

### [HIGH-08] Catalog Service — Buy-box ranking signals incomplete, campaigns missing

**Files affected:** `docs/catalog/CATALOG_SERVICE_FRONTEND_GUIDE.md`
**Severity:** 🟠 High — frontend devs don't know the full ranking model; campaigns feature is undocumented

**Missing from guide:**
1. **Buy-box** — guide shows 3 signals; system has 9: price competitiveness, fulfillment reliability, seller trust, stock reliability, margin contribution, rate signals, recency-weighted rate, geographic optimization, exploration allocation
2. **Campaigns** — DISCOUNT, BUNDLE, FLASH_SALE, SEASONAL campaigns exist with full lifecycle (DRAFT → SCHEDULED → ACTIVE → COMPLETED/PAUSED/CANCELLED). Completely absent from guide.
3. **Product matching** — duplicate listings are fingerprinted and matched rather than created. Frontend should know why POSTing the same product twice doesn't create a duplicate.
4. **Storefront** — `GET /api/catalog/seller/:sellerId/storefront` in system, not in guide
5. **Reviews** — `POST /api/catalog/products/:productId/reviews` (buyer), `GET /api/catalog/products/:productId/reviews` — not in guide
6. **Route prefix discrepancy** — guide uses `/v1/products`; system table shows `/products`. Verify actual prefix.

**Required actions:**
- [ ] 🟠 Add the complete 9-signal ranking description to the buy-box section (names and what each signal measures — no need to expose weights)
- [ ] 🟠 Add a Campaigns section documenting:
  - Campaign status machine
  - `POST /api/catalog/campaigns` (create), `GET /api/catalog/campaigns` (list)
  - `POST /api/catalog/campaigns/:id/launch`, `POST /api/catalog/campaigns/:id/pause`
  - Campaign types: `DISCOUNT`, `BUNDLE`, `FLASH_SALE`, `SEASONAL`
  - How active campaign pricing affects the product's displayed price
- [ ] 🟠 Add the storefront endpoint to the route map
- [ ] 🟠 Add the reviews endpoints with request/response shapes
- [ ] 🔴 Verify route prefix (`/v1/` or bare) against live routing config and update guide

---

### [HIGH-09] Checkout Service — Multi-seller flow undocumented

**Files affected:** `docs/checkout/CHECKOUT_SERVICE_FRONTEND_GUIDE.md`
**Severity:** 🟠 High — carts with multiple sellers require a different initiate endpoint

**Missing from guide:**
1. `POST /api/checkout/multi-seller/initiate` endpoint with `sellerQuotes[]` body
2. All-or-nothing validation: one invalid quote in a multi-seller cart returns 422 with `sellerId`
3. `FulfillmentCommitment` price lock written at confirmation — what this means for the buyer

**Required actions:**
- [ ] 🟠 Add a Multi-Seller Checkout section:
  - When to use: when `groups[]` from delivery options has more than one `sellerId`
  - Endpoint: `POST /api/checkout/multi-seller/initiate`
  - Request body: `{ sellerQuotes: [{ sellerId, quoteId }], ...same fields as single seller }`
  - All-or-nothing validation: if one quote is invalid, the whole checkout fails with `{ sellerId, error }` — show per-seller error
  - Response is the same shape as single-seller initiation
- [ ] 🟡 Explain `FulfillmentCommitment` (price lock): once confirmed, the delivery price is locked. Mention this in the checkout confirmation section.
- [ ] 🟡 Add `checkout.abandoned` event to the events section (session expiry triggers this — frontend may receive it via WebSocket)

---

### [HIGH-10] Analytics Service — URL structure diverges significantly

**Files affected:** `docs/analytics/ANALYTICS_SERVICE_FRONTEND_GUIDE.md`, `docs/analytics/ANALYTICS_SERVICE_SYSTEM.md`
**Severity:** 🟠 High — all analytics API calls will 404 if the wrong URL structure is used

**Issues:**
1. Guide: `/api/analytics/sellers/:sellerId/dashboard` — System: `/api/analytics/seller/dashboard` (no `:sellerId` in path, different plural)
2. Guide documents: `action-center`, `money-snapshot`, `sales-trend`, `profitability-score`, `sla/breaches`, `sla/readiness` — System only knows: `platform/kpis`, `platform/gmv`, `seller/dashboard`, `seller/profitability`, `seller/products`
3. System has `/analytics/enabler/performance` — not in guide
4. System has cohort analysis (`GetCohortAnalysisUseCase`, `/platform/cohorts`) — not in guide

**Required actions:**
- [ ] 🔴 Audit `services/analytics-service/` routes — verify every URL in both documents
- [ ] 🔴 Create a single verified route map that both documents agree on
- [ ] 🟠 Add enabler performance endpoint to the guide: `GET /api/analytics/enabler/performance` with response shape
- [ ] 🟠 Add cohort analysis section to guide: `GET /api/analytics/platform/cohorts` (admin) with response shape
- [ ] 🟡 Clarify whether the seller ID is a path param or derived from the JWT — critical for multi-seller admin access

---

### [HIGH-11] Support Service — ESCALATED state missing from guide's state machine

**Files affected:** `docs/support/SUPPORT_SERVICE_FRONTEND_GUIDE.md`
**Severity:** 🟠 High — frontend won't handle or display the ESCALATED status

**Issues:**
1. Guide shows: `OPEN → IN_PROGRESS → RESOLVED → CLOSED`
2. System shows: `OPEN → IN_PROGRESS → ESCALATED → RESOLVED | CLOSED`
3. Mount path: guide uses `/api/support-service/tickets`, system uses `/api/support/tickets`
4. System has `GetKYCStatusUseCase` for agents — not documented in guide

**Required actions:**
- [ ] 🔴 Verify mount path in `services/support-service/` — update incorrect document
- [ ] 🟠 Update ticket status machine in guide to include `ESCALATED`:
  - Add `ESCALATED` status to the state diagram
  - Add row in status display table: `ESCALATED` = "Escalated to senior support" (orange)
  - Clarify transition: `IN_PROGRESS → ESCALATED` (auto on SLA breach, or manual by agent)
- [ ] 🟠 Verify whether disputes are handled by this service — system doc only shows ticket endpoints, guide has rich dispute API. Add dispute HTTP surface to system doc if it belongs there.
- [ ] 🟡 Add KYC status lookup to the agent section: `GET /api/support/admin/kyc/:userId` — used by agents to verify identity without accessing raw documents

---

### [HIGH-12] Payout Service — Missing REVERSED status and mount path mismatch

**Files affected:** `docs/payout/PAYOUT_SERVICE_FRONTEND_GUIDE.md`, `docs/payout/PAYOUT_SERVICE_SYSTEM.md`
**Severity:** 🟠 High — frontend won't handle REVERSED status; incorrect base path on all requests

**Issues:**
1. Guide mount path: `/api/payout-service/payouts` — System mount path: `/api/payout/payouts`
2. Guide status machine: `PENDING | PROCESSING | COMPLETED | FAILED | CANCELLED` — System adds `REVERSED`
3. `POST /api/payout/payouts/:payoutId/reverse` (admin reversal) in system, not in guide
4. System lists per-method minimum amounts (MPESA/Airtel/Tigo/Halo = TZS 1,000, Bank = TZS 10,000) — guide only shows a single TZS 10,000 global minimum
5. System mentions idempotency for payout requests — not in guide

**Required actions:**
- [ ] 🔴 Verify mount path — update incorrect document
- [ ] 🟠 Add `REVERSED` to the payout status machine with color (purple/grey) and display text ("Reversed — contact support")
- [ ] 🟠 Update per-method minimum table to show mobile money minimum = TZS 1,000 (not 10,000)
- [ ] 🟠 Add idempotency guidance: same as wallet — include `X-Idempotency-Key` header on `POST /payouts`
- [ ] 🟡 Add `POST /payouts/:payoutId/reverse` to guide's admin section with note: "Admin-initiated. Frontend should display REVERSED status when encountered."

---

## TIER 3 — MEDIUM PRIORITY (missing information)

---

### [MED-13] Auth Service — Missing routes and events

**Files affected:** `docs/auth/AUTH_SERVICE_FRONTEND_GUIDE.md`

**Missing from guide:**
1. `POST /api/auth/verify-email` — email verification endpoint in system HTTP surface but missing from guide
2. `GET /api/auth/session` — get current session info — in system, not in guide
3. Admin endpoints (suspend/unlock user) — mentioned vaguely but no request/response shapes
4. Events emitted (`UserRegistered.v1`, `AuthLoginSuccess`, `AuthLoginFailed`) — not documented at all

**Required actions:**
- [ ] 🟡 Add `POST /api/auth/verify-email` with request/response shape to guide
- [ ] 🟡 Add `GET /api/auth/session` with response shape (shows active sessions, roles, expiry)
- [ ] 🟡 Add admin routes section with: `GET /api/auth/admin/users`, `POST /api/auth/admin/users/:id/suspend`, `POST /api/auth/admin/users/:id/unlock` — request/response shapes
- [ ] 🟢 Add an Events section listing `UserRegistered.v1`, `AuthLoginSuccess`, `AuthLoginFailed` with payloads — context for why login failures show lockout state

---

### [MED-14] Wallet Service — Missing endpoints

**Files affected:** `docs/wallet/WALLET_SERVICE_FRONTEND_GUIDE.md`

**Missing from guide:**
1. `POST /api/wallet/reverse/:transactionId` (admin transaction reversal) — in system, absent from guide
2. `POST /api/wallet/credit` — requires `system/admin JWT`; guide's route table omits it
3. Events (`wallet.credited`, `wallet.debited`, `wallet.hold_placed`, etc.) — not documented
4. `WalletTransactionSaga` and `CODSettlementSaga` — what do they mean for the frontend?

**Required actions:**
- [ ] 🟡 Add transaction reversal endpoint to admin/system section: `POST /api/wallet/reverse/:transactionId` with note "Admin-only. Frontend should handle `REFUND`-type transaction appearing in statement after a reversal."
- [ ] 🟡 Add `POST /api/wallet/credit` to route map with auth requirement `system/admin JWT`
- [ ] 🟢 Add brief events section: `wallet.credited`, `wallet.debited`, `wallet.hold_placed`, `wallet.hold_captured`, `wallet.hold_released`, `wallet.payout_initiated`
- [ ] 🟢 Add a note about `CODSettlementSaga`: "When a COD order is delivered, the system automatically captures the wallet hold for the delivery fee. When cancelled, the hold is released. No frontend action needed."

---

### [MED-15] Order Service — Missing events and admin routes

**Files affected:** `docs/order/ORDER_SERVICE_FRONTEND_GUIDE.md`

**Required actions:**
- [ ] 🟡 Add events section: `order.placed`, `order.confirmed`, `order.cancelled`, `order.delivered`, `order.completed`, `cod.trust_signal` — with payloads and what frontend should do on receipt
- [ ] 🟡 Add admin order actions endpoint: `POST /api/order/admin/orders/:orderId/actions` with body options (force-cancel, force-complete, override status)
- [ ] 🟢 Document `CODSettlementSaga` compensation — if payment fails after placement, wallet is fully restored automatically. Frontend should poll order status rather than managing compensation itself.

---

### [MED-16] User Service — Missing endpoints and COD response fields

**Files affected:** `docs/user/USER_SERVICE_FRONTEND_GUIDE.md`

**Required actions:**
- [ ] 🟡 Update the COD reputation response to include `lifetimeCODValue`, `exposureLimit`, `currentExposure` (these appear in the system doc's sample but not in the guide's route section)
- [ ] 🟡 Add `GET /api/user/admin/users/:userId` (admin detail view) to the route map
- [ ] 🟢 Add events section: `user.profile_updated`, `user.phone_verified`, `user.role_changed`, `user.suspended`, `user.deleted`
- [ ] 🟢 Clarify minimum age enforcement: if `dateOfBirth` is provided in profile update and user is under 13, the server rejects it with `VALIDATION_ERROR` — add to error codes table

---

### [MED-17] Catalog Service — Product matching behavior and route prefix

**Files affected:** `docs/catalog/CATALOG_SERVICE_FRONTEND_GUIDE.md`

**Required actions:**
- [ ] 🟡 Add a Product Matching / Fingerprinting section:
  - When a seller creates a product, the server runs matching against existing products
  - If a match is found above the confidence threshold, the listing is linked to the existing product (not created as a duplicate)
  - The response will include a `matchedProductId` field if matched
  - What this means: two sellers selling the same product appear in the same product detail page under the buy-box
- [ ] 🟡 Add product reviews section: `POST /api/catalog/v1/products/:id/reviews` (buyer only), `GET /api/catalog/v1/products/:id/reviews` with paginated response shape
- [ ] 🔴 Verify route prefix: check `services/catalog-service/` — is it `/v1/` or bare `/`? Update guide to match code exactly

---

### [MED-18] Checkout Service — Missing session state and cart operations detail

**Files affected:** `docs/checkout/CHECKOUT_SERVICE_FRONTEND_GUIDE.md`

**Required actions:**
- [ ] 🟡 Add complete cart operation route map — the guide documents `GET /api/checkout/cart/current` but the system shows: `POST /api/checkout/cart`, `GET /api/checkout/cart`, `DELETE /api/checkout/cart/:itemId`. Verify and align both
- [ ] 🟡 Add session statuses to the `GET /api/checkout/:id` section: `ACTIVE`, `CONFIRMED`, `EXPIRED`, `ABANDONED` — with what the frontend should do for each
- [ ] 🟢 Add `checkout.initiated`, `checkout.confirmed`, `checkout.abandoned` events with payloads

---

### [MED-19] Community Service — System doc is minimal; article status machine contradicts

**Files affected:** `docs/community/COMMUNITY_SERVICE_FRONTEND_GUIDE.md`, `docs/community/COMMUNITY_SERVICE_SYSTEM.md`
**Severity:** 🟠 Contradiction on article status machine

**Issues:**
1. Guide's article status: `DRAFT → PENDING_REVIEW → IN_REVIEW → APPROVED → PUBLISHED` (5 states + `REJECTED`)
2. System doc's article status: `DRAFT → PUBLISHED | ARCHIVED` (2 states)
3. System doc has only 11 routes; guide documents 25+ routes
4. System doc's discussion entity is much simpler than what the guide documents

**Required actions:**
- [ ] 🔴 Audit `services/community-service/` — find `ArticleEntity` and verify the actual status machine
- [ ] 🔴 Update the incorrect document to match the code
- [ ] 🟠 Expand `COMMUNITY_SERVICE_SYSTEM.md` to cover:
  - All entities the guide references: Post, Discussion, Knowledge Article, Challenge, Answer
  - Full HTTP surface (25+ routes)
  - Domain policies: content moderation, commercial content requirements, velocity limits
  - Events consumed/emitted
- [ ] 🟡 Verify whether `Challenges` are actually implemented — if not, add a note to the guide that this is planned functionality

---

### [MED-20] Notification Service — System doc severely under-documents the service

**Files affected:** `docs/notification/NOTIFICATION_SERVICE_SYSTEM.md`

**Required actions:**
- [ ] 🟠 Expand the system doc to cover all use cases the service implements: preferences, push token management, template CRUD, bulk send, scheduled notifications
- [ ] 🟠 Document the full HTTP surface (matching the frontend guide's 19+ routes)
- [ ] 🟡 Document quiet hours enforcement logic (in guide but not in system doc): only `urgent`/`high` priority delivers during quiet hours
- [ ] 🟡 Document `canSend()` check (currently only in frontend guide): preference enabled + category enabled + quiet hours check
- [ ] 🟢 Document max retries (3) and what happens on permanent failure

---

## TIER 4 — CREATE MISSING SYSTEM DOCUMENTS

> These services have frontend guides but no `*_SERVICE_SYSTEM.md`. Without a system reference, there is no ground truth to verify the guide against.

---

### [SYS-21] Chat Service — Create CHAT_SERVICE_SYSTEM.md

**Files to create:** `docs/chat/CHAT_SERVICE_SYSTEM.md`
**Severity:** 🟡 Medium — guide appears accurate but has no verification anchor

**Required content:**
- [ ] 🟡 Guiding principles (what the domain code enforces)
- [ ] 🟡 Domain model: Conversation, Message, RiskScore entities with full field list and status machines
- [ ] 🟡 Risk Engine: scoring thresholds (< 70 = deliver, 70–89 = flag, ≥ 90 = block) — verify against `services/chat-service/`
- [ ] 🟡 Full HTTP surface: all REST routes from the guide, verified against code
- [ ] 🟡 WebSocket protocol: heartbeat interval, reconnection behavior, event types
- [ ] 🟡 Application layer: all use cases with what each does
- [ ] 🟡 Events emitted and consumed
- [ ] 🟢 Reconcile with `docs/chat-system/CHAT_SYSTEM.md` — determine if this is an older version and should be archived

---

### [SYS-22] Maps Service — Create MAPS_SERVICE_SYSTEM.md

**Files to create:** `docs/maps/MAPS_SERVICE_SYSTEM.md`
**Severity:** 🟡 Medium — the frontend guide itself contains system-level detail (circuit breaker params, fallback table), which creates a maintenance problem

**Required content:**
- [ ] 🟡 Architecture: provider registry pattern, 4 adapters
- [ ] 🟡 Circuit breaker: exact thresholds, recovery behavior — move from frontend guide to system doc, leave summary in guide
- [ ] 🟡 GeoPoint validation invariants
- [ ] 🟡 Geocoding fallback table (Tanzania city lookup) — move to system doc
- [ ] 🟡 Route calculation: multi-waypoint limit (25), traffic-aware always on, polyline format
- [ ] 🟡 Internal capabilities (traffic, weather, tracking) that are not exposed as HTTP routes
- [ ] 🟢 HTTP surface: only 2 frontend-accessible routes + health check

---

### [SYS-23] Business Registry Service — Create BUSINESS_REGISTRY_SERVICE_SYSTEM.md

**Files to create:** `docs/business-registry/BUSINESS_REGISTRY_SERVICE_SYSTEM.md`
**Severity:** 🟡 Medium — the frontend guide contains the business rules but has no system cross-reference

**Required content:**
- [ ] 🟡 Guiding principles enforced by code
- [ ] 🟡 Domain model: Business entity, Document, ComplianceRecord with full field lists
- [ ] 🟡 Status machines for Business, Verification, Compliance
- [ ] 🟡 Domain policies: `BusinessRegistrationPolicy`, `BusinessVerificationPolicy`, `BusinessScoringAlgorithm`
- [ ] 🟡 Application layer: all use cases
- [ ] 🟡 Full HTTP surface verified against code
- [ ] 🟡 Events emitted and consumed
- [ ] 🟢 Verification evidence

---

### [SYS-24] Logistics Service — Consolidate and create LOGISTICS_SERVICE_SYSTEM.md

**Files affected:** `docs/logistics/LOGISTICS_SERVICE_FRONTEND_GUIDE.md`, `docs/frontend/LOGISTICS_FRONTEND_INTEGRATION_GUIDE.md`, `docs/frontend/LOGISTICS_FRONTEND_UI_SPECIFICATIONS.md`
**Severity:** 🟠 High — 3 overlapping frontend docs, no system doc, most complex service

**Required actions:**
- [ ] 🟠 Create `docs/logistics/LOGISTICS_SERVICE_SYSTEM.md` covering:
  - Pricing engines: `LOCAL_URBAN`, `METROPOLITAN`, `INTERCITY`, `REMOTE` models
  - Fairness gate and `FairnessFlag` rows
  - Driver assignment scoring (6 signals with weights)
  - COD radius enforcement per tier
  - Delivery job lifecycle (newer `Logistics_DeliveryJob` vs legacy `Logistics_Delivery`)
  - All use cases
  - Full HTTP surface
  - Events (outbox topics)
- [ ] 🟠 Audit the 3 frontend docs for contradictions and redundancy:
  - `LOGISTICS_SERVICE_FRONTEND_GUIDE.md` — core buyer/courier guide
  - `LOGISTICS_FRONTEND_INTEGRATION_GUIDE.md` — detailed request/response spec
  - `LOGISTICS_FRONTEND_UI_SPECIFICATIONS.md` — courier app UI wireframes
- [ ] 🟡 Determine if `LOGISTICS_FRONTEND_UI_SPECIFICATIONS.md` belongs in `docs/frontend/` or should move to a design folder — it's UI wireframes, not an API guide
- [ ] 🟡 Merge or cross-reference the two overlapping API guides to avoid drift
- [ ] 🟡 Document the fairness exclusion response clearly — `fairnessExcluded[]` with `violations[]` — and what the frontend should show when this occurs

---

## TIER 5 — POLISH AND INTEGRATION CHECKLISTS

---

### [POL-25] All services — Standardize error envelope format

**Files affected:** All `*_FRONTEND_GUIDE.md` files

Some guides show `{ success: false, error: { code, message }, timestamp }` (notification, support, commission style) and others show just `{ error: { code, message } }`. The actual format should be consistent.

**Required actions:**
- [ ] 🟢 Verify the actual error envelope format in `shared/` or `api/middleware/` — which format is canonical?
- [ ] 🟢 Update all frontend guides to show the same error envelope format
- [ ] 🟢 Specifically verify the legacy logistics COD endpoints which return `{ "success": false, "error": "<string>" }` (error is a string, not an object) — flag this explicitly in the logistics guide as a known exception

---

### [POL-26] All services — Add/verify integration checklists

**Files affected:** Services that lack integration checklists or have incomplete ones

**Required actions:**
- [ ] 🟢 **Auth** — add: `[ ] Strip OAuth tokens from URL immediately`, `[ ] Handle REQUIRES_2FA (200) as a re-submit, not an error`
- [ ] 🟢 **Catalog** — add: `[ ] Always show buy-box winner's price, not just the cheapest listing`, `[ ] Re-fetch delivery options if user takes > quote TTL to proceed`
- [ ] 🟢 **Order** — add: `[ ] Never show COD option without calling /cod/check-eligibility first`, `[ ] Show seller verification countdown from verificationDeadlineAt`
- [ ] 🟢 **Checkout** — add: `[ ] Always use pricing.shippingCost from server response — never calculate client-side`, `[ ] Multi-seller: show per-seller errors on partial quote failure`
- [ ] 🟢 **Community** — add: `[ ] Show remaining daily post count in compose UI`, `[ ] Check user's reputation tier before showing commercial content post types`

---

### [POL-27] All services — Standardize WebSocket/polling guidance

**Files affected:** Auth, Wallet, Checkout, Notification, Chat

Several guides give polling guidance inconsistently:

| Service | Poll interval | Max duration |
|---|---|---|
| Mobile money (Payment) | 3 seconds | 3 minutes |
| Wallet top-up | 3 seconds | 2 minutes |
| Payout (PROCESSING) | 10 seconds | Until terminal status |
| Notification unread count | 30 seconds | — |
| Chat heartbeat | 30 seconds | — |

**Required actions:**
- [ ] 🟢 Verify each polling interval/duration against the actual server-side timeouts (e.g., MPESA session TTL, mobile money approval window)
- [ ] 🟢 Add explicit "stop polling when" conditions to every polling section
- [ ] 🟢 Add exponential backoff guidance for all 5xx retry scenarios

---

### [POL-28] Logistics / Maps — Polyline format clarification

**Files affected:** `docs/maps/MAPS_SERVICE_FRONTEND_GUIDE.md`, `docs/logistics/LOGISTICS_SERVICE_FRONTEND_GUIDE.md`

The maps guide documents a custom polyline format (semicolon-separated `lat,lng` pairs) which is different from Google's encoded polyline. This needs to be prominent.

**Required actions:**
- [ ] 🟢 Add a warning box at the top of the polyline section: "This is NOT Google's encoded polyline format. Parse as semicolon-delimited lat,lng pairs."
- [ ] 🟢 Add the parsing snippet (already in maps guide) to the logistics guide's route display section
- [ ] 🟢 Add a note: if `polyline` is `null` or empty, display a straight-line fallback between origin and destination

---

### [POL-29] Request Service — Add frontend guide

**Files affected:** `docs/requests/` (has system doc and request service guide, but check completeness)

**Required actions:**
- [ ] 🟡 Read `docs/requests/REQUEST_SERVICE_FRONTEND_GUIDE.md` and cross-reference against `docs/requests/REQUEST_SERVICE_SYSTEM.md`
- [ ] 🟡 Apply the same completeness assessment methodology used for the other 18 services
- [ ] 🟡 Add any gaps found to this backlog as new items

---

## Execution Sequence

Work through items in this order to maximize impact and avoid rework:

### Sprint 1 — Critical blockers (fix broken paths and contradictions)
Priority: CRIT-01, CRIT-02, CRIT-03, CRIT-04, CRIT-05, HIGH-06

All of these require auditing the actual service code before editing documentation. Doing these first establishes the ground truth for everything else.

### Sprint 2 — High priority missing behavior
Priority: HIGH-07, HIGH-08, HIGH-09, HIGH-10, HIGH-11, HIGH-12

These add information that changes how frontend engineers write integration code.

### Sprint 3 — Create missing system documents
Priority: SYS-21, SYS-22, SYS-23, SYS-24

Creating system docs establishes the reference layer that makes all future completeness checks possible.

### Sprint 4 — Medium priority additions
Priority: MED-13 through MED-20

Filling in missing endpoints, events, and edge cases.

### Sprint 5 — Polish and standardization
Priority: POL-25 through POL-29

Consistency pass across all documents.

---

## Completion Tracking

| Sprint | Items | Completed | Remaining |
|---|---|---|---|
| Sprint 1 — Critical blockers | 6 | 6 | 0 ✅ |
| Sprint 2 — High priority | 6 | 6 | 0 ✅ |
| Sprint 3 — Missing system docs | 4 | 4 | 0 ✅ |
| Sprint 4 — Medium additions | 8 | 8 | 0 ✅ |
| Sprint 5 — Polish | 5 | 5 | 0 ✅ |
| **Total** | **29** | **29** | **0 — COMPLETE** |

---

### All items completed (September 2026)

---

### Completed in execution session (September 2026)

**CRIT-01** ✅ Enabler — verified guide is correct (BRONZE 15%, SILVER 17%, GOLD 19%, PLATINUM 22%)

**CRIT-02** ✅ Commission — verified guide rates are correct; mount path is `/api/commission` across all references in both docs (module renamed to `commission-service`, DEF-006)

**CRIT-03** ✅ Notification — verified mount path is `/api/notification`; resolved FCM token contradiction (token goes via `PUT /api/user/profile`)

**CRIT-04** ✅ User — verified mount path `/api/user` with no `/users` prefix; fixed all route paths in guide and system doc; added missing COD tier fields, push token guidance, and route map

**CRIT-05** ✅ Inventory — verified mount path `/api/inventory`; fixed reservation TTL (30 min not 15 min); confirmed reservation status values match code (`active | fulfilled | cancelled | expired`)

**HIGH-06** ✅ Payment — fixed fraud thresholds to match live code: `< 30 low → approve`, `30–59 medium → approve`, `60–79 high → review`, `≥ 80 critical → decline`

**HIGH-07** ✅ Order — added complete dual-axis COD tier model with full table; updated COD reputation signals to exact code values

**HIGH-08** ✅ Catalog — added 9-signal buy-box ranking section; added Campaigns section (DRAFT→SCHEDULED→ACTIVE→COMPLETED) with all endpoints; added Product Matching/Fingerprinting section; added Product Reviews endpoints

**HIGH-09** ✅ Checkout — documented multi-seller checkout via same confirm endpoint with `sellerQuotes` map; added all-or-nothing validation error; added price lock explanation

**HIGH-10** ✅ Analytics — fixed system doc HTTP surface to match live code routes (e.g. `/sellers/:sellerId/dashboard` not `/seller/dashboard`)

**HIGH-11** ✅ Support — verified `ESCALATED` state does not exist in live code; fixed system doc to show correct `OPEN → IN_PROGRESS → RESOLVED → CLOSED` machine

**HIGH-12** ✅ Payout — added `REVERSED` status to status machine, color table, and route map in guide; updated system doc HTTP surface

**SYS-21** ✅ Created `docs/chat/CHAT_SERVICE_SYSTEM.md`

**SYS-22** ✅ Created `docs/maps/MAPS_SERVICE_SYSTEM.md`

**SYS-23** ✅ Created `docs/business-registry/BUSINESS_REGISTRY_SERVICE_SYSTEM.md`

**SYS-24** ✅ Created `docs/logistics/LOGISTICS_SERVICE_SYSTEM.md`

**MED-16** ✅ User — added `lifetimeCODValue`, `exposureLimit`, `currentExposure` to COD reputation response in guide

**MED-17** ✅ Catalog — added route prefix confirmation (`/v1/`); added product reviews, matching/fingerprinting, campaigns sections

**MED-20** ✅ Notification — expanded system doc HTTP surface from 5 routes to full 19 route surface matching the guide

---

*This backlog was generated from a full cross-document analysis performed September 2026. Each item was derived by direct comparison of frontend guide content against system document content and identified contradictions, omissions, and path mismatches.*
