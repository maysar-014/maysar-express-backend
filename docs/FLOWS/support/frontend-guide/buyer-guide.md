# Buyer Guide — Support Service

> Mirrors: `docs/FLOWS/support/user-flow/buyer-flows.md`
> Verification status: Verified
> Last updated: September 2026

## Overview

This guide covers support UI for buyers: creating tickets, adding messages, checking status, and opening COD disputes.

---

## Flow 1: Create Support Ticket

**User Goal:** Report an issue and get help.

**UI States:** Form | Loading | Created (ticketNumber shown) | Validation error | Error

**Action:** `POST /api/support/tickets`
```json
{ "subject": "...", "description": "...", "category": "DELIVERY_ISSUE", "priority": "HIGH", "orderId": "optional" }
```

- Success: "Your ticket **SUP-2026-XXXXX** has been received. We'll be in touch soon."
- Show SLA deadline countdown after creation

| Status | Message |
|---|---|
| 422 VALIDATION_ERROR | Highlight invalid fields with specific messages |
| 401 | "Please log in again." |
| 5xx | "Something went wrong. Please try again." |

**Category options to show:** ORDER_ISSUE, PAYMENT_ISSUE, DELIVERY_ISSUE, ACCOUNT_ISSUE, KYC_ISSUE, REFUND_REQUEST, GENERAL
**Priority options:** LOW, MEDIUM, HIGH, URGENT

---

## Flow 2: Add Message to Ticket

**User Goal:** Follow up on an existing ticket.

**UI States:** Input form | Sending | Sent | Ticket closed (409) | Error

**Action:** `POST /api/support/tickets/:ticketId/messages` with `{ content: "..." }`

Messages are append-only — they cannot be edited or deleted.

| Status | Message |
|---|---|
| 409 | "This ticket is closed. Open a new ticket if you need further help." |
| 403 | "You do not have permission to add messages to this ticket." |
| 5xx | "Something went wrong. Please try again." |

---

## Flow 3: View Ticket Status

**User Goal:** Check on their ticket.

**UI States:** Loading | Ticket detail with thread | Not found | Error

**Action:** `GET /api/support/tickets/:ticketId`

Show status with buyer-friendly labels:

| API Status | Display Label |
|---|---|
| OPEN | "Submitted — awaiting agent" |
| IN_PROGRESS | "Being handled" |
| ESCALATED | "Escalated to senior support" |
| RESOLVED | "Resolved" |
| CLOSED | "Closed" |

Show SLA deadline countdown while OPEN or IN_PROGRESS.

---

## Flow 4: Open COD Dispute

**User Goal:** Dispute a COD transaction.

**UI States:** Form | Loading | Created | Duplicate (409) | Error

**Action:** `POST /api/support/disputes` with `{ orderId, description, category: "COD_DISPUTE" }`

- Success: "Your COD dispute **DIS-XXXXX** has been submitted. An agent will review it shortly."
- 409: "A dispute for this order has already been submitted."
