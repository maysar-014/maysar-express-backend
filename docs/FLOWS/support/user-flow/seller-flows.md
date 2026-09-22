# Seller Flows — Support Service

> **Verification status:** Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` — support-service section; `docs/support/SUPPORT_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/support/user-flow/seller-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/support/frontend-guide/seller-guide.md`

---

## Flows in This Document

| Flow ID | Flow Name | Status | Primary Endpoint |
|---------|-----------|--------|-----------------|
| SUP-SEL-01 | Create Support Ticket | Verified | `POST /api/support/tickets` |
| SUP-SEL-02 | Add Message to Ticket | Verified | `POST /api/support/tickets/:ticketId/messages` |
| SUP-SEL-03 | View Ticket Status | Verified | `GET /api/support/tickets/:ticketId` |

The support ticket flow is **identical for buyer and seller roles** — the same endpoint, request schema, and response shape apply. The only difference is the JWT role and the nature of the issues reported.

---

## Flow SUP-SEL-01: Create Support Ticket

| Field | Value |
|-------|-------|
| **Actor** | Seller |
| **Trigger** | Seller has an issue to report (order dispute, payment, account, KYC, refund, or general inquiry) |
| **Preconditions** | Seller is authenticated with a valid JWT. |
| **Terminal states** | Ticket created with status `OPEN`; `ticketNumber` returned as reference; SLA deadline countdown begins |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Seller | Submit support ticket | `POST /api/support/tickets` | Seller JWT | 201 `{ data: { ticketId, status: "OPEN", ticketNumber: "SUP-2026-XXXXX", slaDeadline } }` |

**Example request body:**
```jsonc
{
  "subject": "Payout not received",
  "description": "I requested a payout 3 days ago but funds have not arrived in my account.",
  "category": "PAYMENT_ISSUE",
  "priority": "HIGH"
}
```

**Allowed `category` values:** `ORDER_ISSUE` | `PAYMENT_ISSUE` | `DELIVERY_ISSUE` | `ACCOUNT_ISSUE` | `KYC_ISSUE` | `REFUND_REQUEST` | `GENERAL`

**Allowed `priority` values:** `LOW` | `MEDIUM` | `HIGH` | `URGENT`

### Service Interaction Chain

`CreateTicketUseCase` creates the ticket with status `OPEN` and calculates `slaDeadline` based on the supplied priority. A confirmation notification is sent to the seller. `support.ticket_created` is published with `{ ticketId, userId, category, priority }`, which triggers agent notification so the ticket enters the work queue.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| `category` not in allowed enum | 422 validation error | `VALIDATION_ERROR` | No ticket created |
| `priority` not in allowed enum | 422 validation error | `VALIDATION_ERROR` | No ticket created |
| Missing required fields (`subject`, `description`) | 422 validation error | `VALIDATION_ERROR` | No ticket created |
| No JWT or expired token | 401 unauthorized | — | No ticket created |

---

## Flow SUP-SEL-02: Add Message to Ticket

| Field | Value |
|-------|-------|
| **Actor** | Seller |
| **Trigger** | Seller wants to add information or follow up on an existing ticket |
| **Preconditions** | Seller is authenticated. Ticket exists, belongs to the seller, and is not `CLOSED`. |
| **Terminal states** | Message appended to ticket thread; thread is append-only and permanent |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Seller | Post a message to the thread | `POST /api/support/tickets/:ticketId/messages` | Seller JWT | 201 `{ data: { messageId, sender: "USER", body, createdAt } }` |

**Request body:**
```jsonc
{
  "content": "I have attached the bank statement showing the payout was never received.",
  "attachments": []
}
```

### Service Interaction Chain

`AddTicketMessageUseCase` validates the ticket exists and belongs to the authenticated seller, then appends the message. Messages are **append-only** — never edited or deleted. The permanent audit trail is a platform guarantee. The ticket's `lastActivityAt` timestamp is updated.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| `:ticketId` not found | 404 not found | — | No message created |
| Ticket is `CLOSED` | 409 conflict — cannot add message to closed ticket | — | No message created |
| Authenticated user is not the ticket owner | 403 forbidden | — | No message created |
| Empty `content` | 422 validation error | `VALIDATION_ERROR` | No message created |

---

## Flow SUP-SEL-03: View Ticket Status

| Field | Value |
|-------|-------|
| **Actor** | Seller |
| **Trigger** | Seller wants to check the current status and conversation thread of their ticket |
| **Preconditions** | Seller is authenticated. `:ticketId` belongs to this seller. |
| **Terminal states** | Returns ticket detail with full message thread; no state mutation |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Seller | Fetch ticket detail with thread | `GET /api/support/tickets/:ticketId` | Seller JWT | 200 `{ data: { ticketId, status, assignedAgentId, messages[], slaDeadline } }` |

**Example response:**
```jsonc
{
  "data": {
    "ticketId": "tkt_01...",
    "ticketNumber": "SUP-2026-00456",
    "status": "IN_PROGRESS",
    "category": "PAYMENT_ISSUE",
    "priority": "HIGH",
    "assignedAgentId": "agt_01...",
    "slaDeadline": "2026-09-02T10:00:00Z",
    "messages": [
      { "sender": "USER", "body": "Payout not received after 3 days.", "createdAt": "..." },
      { "sender": "AGENT", "body": "We are reviewing your payout request.", "createdAt": "..." }
    ],
    "createdAt": "..."
  }
}
```

### Service Interaction Chain

Validates the caller owns the ticket, then returns the entity with its full message thread ordered by `createdAt` ascending. The route is verified to exist; a 404 at this endpoint is a data-level absence (no ticket with that ID), not a missing route.

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
