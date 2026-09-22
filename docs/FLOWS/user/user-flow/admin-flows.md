# Admin Flows — User Service

> **Verification status:** Partially Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/user/USER_SERVICE_SYSTEM.md`
> **Last updated:** September 2026

## Overview

This document covers user-service and auth-service flows from the admin's perspective: searching users, viewing profiles, and managing account states. Note that user lookup/search endpoints in user-service are restricted to internal service calls — admin user search is done via auth-service.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Search Users | Partially Verified | `GET /api/auth/admin/users` (auth-service) |
| 2 | View User Profile | Partially Verified | `GET /api/user/:userId` |
| 3 | Suspend User | Partially Verified | `POST /api/auth/admin/users/:id/suspend` (auth-service) |
| 4 | Unlock User | Partially Verified | `POST /api/auth/admin/users/:id/unlock` (auth-service) |

---

## Flow 1: Search Users

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin searches for a specific user to review or manage |
| Preconditions | Authenticated (Bearer JWT, admin role) |
| Terminal states | 200 — paginated user list |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Search users | `GET /api/auth/admin/users?search=&role=&status=&page=&limit=` | Bearer JWT (admin) | 200 `{ users[], pagination }` |

### Note on Internal Endpoints

`GET /api/user/lookup` and `GET /api/user/search` return **403 "Internal endpoint"** for external callers including admin UI. Admin user search must use `GET /api/auth/admin/users` via auth-service instead.

---

## Flow 2: View User Profile

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Fetch user profile | `GET /api/user/:userId` | Bearer JWT (admin) | 200 — full profile including COD tier, account status |

---

## Flow 3: Suspend User

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Suspend user account | `POST /api/auth/admin/users/:id/suspend` | Bearer JWT (admin) | 200 `{ userId, status: "SUSPENDED" }` |

All suspension actions are **audit-logged**. See `docs/FLOWS/auth/user-flow/admin-flows.md` — Flow 9 for full details.

---

## Flow 4: Unlock User

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Unlock locked account | `POST /api/auth/admin/users/:id/unlock` | Bearer JWT (admin) | 200 `{ userId, status: "ACTIVE" }` |

All unlock actions are **audit-logged**. See `docs/FLOWS/auth/user-flow/admin-flows.md` — Flow 10 for full details.
