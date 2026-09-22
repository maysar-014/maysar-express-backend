# Admin Guide — User Service

> Mirrors: `docs/FLOWS/user/user-flow/admin-flows.md`
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

Admin user management UI. Important: user search must go through auth-service, not user-service (user-service lookup endpoints are internal-only).

---

## Flow 1: Search Users

**Action:** `GET /api/auth/admin/users?search=&role=&status=&page=&limit=`

> ⚠️ Use `GET /api/auth/admin/users` — NOT `GET /api/user/lookup` or `GET /api/user/search`. The user-service lookup endpoints return 403 "Internal endpoint" for all external callers including admins.

**UI States:** Loading | Results list | Empty | Error

Show each user: email, role badge, status (ACTIVE/LOCKED/SUSPENDED), created date.

---

## Flow 2: View User Profile

**Action:** `GET /api/user/:userId` with admin JWT

Shows full profile including COD tier and account status history.

---

## Flow 3: Suspend User

**Action:** `POST /api/auth/admin/users/:id/suspend`

Show confirmation dialog: "Suspend this user? This action is audit-logged and can be reversed."

- All admin actions are **audit-logged** — inform the admin before submitting
- Success: update user status display to "Suspended"

---

## Flow 4: Unlock User

**Action:** `POST /api/auth/admin/users/:id/unlock`

Show confirmation dialog: "Unlock this user account? This action is audit-logged."

- Success: update user status display to "Active"

Both suspend and unlock generate immutable audit log entries. The admin should understand their actions are traceable.
