# Buyer Guide — Request Service

> Mirrors: `docs/FLOWS/request/user-flow/buyer-flows.md`
> Verification status: Verified (103/103 tests)
> Last updated: September 2026

## Overview

This guide covers the buyer UI for the custom request flow: submitting a request, tracking its status, messaging with the provider, reviewing a quote via a secure link, and accepting the offer to create an order. This flow is entirely separate from catalog/checkout.

---

## Flow 1: Submit a Request

**User Goal:** Request a custom item not available in the catalog.

**UI States:** Form | Loading | Success ("Request submitted — we'll be in touch") | Validation error | Error

**Action:** `POST /api/request/requests`

Required fields to collect:
- Title (what they want)
- Item descriptions + quantities
- Delivery address (city + region are required)
- Optional budget

Success: show request ID and status "Submitted — awaiting review."

| Status | Code | User-Facing Message |
|---|---|---|
| 400 | VALIDATION_ERROR | Highlight specific missing fields |
| 401 | UNAUTHORIZED | "Please log in again." |
| 5xx | — | "Something went wrong. Please try again." |

---

## Flow 2: Track Request Status

**User Goal:** Know where their request is in the process.

**Action:** `GET /api/request/requests/:requestId`

Map raw status to buyer-friendly labels:

| API Status | Display Label |
|---|---|
| SUBMITTED | "Submitted — awaiting review" |
| ASSESSING | "Being reviewed by our team" |
| NEEDS_CLARIFICATION | "We need more information — check messages" |
| FULFILLABLE | "We can source this — preparing your quote" |
| UNFULFILLABLE | "Unable to source — this item cannot be fulfilled" |
| QUOTE_PUBLISHED | "Your quote is ready — review it now" |
| CONVERTED | "Order placed ✓" |
| CANCELLED | "Cancelled" |
| EXPIRED | "Expired — please submit a new request" |

For `UNFULFILLABLE`: show the reason from the provider and offer to submit a new request.

---

## Flow 3: Message Thread

**User Goal:** Communicate with the provider about their request.

**Action:** `POST /api/request/requests/:requestId/messages` / `GET /api/request/requests/:requestId/messages`

Messages are append-only. Show `authorType: "CUSTOMER"` as buyer's own messages and `authorType: "PROVIDER"` or `"SYSTEM"` as provider/system messages. Never show "SYSTEM" as a raw label — map to "Maysar".

---

## Flow 4: View Quote

**Action:** `GET /api/request/requests/:requestId/quotes`

Show PUBLISHED quotes only. Never show DRAFT or SUPERSEDED quotes — the API filters these automatically.

For each quote, show:
- `sellingPriceTzs` (what buyer pays) — prominently
- `deliveryDate`
- `validUntil` with a countdown timer
- Items list

**Never show** `procurementCostTzs` (internal cost) — it is not included in customer-facing API responses.

---

## Flow 5: Resolve Assessment Link

**User Goal:** Review a quote through a secure link the provider shared.

**Action:** `GET /api/request/requests/assess/:token` — **no JWT required**, token is the credential

**UI States:** Loading | Quote review screen | Link expired (410) | Link already used (410) | Not found (404)

This is a public endpoint. The token comes from the URL (e.g., shared via message or email). Show the full quote summary with Accept button.

| Status | Code | User-Facing Message |
|---|---|---|
| 410 | LINK_EXPIRED | "This offer link has expired. Please contact your provider for a new link." |
| 410 | LINK_CONSUMED | "This offer has already been accepted." |
| 404 | LINK_NOT_FOUND | "This link is invalid or has been removed." |

---

## Flow 6: Accept Offer (Convert to Order)

**User Goal:** Accept the quote and place the order.

**Action:** `POST /api/request/requests/assess/:token/convert` — **no JWT required**

**UI States:** Loading ("Placing your order...") | Success ("Order placed ✓") | Expired (410) | Already accepted (idempotent)

> ⚠️ **Idempotent:** This endpoint is safe to call twice. If the order already exists (e.g., network retry), it returns `{ orderId, created: false }` — no duplicate order is created. Always check `created` in the response. If `created: false`, navigate to the existing `orderId` without showing an error.

- Success `created: true`: "Order placed ✓ — your `orderId` is ready." Navigate to order detail.
- Success `created: false` (retry): navigate to existing order silently.

| Status | Code | User-Facing Message |
|---|---|---|
| 410 | LINK_EXPIRED | "This offer link has expired." |
| 410 | QUOTE_EXPIRED | "This offer has expired. Please request a new quote." |
| 410 | LINK_CONSUMED | "Order already placed — navigating to your order." (then navigate) |

---

## Flow 7: Cancel Request

**Action:** `POST /api/request/requests/:requestId/cancel`

**Show confirmation dialog before cancelling:** "Cancel this request? This cannot be undone."

Only show the cancel button when status is SUBMITTED, ASSESSING, or NEEDS_CLARIFICATION. Hide or disable it for all other statuses.

| Status | Code | User-Facing Message |
|---|---|---|
| 422 | INVALID_STATUS_TRANSITION | "This request can no longer be cancelled." |
