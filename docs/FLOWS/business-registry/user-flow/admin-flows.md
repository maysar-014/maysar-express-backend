# Admin Flows — Business Registry Service

> **Verification status:** Verified (admin surface live; some sub-routes 404)
> **Verification basis:** `docs/business-registry/BUSINESS_REGISTRY_SERVICE_SYSTEM.md` (admin section); `docs/FLOWS/_verification/analysis-report.md`; `api-contract.yaml`
> **Canonical source:** `docs/FLOWS/business-registry/user-flow/admin-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/business-registry/frontend-guide/admin-guide.md`

---

> ⚠️ **Admin Scope Note — which endpoints are for admins?**
>
> Admin routes sit under the same mount as seller routes (`/api/business-registry/businesses`, `/businesses/:id`, `/businesses/:id/*` actions). The **seller/public** surface is read-only for the platform; the admin actions below (verify, suspend, reactivate, compliance records, delete) are only reachable by `admin`-role JWTs. The old `x-user-id` header trick on `PUT /businesses/:id` is deprecated — use a JWT role claim.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Approve / Reject Verification | Verified | `POST /api/business-registry/businesses/:id/verify` |
| 2 | Suspend / Reactivate | Verified | `POST /api/business-registry/businesses/:id/suspend`, `POST /.../reactivate` |
| 3 | Manage Compliance Records | Verified | `GET /api/business-registry/businesses/:id/compliance-records`, `POST /.../compliance-records` |
| 4 | Manage Documents | Verified | `GET /api/business-registry/businesses/:id/documents`, `POST /.../documents` |
| 5 | Search Businesses | Verified | `GET /api/business-registry/businesses/search` |
| 6 | Register Business (internal) | Verified | `POST /api/business-registry/businesses` |
| 7 | Update / Delete Business | Verified | `PUT /api/business-registry/businesses/:id`, `DELETE /...` |

---

## Flow 1: Approve / Reject Verification

| Field | Value |
|---|---|
| **Actor** | Business registry admin |
| **Trigger** | Admin acts on a business whose `status == PENDING_VERIFICATION` |
| **Preconditions** | Authenticated (Bearer JWT, `admin` role) |
| **Terminal states** | 200 — verified/rejected; on rejection: 200 with `reason` required |
| **Verification status** | Verified — `POST /api/business-registry/businesses/{id}/verify` (body `{ approved: boolean, reason?: string }`) |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Approves business | `POST /api/business-registry/businesses/:id/verify` | Bearer JWT (admin) | 200 `{ ...business, status: "VERIFIED" }` |
| 2 | Admin | Rejects business | `POST /api/business-registry/businesses/:id/verify` | Bearer JWT (admin) | 200 `{ ...business, status: "REJECTED", reason: "..." }` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Business not in PENDING_VERIFICATION | 409 | `INVALID_STATE_TRANSITION` |
| Missing JWT | 401 | `UNAUTHORIZED` |
| Non-admin (e.g. seller) | 403 | `FORBIDDEN` |

---

## Flow 2: Suspend / Reactivate

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Suspends a business | `POST /api/business-registry/businesses/:id/suspend` | Bearer JWT (admin) | 200 `{ ...business, status: "SUSPENDED" }` |
| 2 | Admin | Reactivates | `POST /api/business-registry/businesses/:id/reactivate` | Bearer JWT (admin) | 200 `{ ...business, status: "PENDING_VERIFICATION" }` |

**State semantics:** suspension is administrative self-serve review; reactivation requires re-verification (back to `PENDING_VERIFICATION`), because the registry is a compliance gate, not a soft delete.

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Invalid state transition (e.g. suspend VERIFIED) | 409 | `INVALID_STATE_TRANSITION` |
| Missing JWT | 401 | `UNAUTHORIZED` |

---

## Flow 3: Manage Compliance Records

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Lists compliance records for a business | `GET /api/business-registry/businesses/:id/compliance-records` | Bearer JWT (admin) | 200 — paginated records |
| 2 | Admin | Attaches a compliance record | `POST /api/business-registry/businesses/:id/compliance-records` | Bearer JWT (admin) | 201 — record attached |
| 3 | Admin | Updates a record | `PUT /api/business-registry/businesses/:id/compliance-records/:recordId` | Bearer JWT (admin) | 200 — updated |

**Loop closure:** a compliance record is created when a document is submitted without an embedded review outcome, or when a reviewer adds a finding. `POST /.../documents` (admin) creates a record where the review outcome is bundled into the same submission.
---

## Flow 4: Manage Documents

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Lists documents | `GET /api/business-registry/businesses/:id/documents` | Bearer JWT (admin) | 200 — document list |
| 2 | Admin | Uploads a document | `POST /api/business-registry/businesses/:id/documents` | Bearer JWT (admin) | 201 — document stored |
| 3 | Admin | Deletes a document | `DELETE /api/business-registry/businesses/:id/documents/:docId` | Bearer JWT (admin) | 200 — deletion confirmed |

**Forbidden:** `DELETE` on the business root `/api/business-registry/businesses/{id}` exists (route returns 200 per contract) but is **admin-gated in code**; UI should only surface it behind an explicit admin action, never at the top level of a public dashboard.

---

## Flow 5: Search Businesses

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Searches businesses | `GET /api/business-registry/businesses/search?q=&industry=&status=&page=&limit=` | Bearer JWT (admin) | 200 — paginated list |

**Status filter:** `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`, `SUSPENDED`. This is the admin's primary discovery tool; `GET /api/business-registry/public/*` is a public read-only (unauthenticated, non-admin) surface — see the seller guide.

---

## Flow 6: Register Business (Internal)

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Registers a business on behalf of a prospective seller | `POST /api/business-registry/businesses` | Bearer JWT (admin) | 201 `{ businessId, status: "PENDING_VERIFICATION" }` |

---

## Flow 7: Update / Delete Business

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Updates business details | `PUT /api/business-registry/businesses/:id` | Bearer JWT (admin) | 200 — updated |
| 2 | Admin | Deletes business | `DELETE /api/business-registry/businesses/:id` | Bearer JWT (admin) | 200 — deletion confirmed |

---

## Known Gaps

| Gap | Evidence | Fallback |
|---|---|---|
| `GET /api/business-registry/public/sellers` route exists but no seller listing | Various 404 probes | Only profile endpoint works; discovery UI partial |
| `POST /api/business-registry/public` → 405 | Contract logs | Do not use |
| Document/deletion rights not fully enumerated | Contract only | Treat as admin-only; verify before batching |

---

## Cross-References

| Document | Scope |
|---|---|
| `docs/FLOWS/business-registry/frontend-guide/admin-guide.md` | Admin UI states |
| `docs/FLOWS/business-registry/user-flow/seller-flows.md` | Seller registration surface |
| `docs/business-registry/BUSINESS_REGISTRY_SERVICE_SYSTEM.md` | Authoritative reference |
| `docs/FLOWS/_verification/analysis-report.md` | Verification evidence |

