# Provider Guide — Request Service

> Mirrors: `docs/FLOWS/request/user-flow/provider-flows.md`
> Verification status: Verified (103/103 tests)
> Last updated: September 2026

## Overview

This guide covers the provider/ops UI for the request service: triaging the request inbox, assessing feasibility, sourcing items, creating and publishing quotes, and generating the buyer assessment link.

**Auth:** Bearer JWT with `provider`, `admin`, or `ops` role.

---

## Flow 1: Request Inbox

**Action:** `GET /api/request/provider/requests?status=SUBMITTED`

Show requests list with status badges. Badge counts per status for triage. Sort by submission date (oldest first for SUBMITTED).

---

## Flow 2: Assign and Assess

**Assign:** `POST /api/request/provider/requests/:requestId/assign`
**Assess:** `POST /api/request/provider/requests/:requestId/assess`

After assigning, show: "Assign to me" button. After assigning, show the assessment form.

Assessment UI:
- Two options: "Can fulfill ✓" and "Cannot fulfill ✗"
- If "Cannot fulfill": require a reason field
- Show confirmation before submitting "Cannot fulfill" — it is a dead end (request cannot be quoted after this)

For `UNFULFILLABLE` requests: show the reason prominently. Do not show "Create Quote" button — it will be blocked by the API anyway.

---

## Flow 3: Source Items (Phase 2)

**Set source:** `POST /api/request/provider/requests/:requestId/items/:itemId/source`

Show a sourcing checklist for each item. Each item needs a source with `CONFIRMED` availability before the quote can be published.

Show sourcing status per item:
- ⬜ Not sourced
- 🔄 PENDING — waiting for supplier confirmation
- ✅ CONFIRMED — ready to publish
- ❌ UNAVAILABLE — need alternative

The "Publish Quote" button must be disabled until all items show ✅ CONFIRMED.

---

## Flow 4: Create Quote

**Action:** `POST /api/request/provider/quotes/:requestId/quotes`

Form fields:
- `procurementCostTzs` — internal cost (never shown to buyer)
- `logisticsCostTzs` — logistics cost (never shown to buyer)
- `sellingPriceTzs` — price the buyer sees — must be ≥ procurement + logistics
- `validUntil` — quote expiry (must be in the future)
- Items list with descriptions and quantities
- Provider notes (never shown to buyer)

Validation: enforce `sellingPriceTzs ≥ procurementCostTzs + logisticsCostTzs` client-side before submit.

---

## Flow 5: Publish Quote

**Action:** `POST /api/request/provider/quotes/:quoteId/publish`

**Sourcing gate:** all items must have `CONFIRMED` source. Show a pre-publish checklist:
- ✅ All items sourced
- ✅ Quote price valid
- ✅ Valid until date is in the future

On success: quote is published (immutable). Quote becomes visible to the buyer. Show "Generate Assessment Link" button.

| Status | Code | User-Facing Message |
|---|---|---|
| 422 | SOURCING_INCOMPLETE | "Some items are not yet confirmed. Complete sourcing before publishing." |
| 422 | INVALID_STATUS_TRANSITION | "This quote has already been published." |

---

## Flow 6: Generate Assessment Link

**Action:** `POST /api/request/provider/quotes/:quoteId/assessment-link`

> ⚠️ **CRITICAL — Token shown exactly once.** The raw token in the response is never retrievable again. Show it prominently and instruct the provider to copy and share it immediately.

UI treatment:
1. Show a modal/dialog after generation with: "Copy this link and share it with the buyer. It will not be shown again."
2. Large "Copy link" button
3. Pre-formatted link: `https://{app-domain}/request/assess/{token}`
4. Once dismissed, show only the link ID and creation date — not the raw token

The buyer uses this link to review and accept the quote without logging in.

---

## Flow 7: View Procurement (Phase 2)

**Action:** `GET /api/request/provider/procurement/orders/:orderId`

Show procurement status per item after order conversion:

| Status | Label |
|---|---|
| PENDING | Awaiting order to supplier |
| ORDERED | Ordered from supplier |
| RECEIVED | Received — ready to fulfill |
| FAILED | Failed — needs attention |

Advance: `POST /api/request/provider/procurement/orders/:orderId/advance`

This is Maysar-internal. Never expose procurement data to the buyer.
