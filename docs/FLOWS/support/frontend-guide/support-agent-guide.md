# Support Agent Guide — Support Service

> Mirrors: `docs/FLOWS/support/user-flow/support-agent-flows.md`
> Verification status: Verified
> Last updated: September 2026

## Overview

This guide covers the support agent's ticket management UI: inbox triage, assignment, messaging, resolution, escalation, and COD dispute resolution.

---

## Flow 1: View Ticket Inbox

**User Goal:** Triage open tickets.

**UI States:** Loading | Inbox with tickets | Empty ("No open tickets — all caught up!") | Error

**Action:** `GET /api/support/admin/tickets?status=OPEN&page=1&limit=20`

Show each ticket with: priority badge (URGENT/HIGH/MEDIUM/LOW), SLA countdown timer, category label, ticket number. Sort by priority + SLA urgency by default.

---

## Flow 2: Assign Ticket

**User Goal:** Take ownership of or reassign a ticket.

**UI States:** Agent selector dropdown | Loading | Assigned (status → IN_PROGRESS) | Error

**Action:** `PATCH /api/support/tickets/:id/assign` with `{ agentId: "..." }`

After assignment: status updates to `IN_PROGRESS`. Remove ticket from OPEN queue.

---

## Flow 3: Add Message

**Action:** `POST /api/support/tickets/:ticketId/messages` with agent JWT.

Messages sent by agents show `sender: "AGENT"` in the thread. Append-only — cannot be deleted. The full message thread (user + agent messages) is visible to both parties.

---

## Flow 4: Resolve Ticket

**Action:** `POST /api/support/tickets/:id/resolve`

Show: "Ticket resolved. Buyer/seller has been notified." Status → RESOLVED. Buyer receives automatic notification.

---

## Flow 5: Close Ticket

**Action:** `POST /api/support/tickets/:id/close`

Show: "Ticket closed." Status → CLOSED (terminal).

**Ticket state machine — available actions per status:**

| Status | Available Actions |
|---|---|
| OPEN | Assign |
| IN_PROGRESS | Message, Resolve, Escalate |
| ESCALATED | Message, Resolve |
| RESOLVED | Close, Re-open (→ IN_PROGRESS) |
| CLOSED | Re-open (→ IN_PROGRESS) |

---

## Flow 6: Escalate Ticket

**User Goal:** Send a ticket to senior support or flag for SLA breach.

**UI States:** Reason input required | Loading | Escalated | Missing reason (422) | Error

**Action:** `POST /api/support/tickets/:id/escalate` with `{ reason: "..." }`

Require the reason field — do not submit without it (422 if missing).

Show: "Ticket escalated. Senior support has been notified."

SLA breach also triggers automatic escalation — show "Auto-escalated (SLA breach)" badge on tickets where this occurred.

---

## Flow 7: Resolve COD Dispute

**User Goal:** Resolve a buyer's COD dispute.

> ⚠️ **WARNING — Permanent consequence:** Resolving a COD dispute applies a **permanent negative reputation penalty** to the buyer's COD trust score. This **cannot be undone**. The buyer's COD tier may be reduced, lowering their future COD exposure limits.

**Pre-submit confirmation dialog:**
```
⚠️ Resolving this dispute will permanently reduce the buyer's COD trust score.
This action cannot be undone.

Resolution notes: [required text input]

[Cancel]  [Resolve Dispute]
```

**Action:**
1. View: `GET /api/support/disputes/:id` — review evidence, order context, timeline
2. Resolve: `POST /api/support/disputes/:id/resolve` with `{ resolution: "...", notes: "..." }`

- Require resolution text before enabling the submit button
- Success: "Dispute resolved. COD reputation penalty applied to buyer." Status → RESOLVED.

**Error codes:**

| Status | Message |
|---|---|
| 422 VALIDATION_ERROR | "Please enter a resolution before submitting." |
| 409 | "This dispute has already been resolved." |
| 404 | "Dispute not found." |
| 403 | "You do not have permission to resolve this dispute." |
