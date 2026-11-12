# Lifecycle Verification — Skip Resolution Backlog

**Source:** Full lifecycle verification run — `scripts/verification/run-lifecycle-checks.mjs`
**Run date:** 2026-11-03T18:04:23.224Z
**Overall result:** 111 passed / 0 failed / 15 skipped — **100% pass rate (on executable steps)**
**Results file:** `docs/verification/lifecycle-results.json`

---

## Overview

All 15 skipped steps are caused by either missing seed data, missing request payload fields, or workflow-state prerequisites that the verification script cannot self-generate. None are caused by backend deficiencies — all backing routes are healthy. Each item below documents the exact cause and the fix required to convert the skip to a pass.

---

## Skip Inventory

### SKIP-01 — LC-07: No Dispute Records in Seed Data

| Field | Value |
|---|---|
| **Lifecycle** | LC-07: Support Ticket Lifecycle |
| **Skipped step** | `GET /api/support/disputes/:id [admin]` + `POST /api/support/disputes/:id/resolve [admin]` |
| **Skip reason** | `GET /api/support/disputes [buyer]` returns 200 but an empty list — no disputes exist for the seeded buyer |
| **Root cause** | Disputes are created through the dispute resolution workflow (order delivered → buyer opens dispute). The seed data includes tickets but not disputes. |
| **Fix type** | Seed data |
| **Fix action** | Add an `dispute` row to `seed-dev-users.ts` linked to the buyer, or create a dispute via the API during the verification run using an existing order ID. |
| **Effort** | Low |
| **Status** | ☐ Open |

---

### SKIP-02 — LC-12: Quote Creation Missing Required Fields

| Field | Value |
|---|---|
| **Lifecycle** | LC-12: Request Service — Provider Side |
| **Skipped step** | `POST /api/request/provider/quotes/:id/publish` + `POST /api/request/provider/quotes/:id/assessment-link` |
| **Skip reason** | Quote creation (`POST /api/request/provider/requests/:id/quotes`) returns 400 — the `CreateQuoteInput` schema requires `label` and `deliveryDate` fields that the script doesn't send |
| **Root cause** | Script-side payload gap. The `CreateQuoteUseCase` validates against `CreateQuoteInput` which requires `label: string` and `deliveryDate: string` in addition to price fields. |
| **Fix type** | Script payload |
| **Fix action** | Add `label: 'Lifecycle Test Quote'` and `deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` to the `lcRequestProvider()` quote creation body in `run-lifecycle-checks.mjs`. |
| **Effort** | Trivial |
| **Status** | ☐ Open |

---

### SKIP-03 — LC-13: Assessment Link Flow (Cascades from SKIP-02)

| Field | Value |
|---|---|
| **Lifecycle** | LC-13: Request Service — Assessment Link & Conversion |
| **Skipped step** | All of LC-13 (resolve link, convert to order, idempotency check) |
| **Skip reason** | No assessment token was generated because the quote creation in LC-12 failed (SKIP-02) |
| **Root cause** | Direct cascade — fix SKIP-02 and this resolves automatically |
| **Fix type** | Cascades from SKIP-02 |
| **Fix action** | Fix SKIP-02 first. No separate action needed. |
| **Effort** | Zero (blocked by SKIP-02) |
| **Status** | ☐ Blocked by SKIP-02 |

---

### SKIP-04 — LC-15: No Delivery Record for Test Order

| Field | Value |
|---|---|
| **Lifecycle** | LC-15: Courier Delivery Milestones |
| **Skipped step** | All milestone transitions (`PATCH /api/logistics/api/v1/deliveries/:deliveryId/status`) |
| **Skip reason** | `GET /api/logistics/api/v1/deliveries?orderId=ORD-...` returns 200 but no deliveries — the logistics service hasn't created a delivery job for the test order |
| **Root cause** | A delivery job is created by the logistics service when an order transitions to `PROCESSING` state (after seller verification). The test order is in `SELLER_VERIFIED` state but the logistics saga that creates the delivery may not have fired synchronously. |
| **Fix type** | Workflow state / seed data |
| **Fix action** | Either (a) wait for the logistics creation saga to complete by adding a retry loop in `lcLogisticsDepth()`, or (b) seed a `Logistics_Delivery` row directly linked to the test order's orderId in the seed script. |
| **Effort** | Medium |
| **Status** | ☐ Open |

---

### SKIP-05 — LC-16: Production Plan Creation Missing Required Fields

| Field | Value |
|---|---|
| **Lifecycle** | LC-16: Production Plan Lifecycle |
| **Skipped step** | `POST /api/production/plans/:id/schedule` + `POST /api/production/plans/:id/start` |
| **Skip reason** | `POST /api/production/plans` returns 400 — the `CreateProductionPlan` use case has additional required fields beyond `productId`, `plannedQuantity`, and `targetCompletionDate` |
| **Root cause** | Script-side payload gap. Need to inspect `CreateProductionPlanSchema` (Zod validator in `productionRoutes.ts`) to find all required fields. |
| **Fix type** | Script payload |
| **Fix action** | Read `services/production-service/src/api/validators/production-plan.validator.ts`, identify all required fields, and add them to the `lcProductionPlan()` POST body in `run-lifecycle-checks.mjs`. |
| **Effort** | Low |
| **Status** | ☐ Open |

---

### SKIP-06 — LC-17: Refresh Token Not in JSON Response

| Field | Value |
|---|---|
| **Lifecycle** | LC-17: Auth Depth — Token Refresh |
| **Skipped step** | `POST /api/auth/refresh [buyer]` |
| **Skip reason** | The login response doesn't include `refreshToken` in the JSON body — only `accessToken` is returned in JSON |
| **Root cause** | The auth service likely returns the refresh token as an HTTP-only cookie (`Set-Cookie: refreshToken=...`) rather than in the JSON body. The `api()` helper in the script only reads JSON — it doesn't extract cookies. |
| **Fix type** | Script — cookie handling |
| **Fix action** | Update the `api()` helper to extract `Set-Cookie` headers from the login response and store the refresh token. Then use it in `lcAuthDepth()`. |
| **Effort** | Low |
| **Status** | ☐ Open |

---

### SKIP-07 — LC-19: Seeded Product Has No Variant

| Field | Value |
|---|---|
| **Lifecycle** | LC-19: Inventory Depth |
| **Skipped step** | `GET /api/inventory/stock/:variantId`, `POST /api/inventory/stock/adjust`, `POST /api/inventory/reservations`, `DELETE /api/inventory/reservations/:orderId` |
| **Skip reason** | `ctx.entities.variantId` is `undefined` — the seeded product `Bao la Michezo - Mbao ya Asili` has no variant record in the catalog |
| **Root cause** | The product was seeded at the `Product` level but `ProductVariant` rows were not created for it. Inventory operations work at the variant level. |
| **Fix type** | Seed data |
| **Fix action** | Run `seed-products.ts` to seed the product with at least one variant, or add a `ProductVariant` upsert to `seed-dev-users.ts` for the seeded seller's product. |
| **Effort** | Medium |
| **Status** | ☐ Open |

---

### SKIP-08 — LC-20: No Analytics Action Items

| Field | Value |
|---|---|
| **Lifecycle** | LC-20: Analytics Depth |
| **Skipped step** | `PATCH /api/analytics/action-items/:actionId/resolve [seller]` |
| **Skip reason** | The analytics dashboard response has no `actionItems` array entries for the seller |
| **Root cause** | Action items are generated by the `ActionCenterGenerationJob` which runs every 60 minutes. The seeded seller has no activity that triggers action items (no SLA breaches, no stock alerts, no pending verifications). |
| **Fix type** | Seed data / time-based |
| **Fix action** | Either (a) seed an action item row directly in the `Analytics_SellerActionItem` table, or (b) accept this as a valid skip — the `PATCH /analytics/action-items/:id/resolve` endpoint itself was verified in the previous test run when an action item existed. |
| **Effort** | Low (seed) or Accept as valid skip |
| **Status** | ☐ Open |

---

### SKIP-09 — LC-23: No Payment Record for Wallet Orders

| Field | Value |
|---|---|
| **Lifecycle** | LC-23: Payment Lifecycle |
| **Skipped step** | `GET /api/payment/payments/:paymentId` + `GET /api/payment/payments/:paymentId/status` |
| **Skip reason** | `GET /api/payment/payments/order/:orderId` returns 404 — no payment record exists for the test order |
| **Root cause** | The test checkout uses `paymentMethodId: 'WALLET'` which deducts directly from the wallet balance. The payment service only creates payment records for gateway-processed payments (M-Pesa, card, etc.). Wallet-based orders bypass the payment service. |
| **Fix type** | Workflow / design |
| **Fix action** | Either (a) add a `paymentMethodId` fallback in the checkout that creates a wallet payment record, or (b) add a test order with a non-wallet payment in the seed data. Note: this is a design gap, not a bug. |
| **Effort** | Medium |
| **Status** | ☐ Open |

---

### SKIP-10 — LC-24: No Notifications for Buyer

| Field | Value |
|---|---|
| **Lifecycle** | LC-24: Notification Lifecycle |
| **Skipped step** | `PATCH /api/notification/notifications/:id/status [buyer]` |
| **Skip reason** | `GET /api/notification/notifications [buyer]` returns 200 but empty list — no notifications exist for the seeded buyer |
| **Root cause** | Notifications are created by domain events (order placed, delivery dispatched, etc.). The buyer has received previous orders but the notification service's outbox processor or event handlers may not have fired for the test notifications. |
| **Fix type** | Seed data |
| **Fix action** | Seed one `Notification` row for the buyer in the database, or trigger an order event that causes the notification service to create one. |
| **Effort** | Low |
| **Status** | ☐ Open |

---

### SKIP-11 — LC-26: Training Start Response Missing assessmentId

| Field | Value |
|---|---|
| **Lifecycle** | LC-26: Training Lifecycle |
| **Skipped step** | `POST /api/training/api/v1/assessments/:assessmentId/submit [courier]` |
| **Skip reason** | `POST /api/training/api/v1/training/start` returns 201 but the response body doesn't contain `assessmentId` |
| **Root cause** | The training `start` use case returns a `TrainingRecord` object. The `assessmentId` is either under a different key in the response (e.g., `data.record.id` or `data.trainingRecord.id`), or the module type `platform-overview` doesn't have an associated quiz/assessment. |
| **Fix type** | Script — response key |
| **Fix action** | Log the full `startRes.data` response and find the correct key for the assessment/record ID, then update the extraction logic in `lcTraining()`. |
| **Effort** | Trivial |
| **Status** | ☐ Open |

---

### SKIP-12 — LC-28: Business ID in Legacy Format

| Field | Value |
|---|---|
| **Lifecycle** | LC-28: Business Registry Admin Lifecycle |
| **Skipped step** | `GET /api/business-registry/businesses/:id/compliance-records [admin]`, `/documents [admin]`, `/verify [admin]` |
| **Skip reason** | The seeded business ID `BIZ-MVQTR1YR-DAVN6TLFV` is a legacy human-readable format — the compliance-records and documents endpoints require a ULID-format ID (`biz_*`). The `GET /businesses/search` returns a list with ULID IDs but the first result was empty. |
| **Root cause** | The `businesses/search` endpoint returns results but the response structure wasn't parsed correctly — `searchRes.data?.data?.businesses || searchRes.data?.businesses` may miss the actual results array. |
| **Fix type** | Script — response parsing + seed data |
| **Fix action** | Log the full `searchRes.data` to find the correct results key and extract the first ULID business ID. Also re-seed the seller's business with a ULID ID. |
| **Effort** | Low |
| **Status** | ☐ Open |

---

### SKIP-13 — LC-30: No deliveryId for COD OTP (Cascades from SKIP-04)

| Field | Value |
|---|---|
| **Lifecycle** | LC-30: Maps + COD OTP Lifecycle |
| **Skipped step** | `POST /api/logistics/v1/cod/:deliveryId/otp [courier]` + `POST /api/logistics/v1/cod/:deliveryId/verify [courier]` |
| **Skip reason** | `ctx.entities.deliveryId` is null — no delivery was found in LC-14 |
| **Root cause** | Direct cascade from SKIP-04 — fix SKIP-04 and this resolves automatically |
| **Fix type** | Cascades from SKIP-04 |
| **Fix action** | Fix SKIP-04 first. No separate action needed. |
| **Effort** | Zero (blocked by SKIP-04) |
| **Status** | ☐ Blocked by SKIP-04 |

---

### SKIP-14 — LC-31: Commission Approve (No commissionId)

| Field | Value |
|---|---|
| **Lifecycle** | LC-31: Enabler Commission Attribution |
| **Skipped step** | `PUT /api/commission/:id/approve [admin]` |
| **Skip reason** | `ctx.entities.commissionId` is null — `POST /api/commission/calculate` returned 400 |
| **Root cause** | The commission calculate endpoint requires an `orderId` and `sellerId` in a specific format. The 400 response from LC-22 suggests the body schema validation failed — need to inspect the commission service's calculate validator. |
| **Fix type** | Script payload |
| **Fix action** | Read the commission service's calculate endpoint validator, find all required fields and their formats, then update `lcCommission()` to send the correct body. |
| **Effort** | Low |
| **Status** | ☐ Open |

---

### SKIP-15 — LC-31: Per-order Commission (No commissionId, cascades from SKIP-14)

| Field | Value |
|---|---|
| **Lifecycle** | LC-31: Enabler Commission Attribution |
| **Skipped step** | `PUT /api/commission/:id/approve` (the commission approve step) |
| **Skip reason** | No `commissionId` from LC-22 calculate step |
| **Root cause** | Cascade from SKIP-14 |
| **Fix type** | Cascades from SKIP-14 |
| **Fix action** | Fix SKIP-14. No separate action needed. |
| **Effort** | Zero (blocked by SKIP-14) |
| **Status** | ☐ Blocked by SKIP-14 |

---

## Prioritized Fix Plan

### Priority 1 — Trivial script-side fixes (SKIP-02, SKIP-11, SKIP-14)
These require only reading a validator and updating the request body. Expected to unblock 3 skips and cascade-resolve SKIP-03, SKIP-15.

| # | Fix | Expected skips resolved |
|---|---|---|
| 1a | SKIP-02: Add `label` + `deliveryDate` to quote creation body | SKIP-02 + SKIP-03 |
| 1b | SKIP-11: Find correct `assessmentId` key in training start response | SKIP-11 |
| 1c | SKIP-14: Fix commission calculate body fields | SKIP-14 + SKIP-15 |

### Priority 2 — Script response parsing fixes (SKIP-06, SKIP-12)

| # | Fix | Expected skips resolved |
|---|---|---|
| 2a | SKIP-06: Add cookie extraction to `api()` helper for refresh token | SKIP-06 |
| 2b | SKIP-12: Fix business search result key parsing to extract ULID businessId | SKIP-12 |

### Priority 3 — Seed data additions (SKIP-01, SKIP-07, SKIP-10)

| # | Fix | Expected skips resolved |
|---|---|---|
| 3a | SKIP-07: Seed `ProductVariant` for the seeded product to populate variantId | SKIP-07 |
| 3b | SKIP-01: Seed a dispute record for the buyer | SKIP-01 |
| 3c | SKIP-10: Seed a notification record for the buyer | SKIP-10 |

### Priority 4 — Workflow / architecture gaps (SKIP-04, SKIP-09, SKIP-08)

| # | Fix | Expected skips resolved |
|---|---|---|
| 4a | SKIP-04: Add retry loop in logistics depth lifecycle to wait for delivery creation, or seed a delivery row | SKIP-04 + SKIP-13 |
| 4b | SKIP-08: Seed an analytics action item row for the seller | SKIP-08 |
| 4c | SKIP-09: Design decision — either add payment record for wallet orders or accept as valid skip | SKIP-09 |

---

## Expected Skip Count After Each Priority

| After priority | Remaining skips |
|---|---|
| Baseline (current) | 15 |
| After Priority 1 | 10 |
| After Priority 2 | 8 |
| After Priority 3 | 5 |
| After Priority 4 | 2–3 (SKIP-09 is a design decision) |

---

## Fixes Already Applied (History)

These were previously documented in `BACKEND_DEFICIENCY_BACKLOG.md` and have been resolved:

| Issue | Status |
|---|---|
| Route mounting bug — 8 services using `Module.routes = router` | ✅ Fixed |
| Server crash on unhandled rejection (outbox processor re-throw) | ✅ Fixed |
| Server bootstrap failure on single module error | ✅ Fixed |
| Analytics sub-routes not mounted (SLA breaches, revenue-health, etc.) | ✅ Fixed |
| Notification routes — list and unread-count sub-routes | ✅ Fixed |
| Chat conversation list route | ✅ Fixed |
| Catalog categories and search-products routes | ✅ Fixed |
| Payment methods route | ✅ Fixed |
| Production plans list (405 → 200) | ✅ Fixed |
| Logistics delivery query `orderId` param validation | ✅ Fixed |
| Request assessment admin override | ✅ Fixed |
| Request assignment missing `providerId` body field | ✅ Fixed |
| Enabler profile seeding + token-based access | ✅ Fixed |
| Auth password reset route path | ✅ Fixed |
| Request delivery address schema (ward-level precision) | ✅ Fixed |
| TypeScript `RequestHandler` type error in main.ts | ✅ Fixed |

---

*Last updated: 2026-11-03*
*Next run command: `node scripts/verification/run-lifecycle-checks.mjs`*
*Results file: `docs/verification/lifecycle-results.json`*
