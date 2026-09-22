# Maysar Support Service — Implementation Reference (As-Built)

> **Status:** Live and verified — customer support tickets, escalation, resolution, KYC status lookup.
> **Last updated:** September 2026
> **Scope:** `services/support-service`

---

## 1. Guiding Principles

| Principle | Where it lives |
|---|---|
| **Tickets are append-only** | Messages on a ticket are never deleted; audit trail is permanent |
| **Escalation is automatic on SLA breach** | SLA breach triggers automatic escalation to next tier |
| **KYC status is readable by support** | Support agents can look up KYC status without accessing raw documents |
| **Resolution requires explicit close** | Tickets cannot auto-close; an agent must explicitly resolve |

---

## 2. Domain Model

### Ticket Entity

```
TicketStatus: OPEN → IN_PROGRESS → RESOLVED → CLOSED
                                ↑           ↓
                                └─ reopen ──┘ (RESOLVED | CLOSED → IN_PROGRESS)
```

Fields: `ticketId`, `userId`, `category`, `priority` (`LOW | MEDIUM | HIGH | URGENT`), `subject`, `status`, `assignedAgentId`, `createdAt`, `resolvedAt`, `slaDeadline`.

Ticket categories: `ORDER_ISSUE`, `PAYMENT_ISSUE`, `DELIVERY_ISSUE`, `ACCOUNT_ISSUE`, `KYC_ISSUE`, `REFUND_REQUEST`, `GENERAL`.

---

## 3. Application Layer

| Use case | What it does |
|---|---|
| `CreateTicketUseCase` | Creates ticket + sends confirmation notification |
| `AddTicketMessageUseCase` | Appends message to ticket thread |
| `AssignTicketUseCase` | Assigns to support agent |
| `EscalateTicketUseCase` | Escalates to next tier + notifies |
| `ResolveTicketUseCase` | Marks resolved + sends resolution notification |
| `GetKYCStatusUseCase` | Returns KYC status for a user (support-only) |
| `ListTicketsUseCase` | Paginated ticket list with filters |

---

## 4. HTTP Surface

Mounted at `/api/support` (module name `support-service` → strip `-service` → `/api/support`).

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/support/tickets` | JWT | Create ticket |
| GET  | `/api/support/tickets` | JWT | List own tickets |
| GET  | `/api/support/tickets/:ticketId` | JWT | Ticket detail + thread |
| POST | `/api/support/tickets/:ticketId/messages` | JWT | Add message to thread |
| POST | `/api/support/tickets/:ticketId/resolve` | agent JWT | Resolve ticket |
| POST | `/api/support/tickets/:ticketId/escalate` | agent JWT | Escalate |
| POST | `/api/support/tickets/:ticketId/assign` | agent/admin JWT | Assign to agent |
| POST | `/api/support/tickets/:ticketId/close` | JWT | Close ticket |
| GET  | `/api/support/disputes` | JWT | List disputes |
| POST | `/api/support/disputes` | JWT | Create dispute |
| GET  | `/api/support/disputes/:id` | JWT | Dispute detail |
| POST | `/api/support/disputes/:id/escalate` | JWT | Escalate dispute |
| POST | `/api/support/disputes/:id/evidence` | JWT | Add evidence |
| POST | `/api/support/agents` | admin JWT | Create agent |
| PUT  | `/api/support/agents/:id` | admin JWT | Update agent |
| GET  | `/api/support/admin/tickets` | agent JWT | All tickets (admin inbox) |
| GET  | `/api/support/admin/kyc/:userId` | agent JWT | KYC status lookup |
| GET  | `/api/support/health` | none | Health check |

---

## 5. Events

| Event | Emitted by | Payload |
|---|---|---|
| `support.ticket_created` | `CreateTicketUseCase` | `ticketId, userId, category, priority` |
| `support.ticket_resolved` | `ResolveTicketUseCase` | `ticketId, resolvedAt, agentId` |
| `support.ticket_escalated` | `EscalateTicketUseCase` | `ticketId, escalationLevel` |

---

## 6. Frontend Integration Guide

### Create a ticket

`POST /api/support/tickets`

```jsonc
{
  "category": "ORDER_ISSUE",
  "subject": "Order not delivered",
  "description": "My order ORD-01... was marked delivered but I did not receive it.",
  "relatedOrderId": "ORD-01...",
  "priority": "HIGH"
}
```

Response:
```jsonc
{
  "data": {
    "ticketId": "tkt_01...",
    "status": "OPEN",
    "ticketNumber": "SUP-2026-00123",
    "slaDeadline": "2026-09-02T10:00:00Z"
  }
}
```

Show `ticketNumber` to the user as their reference number.

### Ticket thread

`GET /api/support/tickets/:ticketId`

```jsonc
{
  "data": {
    "ticketId": "tkt_01...",
    "status": "IN_PROGRESS",
    "messages": [
      { "sender": "USER", "body": "My order was not delivered.", "createdAt": "..." },
      { "sender": "AGENT", "body": "We are investigating this.", "createdAt": "..." }
    ]
  }
}
```

### Ticket status display

| Status | Display |
|---|---|
| `OPEN` | Submitted — awaiting agent |
| `IN_PROGRESS` | Being handled |
| `ESCALATED` | Escalated to senior support |
| `RESOLVED` | Resolved |
| `CLOSED` | Closed |

### Integration checklist

- [ ] Show ticket number prominently after creation
- [ ] Display SLA deadline with countdown for OPEN/IN_PROGRESS tickets
- [ ] Allow user to add messages to open tickets
- [ ] Show agent name when assigned
- [ ] Send push notification when ticket status changes
- [ ] Link tickets to related orders/payments for context


---

## System Maintenance Routes

Mounted at `/api/support/system/maintenance`. Guards: `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/support/system/maintenance/cleanup/outbox/report` | Dry-run count of deletable support outbox events |
| POST | `/api/support/system/maintenance/cleanup/outbox` | Batched deletion of expired outbox events. Body: `{ "dryRun": true }` to simulate |

**Retention defaults:** sent/processed → 7 days, failed → 30 days. Batch size: 1000. Max runtime: 20 s.
