# Admin Flows — Auth Service

> **Verification status:** Partially Verified (CSRF gate on 2FA enable/disable; refresh token body requirement; 2FA mandatory gate)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/auth/AUTH_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/auth/user-flow/admin-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/auth/frontend-guide/admin-guide.md`

## Overview

This document covers auth-service flows for the admin role. Admin flows differ from other roles in two critical ways:

1. **2FA is MANDATORY for admin.** The admin session is not considered established until `POST /api/auth/2fa/verify` completes successfully after login. An admin JWT issued before 2FA verification should not be used to access admin resources until verification is done.
2. **Admin cannot self-register.** Admin accounts are created by a system operator using a privileged flag (`allowPrivilegedRole: true`). The `POST /api/auth/register` endpoint rejects the `admin` role without the privileged flag.

Additional correctness items (shared with all roles):

3. **Token Refresh:** `POST /api/auth/refresh` requires the refresh token in the **request body** (`{ refreshToken: "..." }`). A valid JWT in the Authorization header alone is not sufficient — returns `401 "Refresh token required"` if the body is absent.
4. **2FA Enable/Disable:** `POST /api/auth/2fa/enable` and `POST /api/auth/2fa/disable` require a **CSRF token** in the request. They return `403 "CSRF token missing"` when the CSRF token is absent.
5. **All admin actions are audit-logged** — suspension, unlock, and user management actions generate an immutable audit trail.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Admin Account Creation (Privileged — not self-registration) | Partially Verified | System operator action |
| 2 | Login + Mandatory 2FA | Partially Verified | `POST /api/auth/login` → `POST /api/auth/2fa/verify` |
| 3 | Token Refresh | Partially Verified | `POST /api/auth/refresh` |
| 4 | Logout | Partially Verified | `POST /api/auth/logout` |
| 5 | 2FA Enable | Partially Verified | `POST /api/auth/2fa/enable` |
| 6 | 2FA Verify | Partially Verified | `POST /api/auth/2fa/verify` |
| 7 | 2FA Disable | Partially Verified | `POST /api/auth/2fa/disable` |
| 8 | Password Reset | Partially Verified | `POST /api/auth/password/reset/initiate` |
| 9 | Suspend User | Partially Verified | `POST /api/auth/admin/users/:id/suspend` |
| 10 | Unlock User | Partially Verified | `POST /api/auth/admin/users/:id/unlock` |

---

## Flow 1: Admin Account Creation

### Summary

| Field | Value |
|---|---|
| Actor | System Operator |
| Trigger | Platform requires a new admin account |
| Preconditions | System operator has `allowPrivilegedRole: true` credential or direct database access |
| Terminal states (success) | Admin user created; account ready for first login |
| Terminal states (failure) | 403 if `allowPrivilegedRole` flag absent; 409 if email already exists |
| Verification status | Partially Verified |

> **Admin cannot self-register.** Attempting `POST /api/auth/register` with `role: "admin"` without the `allowPrivilegedRole: true` flag returns **403 Forbidden**. The `SELF_REGISTERABLE_ROLES` set in auth-service explicitly excludes `admin` and `system` roles.

### How Admin Accounts Are Created

Admin accounts are created by a system operator in one of two ways:
1. Direct invocation of `RegisterUserUseCase` with `allowPrivilegedRole: true` from a privileged context (e.g., a migration script or seed operation)
2. Via a platform operator command authenticated with a system-level token

The operator sets the initial credentials. The admin user must set up 2FA on first login before their session is considered active.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| `POST /api/auth/register` with `role: "admin"` without privileged flag | 403 | 403 | `FORBIDDEN` |
| Email already registered | 409 | 409 | `EMAIL_ALREADY_EXISTS` |

---

## Flow 2: Login + Mandatory 2FA

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin enters credentials to start a session |
| Preconditions | Admin account exists and is not `LOCKED` or `SUSPENDED`; 2FA is configured |
| Terminal states (success) | JWT access token + refresh token returned **after** 2FA verify completes; full admin session established |
| Terminal states (failure) | 401 on wrong credentials; account `LOCKED` after 5 failures; 401 if 2FA code invalid |
| Verification status | Partially Verified |

> **2FA is MANDATORY for admin.** After `POST /api/auth/login` returns tokens, the admin must immediately call `POST /api/auth/2fa/verify` with their TOTP code. The session is not considered established for admin-protected resources until 2FA verification completes.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Submits email + password | `POST /api/auth/login` | None | Request accepted |
| 2 | auth-service | Fetches user, checks lockout, verifies password | — | — | Password valid; not locked |
| 3 | auth-service | Calls `user.recordSuccessfulLogin()` | — | — | Login recorded |
| 4 | auth-service | Generates JWT pair (access token: 1 day; refresh token: 7 days) with `roles: ["admin"]` | — | — | Tokens generated |
| 5 | auth-service | Publishes `AuthLoginSuccess` event | Event bus | — | Event published |
| 6 | Admin | **Immediately proceeds to 2FA verify** | `POST /api/auth/2fa/verify` | Bearer JWT | Request accepted |
| 7 | auth-service | Validates TOTP code (speakeasy, window ±1) | — | — | TOTP valid |
| 8 | Admin | Receives 2FA confirmation; session fully established | — | — | 200 — session active |

### Lockout Policy

After 5 consecutive failed login attempts, account is `LOCKED` for 30 minutes. Automatic expiry — no manual unlock required for time-based expiry. Admin accounts can also be manually unlocked via `POST /api/auth/admin/users/:id/unlock` (audit-logged).

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Wrong password (attempts < 5) | 401; `failedLoginAttempts` incremented | 401 | `INVALID_CREDENTIALS` |
| Wrong password (5th attempt) | 401; account `LOCKED` for 30 min | 401 | `ACCOUNT_LOCKED` |
| Account already locked | 401 | 401 | `ACCOUNT_LOCKED` |
| Account `SUSPENDED` | 401 | 401 | `ACCOUNT_SUSPENDED` |
| 2FA code invalid or expired | 401 | 401 | `INVALID_TOTP_CODE` |
| 2FA not yet set up | Admin must complete 2FA setup before login is usable | — | `2FA_REQUIRED` |
| Email not found | 401 (no enumeration) | 401 | `INVALID_CREDENTIALS` |

---

## Flow 3: Token Refresh

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Access token has expired; admin needs a new one |
| Preconditions | Valid refresh token held by client; 2FA was completed in the prior session |
| Terminal states (success) | New access token returned |
| Terminal states (failure) | **401 "Refresh token required"** if body is absent or refresh token field is missing |
| Verification status | Partially Verified |

> ⚠️ **CRITICAL:** The refresh token must be sent in the **request body**, not in the Authorization header. The endpoint returns `401 "Refresh token required"` if the request body is missing or does not contain the `refreshToken` field.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Submits refresh token in request body | `POST /api/auth/refresh` | None (refresh token in body) | Request accepted |
| 2 | auth-service | Validates `refreshToken` from body | — | — | Token valid and not expired |
| 3 | auth-service | Issues new access token | — | — | New access token generated |
| 4 | Admin | Receives new access token | — | — | 200 `{ accessToken, expiresIn }` |

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Request body absent or missing `refreshToken` | 401 `"Refresh token required"` | 401 | `REFRESH_TOKEN_REQUIRED` |
| Refresh token expired (> 7 days) | 401 | 401 | `TOKEN_EXPIRED` |
| Refresh token invalid or tampered | 401 | 401 | `INVALID_TOKEN` |
| Session revoked (user logged out) | 401 | 401 | `SESSION_REVOKED` |

---

## Flow 4: Logout

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin explicitly signs out |
| Preconditions | Authenticated (Bearer JWT) |
| Terminal states (success) | Session revoked in Redis; refresh token invalidated |
| Terminal states (failure) | 401 if JWT missing |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Submits logout request | `POST /api/auth/logout` | Bearer JWT | Request accepted |
| 2 | auth-service | Calls `RevokeSessionUseCase`: deletes session from Redis immediately | — | — | Session deleted |
| 3 | Admin | Receives confirmation | — | — | 200 `{ message: "Logged out" }` |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 5: 2FA Enable

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin sets up two-factor authentication (required before first use) |
| Preconditions | Authenticated (Bearer JWT); CSRF token present in request |
| Terminal states (success) | 2FA enabled; TOTP secret + QR code + 10 backup codes returned |
| Terminal states (failure) | **403 "CSRF token missing"** if CSRF token absent |
| Verification status | Partially Verified (CSRF gate confirmed — 403 on absent CSRF) |

> ⚠️ **CRITICAL:** `POST /api/auth/2fa/enable` requires a CSRF token in the request. The endpoint returns `403 "CSRF token missing"` when the CSRF token is absent. For admin accounts this is a required setup step — ensure the CSRF token is included.

> `POST /api/auth/2fa/disable` has the same CSRF requirement.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Initiates 2FA setup: gets TOTP secret + QR code + 10 backup codes | `POST /api/auth/2fa/setup` | Bearer JWT | 200 `{ secret, qrCodeUrl, backupCodes[] }` |
| 2 | Admin | Scans QR with authenticator app; enters initial TOTP code to verify | `POST /api/auth/2fa/verify` | Bearer JWT | 200 — 2FA verified |
| 3 | Admin | Enables 2FA (with CSRF token) | `POST /api/auth/2fa/enable` | Bearer JWT + CSRF token | 200 — 2FA active |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| CSRF token absent | 403 `"CSRF token missing"` | 403 | `CSRF_TOKEN_MISSING` |
| Invalid TOTP code at verify step | 401 | 401 | `INVALID_TOTP_CODE` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 6: 2FA Verify

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin completes mandatory 2FA step after login, or confirms a 2FA-protected action |
| Preconditions | Authenticated (Bearer JWT); 2FA already configured |
| Terminal states (success) | TOTP code accepted; session established / action proceeds |
| Terminal states (failure) | 401 if TOTP code invalid or expired |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Enters 6-digit TOTP code from authenticator app | `POST /api/auth/2fa/verify` | Bearer JWT | Request accepted |
| 2 | auth-service | Validates TOTP code using speakeasy (`window: 1` for clock skew tolerance) | — | — | Code valid |
| 3 | Admin | Receives verification confirmation; admin session fully established | — | — | 200 — verified |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Invalid TOTP code | 401 | 401 | `INVALID_TOTP_CODE` |
| Code expired (outside ±1 window) | 401 | 401 | `INVALID_TOTP_CODE` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 7: 2FA Disable

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin needs to rotate or remove their 2FA setup (e.g., lost device, credential rotation) |
| Preconditions | Authenticated (Bearer JWT); 2FA currently enabled; CSRF token present |
| Terminal states (success) | 2FA disabled; `twoFactorSecret` cleared |
| Terminal states (failure) | **403 "CSRF token missing"** if CSRF token absent |
| Verification status | Partially Verified (CSRF gate confirmed) |

> ⚠️ **CRITICAL:** `POST /api/auth/2fa/disable` requires a CSRF token in the request. Returns `403 "CSRF token missing"` when absent. After disabling, the admin must immediately re-enable and re-verify 2FA — admin login requires 2FA.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Submits 2FA disable request with CSRF token | `POST /api/auth/2fa/disable` | Bearer JWT + CSRF token | Request accepted |
| 2 | auth-service | Validates CSRF token | — | — | CSRF confirmed |
| 3 | auth-service | Calls `user.disableTwoFactor()`: clears `twoFactorSecret` and `twoFactorEnabled` | — | — | 2FA disabled |
| 4 | Admin | Receives confirmation | — | — | 200 — 2FA disabled |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| CSRF token absent | 403 `"CSRF token missing"` | 403 | `CSRF_TOKEN_MISSING` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 8: Password Reset

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin cannot access their account and needs to reset password |
| Preconditions | Email registered on platform |
| Terminal states (success) | New password set |
| Terminal states (failure) | 400 if token invalid/expired; silent success if email not found (no enumeration) |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Requests password reset link | `POST /api/auth/password/reset/initiate` | None | 200 (silent — no enumeration) |
| 2 | auth-service | Generates 30-min reset token; sends email via notification-service | — | — | Reset email dispatched |
| 3 | Admin | Clicks link from email; submits new password with token | `POST /api/auth/password/reset/confirm` | Reset token (in body) | 200 — password updated |
| 4 | auth-service | Validates token + expiry; hashes new password | — | — | Password updated |

### Request Bodies

Initiate:
```json
{ "email": "admin@example.com" }
```

Confirm:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecureAdmin456!"
}
```

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Email not registered | 200 (silent — no enumeration) | 200 | — |
| Reset token expired (> 30 min) | 400 | 400 | `TOKEN_EXPIRED` |
| Reset token invalid | 400 | 400 | `INVALID_TOKEN` |
| New password same as old password | 422 | 422 | `PASSWORD_SAME_AS_CURRENT` |
| New password too weak | 422 | 422 | `PASSWORD_TOO_WEAK` |

---

## Flow 9: Suspend User

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin suspends a user account due to policy violation or investigation |
| Preconditions | Authenticated (Bearer JWT, admin role); target user exists and is not already `SUSPENDED` |
| Terminal states (success) | Target user account transitioned to `SUSPENDED`; action audit-logged |
| Terminal states (failure) | 403 if non-admin role; 404 if user not found; 422 if user already suspended |
| Verification status | Partially Verified |

> **All admin user management actions are audit-logged.** Every call to `POST /api/auth/admin/users/:id/suspend` creates an immutable audit trail including the admin's `userId`, timestamp, and reason.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Submits suspension request for target user | `POST /api/auth/admin/users/:id/suspend` | Bearer JWT (admin role) | Request accepted |
| 2 | auth-service | Validates admin JWT and role | — | — | Admin role confirmed |
| 3 | auth-service | Fetches target user; validates not already suspended | — | — | Target user eligible for suspension |
| 4 | auth-service | Calls `AdminService.suspendUser()`: transitions target user to `SUSPENDED` | — | — | User status updated |
| 5 | auth-service | Writes audit log entry (adminId, targetUserId, action, timestamp, reason) | — | — | Audit record created |
| 6 | Admin | Receives confirmation | — | — | 200 `{ userId, status: "SUSPENDED" }` |

### Service Interaction Chain

`POST /api/auth/admin/users/:id/suspend` is handled by `AdminService.suspendUser()` within auth-service. The `manageAccountStatus()` method on `AuthenticationEngine` enforces policy gating — admin can suspend any non-admin user. The audit log is written synchronously before the response is returned.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Non-admin role | 403 | 403 | `FORBIDDEN` |
| Target user not found | 404 | 404 | `USER_NOT_FOUND` |
| Target user already `SUSPENDED` | 422 | 422 | `INVALID_STATUS_TRANSITION` |
| Admin attempting to suspend another admin | 403 — policy gate | 403 | `FORBIDDEN` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 10: Unlock User

### Summary

| Field | Value |
|---|---|
| Actor | Admin |
| Trigger | Admin manually unlocks a user account (brute-force lockout or support escalation) |
| Preconditions | Authenticated (Bearer JWT, admin role); target user exists |
| Terminal states (success) | Target user lockout state cleared; `failedLoginAttempts` reset; action audit-logged |
| Terminal states (failure) | 403 if non-admin role; 404 if user not found |
| Verification status | Partially Verified |

> **All admin user management actions are audit-logged.** Every call to `POST /api/auth/admin/users/:id/unlock` creates an immutable audit trail.

> Note: Brute-force lockouts expire automatically after 30 minutes. Manual unlock via this endpoint is an override for situations requiring immediate re-access (e.g., support escalation, admin account recovery).

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Admin | Submits unlock request for target user | `POST /api/auth/admin/users/:id/unlock` | Bearer JWT (admin role) | Request accepted |
| 2 | auth-service | Validates admin JWT and role | — | — | Admin role confirmed |
| 3 | auth-service | Fetches target user | — | — | Target user found |
| 4 | auth-service | Calls `AdminService.unlockUser()`: clears `lockoutUntil`, resets `failedLoginAttempts = 0`, transitions to `ACTIVE` if status was `LOCKED` | — | — | User lockout state cleared |
| 5 | auth-service | Writes audit log entry (adminId, targetUserId, action, timestamp) | — | — | Audit record created |
| 6 | Admin | Receives confirmation | — | — | 200 `{ userId, status: "ACTIVE" }` |

### Service Interaction Chain

`POST /api/auth/admin/users/:id/unlock` is handled by `AdminService.unlockUser()` within auth-service. The `user.unlock()` domain method clears lockout state. Suspended accounts are not automatically re-activated by unlock — suspension and lockout are separate states.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Non-admin role | 403 | 403 | `FORBIDDEN` |
| Target user not found | 404 | 404 | `USER_NOT_FOUND` |
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |
