# Support Agent Flows — Support Service

> **Verification status:** Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` — support-service section; `docs/support/SUPPORT_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/support/user-flow/support-agent-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/support/frontend-guide/support-agent-guide.md`

---

## Flows in This Document

| Flow ID | Flow Name | Status | Primary Endpoint |
|---------|-----------|--------|-----------------|
| SUP-AGT-01 | View Ticket Inbox | Verified | `GET /api/support/admin/tickets` |
| SUP-AGT-02 | Assign Ticket | Verified | `PATCH /api/support/tickets/:id/assign` |
| SUP-AGT-03 | Add Message to Ticket | Verified | `POST /api/support/tickets/:ticketId/messages` |
| SUP-AGT-04 | Resolve Ticket | Verified | `POST /api/support/tickets/:id/resolve` |
| SUP-AGT-05 | Close Ticket | Verified | `POST /api/support/tickets/:id/close` |
| SUP-AGT-06 | Escalate Ticket | Verified | `POST /api/support/tickets/:id/escalate` |
| SUP-AGT-07 | Resolve COD Dispute | Verified | `POST /api/support/disputes/:id/resolve` |

---

## Flow SUP-AGT-01: View Ticket Inbox

| Field | Value |
|-------|-------|
| **Actor** | Support Agent |
| **Trigger** | Agent opens their work queue to triage tickets |
| **Preconditions** | Agent JWT (role: `support-agent` or `admin`). |
| **Terminal states** | Returns paginated ticket list; no state mutation |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Support Agent | Fetch ticket inbox | `GET /api/support/admin/tickets?status=OPEN&page=1&limit=20` | Agent JWT | 200 `{ data: { tickets[], pagination } }` |

**Supported query parameters:**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `status` | `OPEN` \| `IN_PROGRESS` \| `ESCALATED` \| `RESOLVED` \| `CLOSED` | Filter by status |
| `priority` | `LOW` \| `MEDIUM` \| `HIGH` \| `URGENT` | Filter by priority |
| `category` | ticket category enum | Filter by category |
| `page` | integer | Page number |
| `limit` | integer | Page size |

### Service Interaction Chain

`ListTicketsUseCase` applies the supplied filters and returns a paginated result. The `admin/tickets` variant skips the per-user ownership filter — agents see all tickets, not just their own. Each ticket entry includes `status`, `priority`, `category`, `slaDeadline`, and `assignedAgentId` for triage.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Caller does not have agent or admin role | 403 forbidden | `PERMISSION_BOUNDARY` | No data returned |
| No JWT or expired token | 401 unauthorized | — | No data returned |

---

## Flow SUP-AGT-02: Assign Ticket

| Field | Value |
|-------|-------|
| **Actor** | Support Agent / Admin |
| **Trigger** | Agent picks up or assigns a ticket to begin handling it |
| **Preconditions** | Agent or admin JWT. Ticket must be in `OPEN` status. |
| **Terminal states** | Ticket status `IN_PROGRESS`; `assignedAgentId` set; ticket owner notified |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Support Agent | Assign ticket to agent | `PATCH /api/support/tickets/:id/assign` | Agent/Admin JWT | 200 `{ data: { ticketId, status: "IN_PROGRESS", assignedAgentId } }` |

**Request body:**
```jsonc
{
  "agentId": "agt_01..."
}
```

### Service Interaction Chain

`AssignTicketUseCase` sets `assignedAgentId` on the ticket and transitions status `OPEN → IN_PROGRESS`. A notification is sent to the ticket owner (buyer or seller) confirming an agent has been assigned.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Ticket `:id` not found | 404 not found | — | No state change |
| `agentId` does not correspond to a valid agent | 422 validation error | — | No state change |
| Ticket is already assigned | 409 conflict — or reassignment allowed by policy | — | Status unchanged |
| Insufficient role | 403 forbidden | — | No state change |

---

## Flow SUP-AGT-03: Add Message to Ticket

| Field | Value |
|-------|-------|
| **Actor** | Support Agent |
| **Trigger** | Agent needs to communicate with the ticket owner or document actions taken |
| **Preconditions** | Agent JWT. Ticket exists and is not `CLOSED`. |
| **Terminal states** | Message appended to ticket thread; thread is append-only and permanent |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Support Agent | Post a message to the thread | `POST /api/support/tickets/:ticketId/messages` | Agent JWT | 201 `{ data: { messageId, sender: "AGENT", body, createdAt } }` |

**Request body:**
```jsonc
{
  "content": "We have reviewed your case and escalated to the payments team.",
  "attachments": []
}
```

### Service Interaction Chain

`AddTicketMessageUseCase` appends the message to the ticket thread with `sender: "AGENT"`. Messages are **append-only** — never edited or deleted. The permanent audit trail applies equally to agent messages. The ticket's `lastActivityAt` timestamp is updated.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| `:ticketId` not found | 404 not found | — | No message created |
| Ticket is `CLOSED` | 409 conflict — cannot add message to closed ticket | — | No message created |
| Empty `content` | 422 validation error | `VALIDATION_ERROR` | No message created |

---

## Flow SUP-AGT-04: Resolve Ticket

| Field | Value |
|-------|-------|
| **Actor** | Support Agent |
| **Trigger** | Agent has addressed the issue and marks the ticket resolved |
| **Preconditions** | Agent JWT. Ticket is `IN_PROGRESS` and assigned. |
| **Terminal states** | Ticket status `RESOLVED`; `support.ticket_resolved` event published; ticket owner notified |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Support Agent | Resolve the ticket | `POST /api/support/tickets/:id/resolve` | Agent JWT | 200 `{ data: { ticketId, status: "RESOLVED", resolvedAt } }` |

### Service Interaction Chain

`ResolveTicketUseCase` transitions status `IN_PROGRESS → RESOLVED`, writes `resolvedAt`, sends a resolution notification to the ticket owner, and publishes `support.ticket_resolved` with `{ ticketId, resolvedAt, agentId }`. A resolved ticket can be reopened to `IN_PROGRESS` if the issue recurs.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Invalid status transition (ticket is not `IN_PROGRESS`) | 409 conflict | — | No state change |
| Ticket `:id` not found | 404 data-level (route verified) | — | No state change |
| Insufficient role | 403 forbidden | — | No state change |

---

## Flow SUP-AGT-05: Close Ticket

| Field | Value |
|-------|-------|
| **Actor** | Support Agent |
| **Trigger** | Agent permanently closes a resolved ticket |
| **Preconditions** | Agent JWT. Ticket is `RESOLVED`. |
| **Terminal states** | Ticket status `CLOSED` (terminal — no further state transitions unless explicitly reopened) |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Support Agent | Close the ticket | `POST /api/support/tickets/:id/close` | Agent JWT | 200 `{ data: { ticketId, status: "CLOSED" } }` |

### Service Interaction Chain

The status transitions `RESOLVED → CLOSED`. `CLOSED` is a terminal state — no further status transitions are valid unless the ticket is explicitly reopened (`CLOSED → IN_PROGRESS`). No event is published for close; resolution is the meaningful signal.

**Full ticket lifecycle:**
```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
                         ↑           ↓
                         └─ reopen ──┘ (RESOLVED | CLOSED → IN_PROGRESS)
```

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Ticket is not `RESOLVED` | 409 conflict — invalid transition | — | No state change |
| Ticket `:id` not found | 404 not found | — | No state change |

---

## Flow SUP-AGT-06: Escalate Ticket

| Field | Value |
|-------|-------|
| **Actor** | Support Agent (or system, on SLA breach) |
| **Trigger** | Ticket requires senior review, is too complex for first-line resolution, or SLA deadline is breached |
| **Preconditions** | Agent JWT for manual escalation. Ticket is `IN_PROGRESS`. SLA breach triggers automatic escalation without agent action. |
| **Terminal states** | Ticket status `ESCALATED`; `support.ticket_escalated` event published; senior support team notified |
| **Verification status** | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Support Agent | Escalate ticket with reason | `POST /api/support/tickets/:id/escalate` | Agent JWT | 200 `{ data: { ticketId, status: "ESCALATED" } }` |

**Request body:**
```jsonc
{
  "reason": "Payment dispute requires treasury team review."
}
```

### Service Interaction Chain

`EscalateTicketUseCase` transitions status `IN_PROGRESS → ESCALATED` and publishes `support.ticket_escalated` with `{ ticketId, escalationLevel }`. The next-tier support team is notified. `reason` is required for manual escalation; it is recorded on the ticket.

**Automatic SLA escalation:** When `slaDeadline` is exceeded and the ticket has not been resolved, the SLA breach job calls the same `EscalateTicketUseCase` automatically — agents do not need to manually escalate in this case.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| `reason` field is absent or empty | 422 validation error | `VALIDATION_ERROR` | No state change |
| Ticket cannot be escalated from current status | 409 conflict — invalid transition | — | No state change |
| Ticket `:id` not found | 404 not found | — | No state change |
| Insufficient role | 403 forbidden | — | No state change |

---

## Flow SUP-AGT-07: Resolve COD Dispute

| Field | Value |
|-------|-------|
| **Actor** | Support Agent |
| **Trigger** | Agent reviews and resolves a COD dispute submitted by a buyer |
| **Preconditions** | Agent JWT. COD dispute exists and has status `OPEN`. |
| **Terminal states** | Dispute status `RESOLVED`; `COD_DISPUTE_RESOLVED` event emitted; buyer's COD trust score decremented by user-service |
| **Verification status** | Verified |

> ⚠️ **Critical — Real and lasting consequences:** Resolving a COD dispute applies a **permanent negative reputation signal** to the buyer's COD trust score. This may reduce their COD tier and lower their maximum exposure limits for all future COD orders. This action cannot be undone via the API. Use with care.

### Happy Path

| Step | Actor/System | Action | Endpoint Method + Path | Auth | Expected Response |
|------|-------------|--------|------------------------|------|-------------------|
| 1 | Support Agent | (Optional) Review dispute detail | `GET /api/support/disputes/:id` | Agent JWT | 200 — dispute detail with evidence and order context |
| 2 | Support Agent | Resolve the COD dispute | `POST /api/support/disputes/:id/resolve` | Agent JWT | 200 `{ data: { disputeId, status: "RESOLVED" } }` |

**Request body for resolution:**
```jsonc
{
  "resolution": "Verified with courier — buyer refused delivery. Dispute ruled against buyer.",
  "notes": "Courier GPS log confirms delivery attempt at correct address."
}
```

### Service Interaction Chain

`GET /api/support/disputes/:id` returns the full dispute record including any evidence the buyer attached and the linked order context. The agent reviews this before resolving.

`POST /api/support/disputes/:id/resolve` records the resolution and emits `COD_DISPUTE_RESOLVED`. user-service consumes this event and calls `UpdateCODReputationUseCase`, which:
1. Decrements the buyer's COD trust score by a configured delta (`signalType: REFUSED_DELIVERY`)
2. Re-evaluates the buyer's COD tier based on the updated score
3. Publishes `cod.trust_signal` for downstream order-service to update exposure limits

### Consequences of COD Dispute Resolution

| Party | Effect |
|-------|--------|
| Buyer | COD trust score decremented — may reduce COD tier |
| Future COD orders | Buyer may be restricted to lower tier (smaller radius, lower exposure limit, fewer concurrent COD orders) |
| Order | Dispute marked `RESOLVED` |

**COD trust tier demotion path:**

`PLATINUM_BUYER → GOLD_BUYER → TRUSTED_BUYER → TRUSTED_BEGINNER → NEW_BUYER`

At `NEW_BUYER` tier: 24 km radius, TZS 30,000 max exposure, 1 concurrent COD order.

Accumulating multiple dispute resolutions will continue demoting the buyer through the tier ladder.

### Unhappy Path Branches

| Trigger | System Response | Error Code | Terminal State |
|---------|----------------|------------|----------------|
| Dispute `:id` not found | 404 data-level (route verified) | — | No state change |
| Dispute is already in terminal state (`RESOLVED`) | 409 conflict | — | No state change |
| Missing required `resolution` field | 422 validation error | `VALIDATION_ERROR` | No state change |
| Caller does not have agent or admin role | 403 forbidden | `PERMISSION_BOUNDARY` | No state change |
