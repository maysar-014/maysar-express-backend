# Admin Guide — Auth Service

> Mirrors: `docs/FLOWS/auth/user-flow/admin-flows.md`
> Verification status: Partially Verified (CSRF gate on 2FA; mandatory 2FA requirement; refresh token body)
> Last updated: September 2026

## Overview

Admin auth flows differ from other roles in two critical ways: **2FA is mandatory** (session not established until verify completes), and **admin cannot self-register** (accounts created by system operators).

---

## Flow 1: Admin Account Creation (Not Self-Service)

Admin accounts cannot be created via `POST /api/auth/register` without a privileged flag. Attempting to register with `role: "admin"` returns **403 Forbidden**.

**UI:** Do not show a self-registration path for admin. Admin account setup is done by a system operator. Direct admin users to their provided credentials.

---

## Flow 2: Login + Mandatory 2FA (Two-Step)

**User Goal:** Establish a full admin session.

> ⚠️ **CRITICAL:** Admin login is a TWO-STEP process. After `POST /api/auth/login` returns tokens, the admin **must immediately call** `POST /api/auth/2fa/verify`. The session is not usable for admin operations until 2FA verification completes.

**UI States:** Credentials screen → 2FA code screen → Admin dashboard

**Step 1 — Submit credentials:**
- `POST /api/auth/login` with `{ email, password }`
- On success: do not redirect to the dashboard yet — show the 2FA verification screen

**Step 2 — Verify 2FA:**
- `POST /api/auth/2fa/verify` with `{ totp: "XXXXXX" }`
- On success: session fully established → redirect to admin dashboard

| Status | Code | User-Facing Message | Action |
|---|---|---|---|
| 401 | INVALID_CREDENTIALS | "Incorrect email or password." | Retry |
| 401 | ACCOUNT_LOCKED | "Too many failed attempts. Please try again in 30 minutes." | Wait |
| 401 | INVALID_TOTP_CODE | "Invalid code. Please check your authenticator app." | Retry 2FA |
| 401 | ACCOUNT_SUSPENDED | "Your account has been suspended. Please contact your system operator." | No |
| 5xx | — | "Something went wrong. Please try again." | Retry |

---

## Flow 3: Token Refresh

> ⚠️ **CRITICAL:** Refresh token must be in the **request body** as `{ "refreshToken": "..." }`. Returns `401 "Refresh token required"` if body is absent.

Same as other roles — see buyer guide for full details.

---

## Flow 4: 2FA Enable / Disable

> ⚠️ **CRITICAL:** `POST /api/auth/2fa/enable` and `POST /api/auth/2fa/disable` require a **CSRF token**. Returns **403 "CSRF token missing"** when absent.

Enable flow: `POST /api/auth/2fa/setup` → user scans QR → `POST /api/auth/2fa/verify` → `POST /api/auth/2fa/enable` (with CSRF)

Disable flow: `POST /api/auth/2fa/disable` (with CSRF). After disabling, the admin must re-enable and re-verify 2FA before they can log in again — 2FA is mandatory for admin.

Provide 10 backup codes from the setup response. Inform the admin to store these securely.

---

## Flow 5: Password Reset

Same as other roles. Initiate: `POST /api/auth/password/reset/initiate`. Confirm: `POST /api/auth/password/reset/confirm`.

---

## Flow 6: Suspend User

**User Goal:** Suspend a user account.

> All admin actions are **audit-logged**. The UI should confirm the action before submitting.

**Action:** `POST /api/auth/admin/users/:id/suspend` (admin JWT)
- Show confirmation dialog: "Are you sure you want to suspend this user? This action is audit-logged."
- Success: 200 → update user status display to "Suspended"

| Status | User-Facing Message |
|---|---|
| 403 | "You do not have permission to perform this action." |
| 404 | "User not found." |
| 422 | "This user is already suspended." |

---

## Flow 7: Unlock User

**User Goal:** Unlock a locked user account.

**Action:** `POST /api/auth/admin/users/:id/unlock` (admin JWT)
- Show confirmation dialog: "Unlock this user account? This action is audit-logged."
- Success: 200 → update user status display to "Active"

| Status | User-Facing Message |
|---|---|
| 403 | "You do not have permission to perform this action." |
| 404 | "User not found." |
