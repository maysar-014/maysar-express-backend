# Buyer Flows — Support Service

> **Verification status:** Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` — support-service section; `docs/support/SUPPORT_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/support/user-flow/buyer-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/support/frontend-guide/buyer-guide.md`

---

## Flows in This Document

| Flow ID | Flow Name | Status | Primary Endpoint |
|---------|-----------|--------|-----------------|
| SUP-BUY-01 | Create Support Ticket | Verified | `POST /api/support/tickets` |
| SUP-BUY-02 | Add Message to Ticket | Verified | `POST /api/support/tickets/:ticketId/messages` |
| SUP-BUY-03 | View Ticket Status | Verified | `GET /api/support/tickets/:ticketId` |
| SUP-BUY-04 | Open COD Dispute | Verified | `POST /api/support/disputes` |

---

## Flow SUP-BUY-01: Create Support Ticket

| Field | Value |
|-------|-------|
| **Actor** | Buyer |
| **Trigger** | Buyer has an issue to report |
| **Preconditions** | Buyer is authenticated with a valid JWT. |
| **Terminal states** | Ticket created with status `OPEN`; `ticketNumber` returned as reference; SLA deadline countdown begins |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Buyer | Submit support ticket | `POST /api/support/tickets` | Buyer JWT | 201 `{ data: { ticketId, status: "OPEN", ticketNumber: "SUP-2026-XXXXX", slaDeadline } }` |

**Request body:**
```jsonc
{
  "subject": "Order not delivered",
  "description": "My order ORD-01... was marked delivered but I did not receive it.",
  "category": "DELIVERY_ISSUE",
  "priority": "HIGH",
  "orderId": "ORD-01..."
}
```

**Allowed `category` values:** `ORDER_ISSUE` | `PAYMENT_ISSUE` | `DELIVERY_ISSUE` | `ACCOUNT_ISSUE` | `KYC_ISSUE` | `REFUND_REQUEST` | `GENERAL`

**Allowed `priority` values:** `LOW` | `MEDIUM` | `HIGH` | `URGENT`

### Service Interaction Chain

`CreateTicketUseCase` creates the ticket with status `OPEN` and calculates `slaDeadline` based on the supplied priority (higher priority = shorter SLA window). A confirmation notification is sent to the buyer. `support.ticket_created` is published with `{ ticketId, userId, category, priority }`, which triggers agent notification so the ticket enters the work queue.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| `category` not in allowed enum | 422 validation error | `VALIDATION_ERROR` | No ticket created |
| `priority` not in allowed enum | 422 validation error | `VALIDATION_ERROR` | No ticket created |
| Missing required fields (`subject`, `description`) | 422 validation error | `VALIDATION_ERROR` | No ticket created |
| No JWT or expired token | 401 unauthorized | — | No ticket created |

---

## Flow SUP-BUY-02: Add Message to Ticket

| Field | Value |
|-------|-------|
| **Actor** | Buyer |
| **Trigger** | Buyer wants to add information or follow up on an existing ticket |
| **Preconditions** | Buyer is authenticated. Ticket exists, belongs to the buyer, and is not `CLOSED`. |
| **Terminal states** | Message appended to ticket thread; thread is append-only and permanent |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Buyer | Post a message to the thread | `POST /api/support/tickets/:ticketId/messages` | Buyer JWT | 201 `{ data: { messageId, sender: "USER", body, createdAt } }` |

**Request body:**
```jsonc
{
  "content": "I checked with my neighbours — the package was definitely not left here.",
  "attachments": []
}
```

### Service Interaction Chain

`AddTicketMessageUseCase` validates the ticket exists and belongs to the authenticated buyer, then appends the message to the ticket thread. Messages are **append-only** — they are never edited or deleted. The ticket's `lastActivityAt` timestamp is updated. The permanent audit trail is a platform guarantee.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| `:ticketId` not found | 404 not found | — | No message created |
| Ticket is `CLOSED` | 409 conflict — cannot add message to closed ticket | — | No message created |
| Authenticated user is not the ticket owner | 403 forbidden | — | No message created |
| Empty `content` | 422 validation error | `VALIDATION_ERROR` | No message created |

---

## Flow SUP-BUY-03: View Ticket Status

| Field | Value |
|-------|-------|
| **Actor** | Buyer |
| **Trigger** | Buyer wants to check the current status and conversation thread of their ticket |
| **Preconditions** | Buyer is authenticated. `:ticketId` belongs to this buyer. |
| **Terminal states** | Returns ticket detail with full message thread; no state mutation |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Buyer | Fetch ticket detail with thread | `GET /api/support/tickets/:ticketId` | Buyer JWT | 200 `{ data: { ticketId, status, assignedAgentId, messages[], slaDeadline } }` |

**Example response:**
```jsonc
{
  "data": {
    "ticketId": "tkt_01...",
    "ticketNumber": "SUP-2026-00123",
    "status": "IN_PROGRESS",
    "category": "DELIVERY_ISSUE",
    "priority": "HIGH",
    "assignedAgentId": "agt_01...",
    "slaDeadline": "2026-09-02T10:00:00Z",
    "messages": [
      { "sender": "USER", "body": "My order was not delivered.", "createdAt": "..." },
      { "sender": "AGENT", "body": "We are investigating this.", "createdAt": "..." }
    ],
    "createdAt": "..."
  }
}
```

### Service Interaction Chain

`ListTicketsUseCase` (single-ticket variant) validates the caller owns the ticket, then returns the ticket entity with its full message thread ordered by `createdAt` ascending. The route itself is verified to exist; a 404 at this endpoint is a data-level absence (no ticket with that ID), not a missing route.

**Status display guide:**

| Status | Display Text |
|--------|-------------|
| `OPEN` | Submitted — awaiting agent |
| `IN_PROGRESS` | Being handled |
| `ESCALATED` | Escalated to senior support |
| `RESOLVED` | Resolved |
| `CLOSED` | Closed |

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| No ticket with this ID | 404 data-level (route verified) | — | No data returned |
| Authenticated user is not the ticket owner | 403 forbidden | — | No data returned |
| No JWT or expired token | 401 unauthorized | — | No data returned |

---

## Flow SUP-BUY-04: Open COD Dispute

| Field | Value |
|-------|-------|
| **Actor** | Buyer |
| **Trigger** | Buyer has an issue with a COD order — e.g., paid cash but order not correctly recorded, or goods not received despite courier marking delivery |
| **Preconditions** | Buyer is authenticated. |
| **Terminal states** | COD dispute created with status `OPEN`; escalated to support queue for agent review |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Buyer | Open COD dispute | `POST /api/support/disputes` | Buyer JWT | 201 `{ data: { disputeId, status: "OPEN" } }` |
| 2 | Buyer (optional) | Add supporting evidence | `POST /api/support/disputes/:id/evidence` | Buyer JWT | 201 — evidence record created |

**Request body for dispute creation:**
```jsonc
{
  "orderId": "ORD-01...",
  "description": "I paid cash on delivery but the item was damaged.",
  "category": "COD_DISPUTE",
  "evidence": []
}
```

### Service Interaction Chain

The dispute record is created with status `OPEN` and linked to the `orderId`. The dispute is surfaced in the support agent queue for review. The buyer may optionally attach evidence via `POST /api/support/disputes/:id/evidence` after creation.

When an agent later resolves the dispute via `POST /api/support/disputes/:id/resolve`, a `COD_DISPUTE_RESOLVED` event is emitted. user-service consumes this event and applies a COD reputation penalty to the buyer's trust score, which may reduce their COD tier and lower their exposure limits. See `docs/FLOWS/support/user-flow/support-agent-flows.md` — Flow SUP-AGT-07 for the full resolution chain.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Invalid or non-existent `orderId` | 422 validation error | — | No dispute created |
| Dispute already open for this order | 409 conflict — duplicate dispute | — | No new dispute created |
| No JWT or expired token | 401 unauthorized | — | No dispute created |
