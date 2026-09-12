# Support Service — Frontend Integration Guide

> Audience: Client app engineers (buyer app, seller portal, admin/agent dashboard)
> Mount path: `/api/support` → tickets at `/tickets`, disputes at `/disputes`, agents at `/agents`

---

## 1. What the Support Service Does

Manages customer support tickets and order disputes. Buyers and sellers create tickets; support agents are assigned and resolve them. Disputes are a specialized ticket type for order-related conflicts with an escalation path.

```
Buyer creates ticket → auto-assign to agent → agent resolves → ticket closed
Buyer creates dispute → seller responds → escalate if needed → admin resolves
```

---

## 2. Service at a Glance

| Aspect | Detail |
|--------|--------|
| Mount path | `/api/support` |
| Tickets | `/api/support/tickets` |
| Disputes | `/api/support/disputes` |
| Agents | `/api/support/agents` |
| Auth | `requireAuth` on all routes |
| Error envelope | `{ success: false, error: { code, message }, timestamp }` |

---

## 3. Authentication & Roles

| Surface | Auth | Roles |
|---------|------|-------|
| `POST /tickets` | JWT | Any authenticated user |
| `GET /tickets` | JWT | Own tickets (agent/admin sees all) |
| `GET /tickets/:id` | JWT | Own ticket |
| `POST /tickets/:id/assign` | JWT | `agent`, `admin` |
| `POST /tickets/:id/resolve` | JWT | `agent`, `admin` |
| `POST /tickets/:id/close` | JWT | Ticket owner, `agent`, `admin` |
| `POST /tickets/:id/messages` | JWT | Ticket participants |
| `POST /disputes` | JWT | Any authenticated user |
| `GET /disputes` | JWT | Own disputes (agent/admin sees all) |
| `GET /disputes/:id` | JWT | Own dispute |
| `POST /disputes/:id/escalate` | JWT | `seller`, `admin`, `agent` |
| `POST /disputes/:id/evidence` | JWT | Dispute participants |
| `POST /agents` | JWT | `admin` only |
| `PUT /agents/:id` | JWT | `admin` only |

---

## 4. Core Domain Objects

```
Ticket
  ├── id
  ├── subject (min 5 chars) + description (min 10 chars)
  ├── category: string (e.g. ORDER, PAYMENT, DELIVERY, PRODUCT, ACCOUNT, OTHER)
  ├── priority: LOW | MEDIUM | HIGH | URGENT
  ├── status: OPEN → IN_PROGRESS → RESOLVED → CLOSED
  ├── userId (creator)
  ├── assignedAgentId (optional)
  ├── resolution (set on RESOLVED)
  ├── resolvedAt, closedAt
  └── TicketMessage[] (conversation thread)

SupportAgent
  ├── id, userId
  ├── specializations: category[]
  ├── maxConcurrentTickets
  └── status: ACTIVE | INACTIVE | ON_LEAVE

Dispute
  ├── id
  ├── orderId (linked order)
  ├── type: REFUND | DELIVERY | QUALITY | FRAUD | OTHER
  ├── status: OPEN → UNDER_REVIEW → ESCALATED → RESOLVED | CLOSED
  └── evidence[]
```

### Ticket status machine (from ticket.entity.ts)

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
     ↑                        ↓
     └──────── reopen ─────────┘  (RESOLVED or CLOSED → IN_PROGRESS)
```

**Valid transitions (server-enforced):**

| From | Can transition to |
|------|-------------------|
| `OPEN` | `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `IN_PROGRESS` | `RESOLVED`, `CLOSED` |
| `RESOLVED` | `CLOSED`, `IN_PROGRESS` (reopen) |
| `CLOSED` | `IN_PROGRESS` (reopen only) |

`CLOSED` is not truly terminal — tickets can be reopened. But the `close()` method is the normal end state.

---

## 5. Auto-Escalation Rules (from TicketEscalationPolicy)

The system automatically escalates tickets based on inactivity. Frontend should show countdown timers:

| Condition | Escalation trigger |
|-----------|-------------------|
| `HIGH` priority, no update for **4 hours** | Auto-escalated |
| `MEDIUM` priority, no update for **24 hours** | Auto-escalated |
| Any ticket **unassigned for 1 hour** | Auto-escalated |

When escalated, priority is bumped up one level (LOW→MEDIUM, MEDIUM→HIGH, HIGH→URGENT, URGENT stays URGENT).

**UI implication:** Show a countdown timer on `HIGH` priority tickets ("Escalates in X hours if no update"). Show an "Unassigned" warning badge after 30 minutes.

---

## 6. Ticket API

### 6.1 Create a ticket
`POST /api/support/tickets` → **201**

```jsonc
{
  "subject": "Order not delivered after 5 days",
  "description": "I placed order ORD-123 on Sept 1st and it has not arrived. Tracking shows it was last scanned in Dodoma.",
  "category": "DELIVERY",
  "priority": "HIGH",
  "orderId": "ord_01J..."
}
```

**Validation rules (server-enforced):**
- `subject` minimum 5 characters
- `description` minimum 10 characters

Response:
```jsonc
{
  "success": true,
  "data": {
    "id": "tkt_01J...",
    "subject": "Order not delivered after 5 days",
    "category": "DELIVERY",
    "priority": "HIGH",
    "status": "OPEN",
    "userId": "usr_01J...",
    "assignedAgentId": null,
    "createdAt": "2026-09-06T10:00:00Z"
  }
}
```

### 6.2 List tickets
`GET /api/support/tickets?status=OPEN&category=DELIVERY&priority=HIGH&limit=20&cursor=...` → **200**

### 6.3 Get a ticket
`GET /api/support/tickets/:id` → **200**

Returns full ticket with messages, assignment history, and `resolution` if resolved.

### 6.4 Assign a ticket (agent/admin)
`POST /api/support/tickets/:id/assign` → **200**

```jsonc
{ "agentId": "agt_01J..." }
```

Assigning moves status from `OPEN` to `IN_PROGRESS` automatically.

### 6.5 Resolve a ticket (agent/admin)
`POST /api/support/tickets/:id/resolve` → **200**

```jsonc
{
  "resolution": "Confirmed delivery with courier. Package delivered on Sept 6th at 14:30.",
  "resolutionCode": "DELIVERY_CONFIRMED"
}
```

### 6.6 Close a ticket
`POST /api/support/tickets/:id/close` → **200**

```jsonc
{ "reason": "Issue resolved, customer confirmed satisfaction" }
```

### 6.7 Add a message
`POST /api/support/tickets/:id/messages` → **201**

```jsonc
{
  "body": "I checked with the courier and the package was delivered to the wrong address.",
  "attachments": [{ "url": "https://storage.maysar.com/...", "type": "image/jpeg" }]
}
```

Message `senderType` is set automatically: `USER` for customers, `AGENT` for agents, `SYSTEM` for automated messages.

---

## 7. Dispute API

### 7.1 Create a dispute
`POST /api/support/disputes` → **201**

```jsonc
{
  "orderId": "ord_01J...",
  "type": "REFUND",
  "description": "Product received was damaged. Requesting full refund.",
  "requestedAmount": 75000
}
```

### 7.2 List disputes
`GET /api/support/disputes?status=OPEN&limit=20&cursor=...` → **200**

### 7.3 Get a dispute
`GET /api/support/disputes/:id` → **200**

### 7.4 Escalate a dispute
`POST /api/support/disputes/:id/escalate` → **200**

```jsonc
{
  "reason": "Seller has not responded in 48 hours",
  "escalateTo": "admin"
}
```

Only `seller`, `admin`, or `agent` can escalate. Buyers cannot escalate directly — they must contact support.

### 7.5 Add evidence
`POST /api/support/disputes/:id/evidence` → **201**

```jsonc
{
  "type": "PHOTO",
  "description": "Photo of damaged product packaging",
  "url": "https://storage.maysar.com/evidence/..."
}
```

---

## 8. Agent API (admin only)

### 8.1 Create an agent
`POST /api/support/agents` → **201**

```jsonc
{
  "userId": "usr_01J...",
  "specializations": ["DELIVERY", "PAYMENT"],
  "maxConcurrentTickets": 10
}
```

### 8.2 Update an agent
`PUT /api/support/agents/:id` → **200**

```jsonc
{ "status": "ON_LEAVE", "maxConcurrentTickets": 0 }
```

---

## 9. Error Codes

| Code | HTTP | Meaning | UI action |
|------|------|---------|-----------|
| `UNAUTHORIZED` | 401 | No/expired JWT | Re-login |
| `FORBIDDEN` | 403 | Not ticket owner or agent | Hide action |
| `TICKET_NOT_FOUND` | 404 | Invalid ticket ID | Show "not found" |
| `DISPUTE_NOT_FOUND` | 404 | Invalid dispute ID | Show "not found" |
| `INVALID_STATUS_TRANSITION` | 422 | Invalid status change (e.g. closing a CLOSED ticket) | Refresh, disable button |
| `CANNOT_ASSIGN_CLOSED` | 422 | Assigning agent to closed ticket | Reopen first |
| `AGENT_NOT_FOUND` | 404 | Invalid agent ID | Show "not found" |
| `VALIDATION_ERROR` | 400 | Subject < 5 chars or description < 10 chars | Highlight fields |
| `INTERNAL_SERVER_ERROR` | 500 | Server failure | Retry with backoff |

---

## 10. UX Patterns

**Buyer support flow:**
1. "Contact Support" button → `POST /tickets` with pre-filled `orderId` and `category: "DELIVERY"` if from order detail.
2. Show ticket status with color: `OPEN` = blue, `IN_PROGRESS` = yellow, `RESOLVED` = green, `CLOSED` = grey.
3. Ticket detail page → show message thread with sender type badges (USER/AGENT/SYSTEM).
4. On `RESOLVED` → show "Close Ticket" button → `POST /tickets/:id/close`.
5. On `CLOSED` → show "Reopen" button (sends `POST /tickets/:id/assign` with agent ID, or admin can reopen).

**Agent dashboard:**
1. `GET /tickets?status=OPEN` → queue of unassigned tickets.
2. Show escalation countdown: HIGH priority tickets show "Escalates in X hours" based on `updatedAt`.
3. Show "Unassigned" warning badge on tickets older than 30 minutes with no `assignedAgentId`.
4. `POST /tickets/:id/assign` with own agent ID to claim → status moves to `IN_PROGRESS`.
5. `POST /tickets/:id/messages` to communicate with customer.
6. `POST /tickets/:id/resolve` with resolution text when done.

**Dispute flow:**
1. "Raise Dispute" button on order detail — only show for orders in DELIVERED/COMPLETED status.
2. `POST /disputes` → show dispute ID and status.
3. Allow adding evidence photos via `POST /disputes/:id/evidence`.
4. Show escalation option after 48h with no seller response — `POST /disputes/:id/escalate`.

**Priority display:**

| Priority | Color | SLA |
|----------|-------|-----|
| `LOW` | Grey | 24h response |
| `MEDIUM` | Blue | 24h escalation |
| `HIGH` | Orange | 4h escalation |
| `URGENT` | Red | Immediate |

**Integration checklist:**
- [ ] Pre-fill `orderId` and `category` when creating ticket from order detail page
- [ ] Show "Raise Dispute" only for orders in DELIVERED/COMPLETED status
- [ ] Show escalation countdown on HIGH priority tickets (4h from `updatedAt`)
- [ ] Show "Unassigned" warning after 30 minutes with no agent
- [ ] Disable resolve/close buttons based on valid transitions table in section 4
- [ ] Show sender type badge (USER/AGENT/SYSTEM) on each message
- [ ] Poll ticket status every 30s while `IN_PROGRESS`

---

## 11. Route Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/support/tickets` | JWT | Create ticket |
| GET | `/api/support/tickets` | JWT | List tickets |
| GET | `/api/support/tickets/:id` | JWT | Get ticket |
| POST | `/api/support/tickets/:id/assign` | JWT (agent/admin) | Assign ticket |
| POST | `/api/support/tickets/:id/resolve` | JWT (agent/admin) | Resolve ticket |
| POST | `/api/support/tickets/:id/close` | JWT | Close ticket |
| POST | `/api/support/tickets/:id/messages` | JWT | Add message |
| POST | `/api/support/disputes` | JWT | Create dispute |
| GET | `/api/support/disputes` | JWT | List disputes |
| GET | `/api/support/disputes/:id` | JWT | Get dispute |
| POST | `/api/support/disputes/:id/escalate` | JWT (seller/admin/agent) | Escalate dispute |
| POST | `/api/support/disputes/:id/evidence` | JWT | Add evidence |
| POST | `/api/support/agents` | JWT (admin) | Create agent |
| PUT | `/api/support/agents/:id` | JWT (admin) | Update agent |
