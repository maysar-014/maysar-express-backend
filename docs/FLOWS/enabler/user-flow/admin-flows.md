# Admin Flows — Enabler Service

> **Verification status:** Verified (admin approval gate live; `GET /api/enabler/enablers/{id}` → accurate 404, DEF-002 resolved)

> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); enabler-service route source (`services/enabler-service/src/api/routes/*`)
> **Canonical source:** `docs/FLOWS/enabler/user-flow/admin-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/enabler/frontend-guide/admin-guide.md`

---

> ⚠️ **Denylist — do not surface in UI**
>
> - `POST /api/enabler/enablers/{id}/approve` is an **admin** action restricted to `admin` or `system` role JWTs. Self-service "I am an enabler" registration must stop at `PENDING`; the approval step is performed by platform admins (see `docs/FLOWS/role-overviews/admin-lifecycle.md` for the approval workflow).
> - `POST /api/enabler/enablers/{id}/terms` and `POST /api/enabler/enablers/{id}/activation` are **enabler-only** after `APPROVED`.
> - `GET /api/enabler/enablers/{id}` returns `404` when no profile row exists (`DEF-002` resolved); do not show a fake profile.
> - `GET /api/enabler/enablers/{id}/capabilities` is the safe lighter-weight surface for status gating (always available, even for restricted/enabled accounts).

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Approve Enabler Application | Verified | `POST /api/enabler/enablers/:id/approve` |
| 2 | Enabler Status Overview (read-only) | Verified | `GET /api/enabler/enablers/{id}`, `/capabilities` |
| 3 | Suspend / Reactivate | Verified | `POST /api/enabler/enablers/{id}/suspend`, `/reactivate` |
| 4 | Deactivate | Verified | `POST /api/enabler/enablers/{id}/deactivate` |

---

## Flow 1: Approve Enabler Application

| Field | Value |
|---|---|
| **Actor** | Platform admin |
| **Trigger** | Admin reviews an enabler account in `PENDING` status |
| **Preconditions** | Authenticated (Bearer JWT, `admin` or `system` role) |
| **Terminal states** | `APPROVED`; `enablerCode` (`ENB-XXXXXX`) and `enablerCodeShort` (`EXXXXXX`) assigned |
| **Verification status** | Verified — `POST /api/enabler/enablers/:id/approve` (200; 404 when no profile row) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Approves the application | `POST /api/enabler/enablers/:id/approve` | Bearer JWT (admin) | 200 `{ success: true, data: { enablerId, status: "APPROVED", enablerCode, enablerCodeShort } }` |
| 2 | Enabler | (later) accepts terms + training | `POST /enablers/:id/terms`, `POST /enablers/:id/activation` | Enabler JWT | 200 — status `ACTIVE` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| No profile row for this enabler | 404 | `NOT_FOUND` |
| Non-admin attempting approval | 403 | `FORBIDDEN` |
| Already `APPROVED` | 409 | `INVALID_STATE_TRANSITION` |

---

## Flow 2: Enabler Status Overview (read-only)

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Enabler | Fetches own profile | `GET /api/enabler/enablers/{id}` | Enabler JWT (own userId) | 200 `EnablerEntity`, or 404 (no profile row — `DEF-002`) |
| 2 | Enabler | Fetches capability snapshot | `GET /api/enabler/enablers/{id}/capabilities` | Enabler JWT | 200 — capability map, activation, lifecycle |

**UI rule:** never rely on a single status field. Use the server-computed `capabilities` map; it is authoritative over any client-side interpretation of role claims.

---

## Flow 3: Suspend / Reactivate

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Suspends the enabler | `POST /api/enabler/enablers/:id/suspend` | Bearer JWT (admin) | 200 `{ ...enabler, status: "SUSPENDED", suspendedReason }` |
| 2 | Admin | Reactivates | `POST /api/enabler/enablers/:id/reactivate` | Bearer JWT (admin) | 200 `{ ...enabler, status: "APPROVED" }` |

**Effects:** suspended enablers lose all commercial capabilities except `VIEW_ELIGIBLE_PRODUCTS`; reactivation restores them to `APPROVED` (terms/training gates re-evaluated on activation).

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Invalid state transition | 409 | `INVALID_STATE_TRANSITION` |
| Non-admin | 403 | `FORBIDDEN` |

---

## Flow 4: Deactivate

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Deactivates the enabler | `POST /api/enabler/enablers/:id/deactivate` | Bearer JWT (admin) | 200 `{ ...enabler, status: "DEACTIVATED" }` |

**Scope of deactivation:** all three gates are disabled at once; this is the nuclear option (used for policy/legal hold), not a status flag.

---

## Cross-References

| Document | Scope |
|---|---|
| `docs/FLOWS/enabler/frontend-guide/admin-guide.md` | Admin UI states |
| `docs/FLOWS/enabler/user-flow/enabler-flows.md` | Enabler lifecycle (registration → activation) |
| `docs/FLOWS/role-overviews/enabler-lifecycle.md` | Role lifecycle (contains admin approval phase) |
| `docs/FLOWS/role-overviews/admin-lifecycle.md` | Admin status workflow (approval, suspend, deactivate) |
| `docs/FLOWS/kyc/user-flow/enabler-flows.md` | KYC gates |
| `docs/FLOWS/_verification/analysis-report.md` | Verification evidence |
