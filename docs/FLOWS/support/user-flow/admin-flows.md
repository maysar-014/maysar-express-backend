# Admin Flows — Support Service

> **Verification status:** Verified (endpoints probed in September 2026 sweep); ⚠️ contains Known Gaps for phantom endpoints referenced elsewhere
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `services/support-service/src/api/routes/*` (route source); `docs/support/SUPPORT_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/support/user-flow/admin-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/support/frontend-guide/admin-guide.md`

## Overview

This document covers support-service flows from the platform admin's perspective: the all-tickets inbox, support agent provisioning, dispute oversight, and COD dispute resolution. It documents only endpoints that **exist in the mounted route surface** (verified against `services/support-service/index.ts` and the September 2026 sweep).

> ⚠️ **Phantom endpoints — do not build UI against these:** three paths appear in legacy docs but exist in **no route file, no API contract, and no sweep result**:
> - `GET /api/support/admin/tickets` — the admin inbox is `GET /api/support/tickets` (the controller skips per-user filtering when the JWT has `admin` or `agent` role).
> - `GET /api/support/admin/kyc/:userId` — no support-service KYC route exists. Look up KYC state via `GET /api/user/:userId` (profile includes `kycLevel`) instead.
> - `POST /api/support/disputes/:id/resolve` — support-service disputes have **no resolve route**. COD dispute resolution lives in order-service: `POST /api/order/orders/disputes/:id/resolve`.
>
> Tracked in `docs/FLOWS/_verification/alignment-backlog.md`.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Admin Ticket Inbox | Verified | `GET /api/support/tickets` |
| 2 | Create / Update Support Agent | Verified (role-gated) | `POST /api/support/agents`, `PUT /api/support/agents/:id` |
| 3 | Review Disputes | Verified | `GET /api/support/disputes` |
| 4 | Escalate Dispute | Verified (role-gated) | `POST /api/support/disputes/:id/escalate` |
| 5 | Resolve COD Dispute (order-service) | Verified | `POST /api/order/orders/disputes/:id/resolve` |
| 6 | Support Outbox Cleanup | Verified (dual-auth) | `POST /api/support/system/maintenance/cleanup/outbox` |

---

## Flow 1: Admin Ticket Inbox

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin opens the support inbox to oversee all tickets |
| Preconditions | Authenticated (Bearer JWT, `admin` or `agent` role) |
| Terminal states (success) | 200 — paginated ticket list **not** filtered by owner |
| Terminal states (failure) | 401 if unauthenticated |
| Verification status | Verified (sweep: `GET /api/support/tickets` → 200) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Fetches ticket inbox with filters | `GET /api/support/tickets?status=&priority=&page=&limit=` | Bearer JWT (admin) | 200 `{ tickets[], pagination }` |

### Service Interaction Chain

`ListTicketsUseCase` receives the caller's roles from the controller: when the JWT contains `admin` or `agent`, the per-user ownership filter is **skipped**, so admins see every ticket — not only tickets they own. This single endpoint is both the buyer view and the admin inbox; there is no separate `/admin/tickets` route.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| No JWT | 401 | 401 | `UNAUTHORIZED` |
| Invalid pagination params | 400 | 400 | validation error |

---

## Flow 2: Create Support Agent

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin provisions a new support agent account |
| Preconditions | Authenticated (Bearer JWT, `admin` role — `authorize(['admin'])`) |
| Terminal states (success) | Agent record created |
| Terminal states (failure) | 403 for non-admin (sweep: buyer probe → 403 confirmed) |
| Verification status | Verified (role gate confirmed) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Creates the agent record | `POST /api/support/agents` | Bearer JWT (admin) | 200/201 — agent created |
| 2 | Admin | Updates the agent later | `PUT /api/support/agents/:id` | Bearer JWT (admin) | 200 — updated |

> **Note:** creating the support-service agent record does **not** by itself grant the `agent` JWT role. Agent accounts authenticate through auth-service; the role claim must be assigned through auth-service role administration. See `docs/FLOWS/auth/user-flow/support-agent-flows.md`.

---

## Flow 3: Review Disputes

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin audits open disputes and attached evidence |
| Preconditions | Authenticated (Bearer JWT) |
| Terminal states (success) | 200 — paginated dispute list or single dispute |
| Terminal states (failure) | 404 data-level if `:id` unknown (sweep: `GET /api/support/disputes/{id}` → 404, route exists) |
| Verification status | Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Lists disputes | `GET /api/support/disputes` | Bearer JWT | 200 — paginated list (sweep: 200) |
| 2 | Admin | Reads one dispute with evidence | `GET /api/support/disputes/:id` | Bearer JWT | 200 — dispute record |
| 3 | Admin | Adds evidence (optional) | `POST /api/support/disputes/:id/evidence` | Bearer JWT | 200 — evidence appended |

---

## Flow 4: Escalate Dispute

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Escalates a dispute to the next tier | `POST /api/support/disputes/:id/escalate` | Bearer JWT (`seller`/`admin`/`agent`) | 200 — escalated (sweep: buyer probe → 403, `authorize(['seller','admin','agent'])` confirmed) |

> **Do not use `POST /api/support/tickets/:id/escalate`** — no such route exists. Ticket escalation is **automatic**: `TicketEscalationMonitor` (saga) escalates tickets whose `slaDeadline` passed, per `services/support-service/src/application/sagas/ticket-escalation.saga.ts`.

---

## Flow 5: Resolve COD Dispute (order-service)

### Summary

| Field | Value |
|---|---|
| Actor | Admin (or support agent acting under admin policy) |
| Trigger | Admin resolves a COD dispute with a final decision |
| Preconditions | Authenticated (Bearer JWT); dispute `:id` exists in order-service |
| Terminal states (success) | 200 — `COD_DISPUTE_RESOLVED` event emitted → user-service applies COD reputation penalty to the buyer |
| Terminal states (failure) | 400 validation (sweep probe); 404 data-level if dispute unknown |
| Verification status | Verified (contract operation present; sweep buyer probe reached validation → 400) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Reviews dispute context | `GET /api/support/disputes/:id` | Bearer JWT | 200 — dispute + evidence |
| 2 | Admin | Resolves the COD dispute | `POST /api/order/orders/disputes/:id/resolve` | Bearer JWT | 200 — resolution recorded |
| 3 | order-service | Publishes `COD_DISPUTE_RESOLVED` | internal event bus | — | Consumed by user-service |
| 4 | user-service | Applies COD reputation penalty to buyer | — | — | Buyer COD tier may downgrade |

> ⚠️ **Consequence warning:** resolution permanently affects the buyer's COD trust tier (exposure limits, geographic radius). Confirm evidence before resolving.

---

## Flow 6: Support Outbox Cleanup

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Platform operator/admin | Runs outbox cleanup | `POST /api/support/system/maintenance/cleanup/outbox` | JWT (`admin`/`system`) **AND** `x-service-key` header | 200 — cleanup result |
| 2 | Platform operator/admin | Reads dry-run report | `POST /api/support/system/maintenance/cleanup/outbox/report` | JWT + `x-service-key` | 200 — report |

Sweep probes without the `x-service-key` returned **401** — both credentials are required simultaneously. Never expose these in a user-facing UI.

---

## Known Gaps

| Gap | Evidence | Fallback |
|---|---|---|
| `GET /api/support/admin/tickets` does not exist | No route in `services/support-service`; absent from contract and sweep | Use `GET /api/support/tickets` with admin JWT (unfiltered) |
| `GET /api/support/admin/kyc/:userId` does not exist | No KYC route anywhere in support-service | Use `GET /api/user/:userId` (includes `kycLevel`) |
| `POST /api/support/disputes/:id/resolve` does not exist | Dispute routes are create/list/get/escalate/evidence only | Use `POST /api/order/orders/disputes/:id/resolve` |
| Manual ticket escalation endpoint does not exist | Only dispute escalate is routed; ticket escalation is saga-driven | Show SLA status read-only; escalation happens automatically |

---

## Cross-References

| Document | Scope |
|---|---|
| `docs/FLOWS/support/frontend-guide/admin-guide.md` | Admin support UI states and error handling |
| `docs/FLOWS/support/user-flow/support-agent-flows.md` | Agent-level ticket workflows |
| `docs/FLOWS/role-overviews/compliance-officer-lifecycle.md` | Compliance persona using these flows |
| `docs/support/SUPPORT_SERVICE_SYSTEM.md` | Authoritative support service reference (⚠️ its `/admin/*` rows are phantom — see Known Gaps) |
| `docs/FLOWS/_verification/analysis-report.md` | September 2026 endpoint sweep — verification evidence |

