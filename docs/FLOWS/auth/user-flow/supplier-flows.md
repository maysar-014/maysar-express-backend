# Supplier Flows — Auth Service

> **Verification status:** Partially Verified (CSRF gate on 2FA enable/disable; refresh token body requirement)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/auth/AUTH_SERVICE_SYSTEM.md`
> **Canonical source:** `docs/FLOWS/auth/user-flow/supplier-flows.md`
> **Corresponding frontend guide:** `docs/FLOWS/auth/frontend-guide/supplier-guide.md`

## Overview

This document covers auth-service flows for the supplier role: registration, login, token refresh, logout, 2FA management, and password reset. The two most critical correctness items are:

1. **Token Refresh:** `POST /api/auth/refresh` requires the refresh token in the **request body** (`{ refreshToken: "..." }`). A valid JWT in the Authorization header alone is not sufficient — the endpoint returns `401 "Refresh token required"` if the body is absent.
2. **2FA Enable/Disable:** `POST /api/auth/2fa/enable` and `POST /api/auth/2fa/disable` require a **CSRF token** in the request. They return `403 "CSRF token missing"` when the CSRF token is absent.

Suppliers self-register. After registration, downstream services are initialised via the `UserRegistered.v1` event: user-service creates the supplier profile record and wallet-service initialises the supplier's wallet. Note that `production-service` has no documented inter-service event subscriptions in the verified dependency map — supplier production planning flows are Partially Verified only. See `docs/FLOWS/role-overviews/supplier-lifecycle.md`.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | Registration | Partially Verified | `POST /api/auth/register` |
| 2 | Login | Partially Verified | `POST /api/auth/login` |
| 3 | Token Refresh | Partially Verified | `POST /api/auth/refresh` |
| 4 | Logout | Partially Verified | `POST /api/auth/logout` |
| 5 | 2FA Enable | Partially Verified | `POST /api/auth/2fa/enable` |
| 6 | 2FA Verify | Partially Verified | `POST /api/auth/2fa/verify` |
| 7 | 2FA Disable | Partially Verified | `POST /api/auth/2fa/disable` |
| 8 | Password Reset | Partially Verified | `POST /api/auth/password/reset/initiate` |

---

## Flow 1: Registration

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | New user creates an account with `supplier` role |
| Preconditions | Email not already registered |
| Terminal states (success) | User created in `PENDING_VERIFICATION` status; `UserRegistered.v1` event published → user-service (profile) + wallet-service (wallet init) |
| Terminal states (failure) | 409 if email already exists; 400 if validation fails; 422 if password too weak |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Submits registration form | `POST /api/auth/register` | None | Request accepted |
| 2 | auth-service | Validates email format (RFC), normalizes to lowercase | — | — | Email normalized |
| 3 | auth-service | Validates password strength (min 8 chars, mixed case, digit) | — | — | Password strength confirmed |
| 4 | auth-service | Checks email uniqueness | — | — | Email not already registered |
| 5 | auth-service | Hashes password (bcrypt), creates user in `PENDING_VERIFICATION` with `role: "supplier"` | — | — | User record created |
| 6 | auth-service | Generates phone OTP (6-digit, 10-min TTL) | — | — | OTP generated |
| 7 | auth-service | Publishes `UserRegistered.v1` event | Event bus | — | user-service creates supplier profile; wallet-service initializes supplier wallet |
| 8 | Supplier | Receives registration confirmation | — | — | 201 `{ userId, email, status: "PENDING_VERIFICATION" }` |

### Request Body

```json
{
  "email": "supplier@example.com",
  "password": "SecurePass123",
  "role": "supplier",
  "phoneNumber": "+255712345678"
}
```

### Service Interaction Chain

`POST /api/auth/register` is handled by `RegisterUserUseCase`. The `UserRegistered.v1` event is published via outbox. user-service consumes this to create the supplier profile record. wallet-service consumes it to initialize the supplier's wallet. No synchronous cross-service HTTP calls occur.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Email already registered | 409 | 409 | `EMAIL_ALREADY_EXISTS` |
| Invalid email format | 400 | 400 | `VALIDATION_ERROR` |
| Password too weak (< 8 chars, no mixed case, no digit) | 422 | 422 | `PASSWORD_TOO_WEAK` |
| Invalid phone number format | 400 | 400 | `VALIDATION_ERROR` |

---

## Flow 2: Login

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier enters credentials to authenticate |
| Preconditions | Account exists and is not `LOCKED` or `SUSPENDED` |
| Terminal states (success) | JWT access token + refresh token returned; `AuthLoginSuccess` event published → user-service updates `lastLoginAt` |
| Terminal states (failure) | 401 on wrong credentials; after 5 failures, account `LOCKED` for 30 minutes |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Submits email + password | `POST /api/auth/login` | None | Request accepted |
| 2 | auth-service | Fetches user from user-service via `UserServiceRepository` | — | — | User record retrieved |
| 3 | auth-service | Checks lockout: `user.isLocked()` (status === LOCKED OR lockoutUntil > now) | — | — | Not locked |
| 4 | auth-service | Verifies password with bcrypt | — | — | Password matches |
| 5 | auth-service | Calls `user.recordSuccessfulLogin()`: resets `failedLoginAttempts = 0`, clears `lockoutUntil` | — | — | Login recorded |
| 6 | auth-service | Generates JWT pair (access token: 1 day; refresh token: 7 days) with `role: "supplier"` in payload | — | — | Tokens generated |
| 7 | auth-service | Publishes `AuthLoginSuccess` event → user-service updates `lastLoginAt` | Event bus | — | Event published |
| 8 | Supplier | Receives token pair | — | — | 200 `{ accessToken, refreshToken, expiresIn }` |

### Lockout Policy

After 5 consecutive failed login attempts, `user.recordFailedLogin()` transitions the account to `LOCKED` with `lockoutUntil = now + 30min`. The lock expires automatically. Subsequent login attempts during the lockout window return `401 "Account locked"`.

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| Wrong password (attempts < 5) | 401; `failedLoginAttempts` incremented | 401 | `INVALID_CREDENTIALS` |
| Wrong password (5th attempt) | 401; account `LOCKED` for 30 min | 401 | `ACCOUNT_LOCKED` |
| Account already locked | 401 | 401 | `ACCOUNT_LOCKED` |
| Account `SUSPENDED` | 401 | 401 | `ACCOUNT_SUSPENDED` |
| Email not found | 401 (no enumeration) | 401 | `INVALID_CREDENTIALS` |

---

## Flow 3: Token Refresh

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Access token has expired; supplier needs a new one |
| Preconditions | Valid refresh token held by client |
| Terminal states (success) | New access token returned |
| Terminal states (failure) | **401 "Refresh token required"** if body is absent or refresh token field is missing |
| Verification status | Partially Verified |

> ⚠️ **CRITICAL:** The refresh token must be sent in the **request body**, not in the Authorization header. Sending only a valid JWT bearer token in the header does NOT satisfy this endpoint. The endpoint will return `401 "Refresh token required"` if the request body is missing or does not contain the `refreshToken` field.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Submits refresh token in request body | `POST /api/auth/refresh` | None (refresh token in body) | Request accepted |
| 2 | auth-service | Validates `refreshToken` from body | — | — | Refresh token valid and not expired |
| 3 | auth-service | Issues new access token | — | — | New access token generated |
| 4 | Supplier | Receives new access token | — | — | 200 `{ accessToken, expiresIn }` |

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
| Actor | Supplier |
| Trigger | Supplier explicitly signs out |
| Preconditions | Authenticated (Bearer JWT) |
| Terminal states (success) | Session revoked in Redis; refresh token invalidated |
| Terminal states (failure) | 401 if JWT missing |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Submits logout request | `POST /api/auth/logout` | Bearer JWT | Request accepted |
| 2 | auth-service | Calls `RevokeSessionUseCase`: deletes session from Redis | — | — | Session deleted immediately |
| 3 | Supplier | Receives confirmation | — | — | 200 `{ message: "Logged out" }` |

### Unhappy Path Branches

| Trigger Condition | System Response | HTTP Status | Error Code |
|---|---|---|---|
| JWT missing or expired | 401 | 401 | `UNAUTHORIZED` |

---

## Flow 5: 2FA Enable

### Summary

| Field | Value |
|---|---|
| Actor | Supplier |
| Trigger | Supplier chooses to enable two-factor authentication |
| Preconditions | Authenticated (Bearer JWT); CSRF token present in request |
| Terminal states (success) | 2FA enabled; TOTP secret + QR code + backup codes returned |
| Terminal states (failure) | **403 "CSRF token missing"** if CSRF token absent |
| Verification status | Partially Verified (CSRF gate confirmed — 403 on absent CSRF) |

> ⚠️ **CRITICAL:** `POST /api/auth/2fa/enable` requires a CSRF token in the request. The endpoint returns `403 "CSRF token missing"` when the CSRF token is absent. Ensure the CSRF token is included before calling this endpoint.

> `POST /api/auth/2fa/disable` has the same CSRF requirement.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Initiates 2FA setup: gets TOTP secret + QR code | `POST /api/auth/2fa/setup` | Bearer JWT | 200 `{ secret, qrCodeUrl, backupCodes[] }` |
| 2 | Supplier | Scans QR with authenticator app; enters initial TOTP code to verify | `POST /api/auth/2fa/verify` | Bearer JWT | 200 — 2FA verified |
| 3 | Supplier | Enables 2FA (with CSRF token) | `POST /api/auth/2fa/enable` | Bearer JWT + CSRF token | 200 — 2FA active |

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
| Actor | Supplier |
| Trigger | Supplier completes a 2FA-protected action by entering their TOTP code |
| Preconditions | Authenticated (Bearer JWT); 2FA already enabled |
| Terminal states (success) | TOTP code accepted; action proceeds |
| Terminal states (failure) | 401 if TOTP code invalid or expired |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Enters 6-digit TOTP code from authenticator app | `POST /api/auth/2fa/verify` | Bearer JWT | Request accepted |
| 2 | auth-service | Validates TOTP code using speakeasy (`window: 1` for clock skew tolerance) | — | — | Code valid |
| 3 | Supplier | Receives verification confirmation | — | — | 200 — verified |

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
| Actor | Supplier |
| Trigger | Supplier chooses to disable two-factor authentication |
| Preconditions | Authenticated (Bearer JWT); 2FA currently enabled; CSRF token present |
| Terminal states (success) | 2FA disabled; `twoFactorSecret` cleared |
| Terminal states (failure) | **403 "CSRF token missing"** if CSRF token absent |
| Verification status | Partially Verified (CSRF gate confirmed) |

> ⚠️ **CRITICAL:** `POST /api/auth/2fa/disable` requires a CSRF token in the request. Returns `403 "CSRF token missing"` when the CSRF token is absent.

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Submits 2FA disable request with CSRF token | `POST /api/auth/2fa/disable` | Bearer JWT + CSRF token | Request accepted |
| 2 | auth-service | Validates CSRF token | — | — | CSRF confirmed |
| 3 | auth-service | Calls `user.disableTwoFactor()`: clears `twoFactorSecret` and `twoFactorEnabled` | — | — | 2FA disabled |
| 4 | Supplier | Receives confirmation | — | — | 200 — 2FA disabled |

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
| Actor | Supplier |
| Trigger | Supplier cannot access their account and needs to reset password |
| Preconditions | Email registered on platform |
| Terminal states (success) | New password set; session remains active if token valid |
| Terminal states (failure) | 400 if token invalid/expired; silent success even if email not found (no enumeration) |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Supplier | Requests password reset link | `POST /api/auth/password/reset/initiate` | None | 200 (silent — no enumeration) |
| 2 | auth-service | Generates 30-min reset token; sends email via notification-service | — | — | Reset email dispatched |
| 3 | Supplier | Clicks link from email; submits new password with token | `POST /api/auth/password/reset/confirm` | Reset token (in body) | 200 — password updated |
| 4 | auth-service | Validates token + expiry; hashes new password | — | — | Password updated |

### Request Bodies

Initiate:
```json
{ "email": "supplier@example.com" }
```

Confirm:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass456"
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
