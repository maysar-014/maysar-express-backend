# Courier Guide — Auth Service

> Mirrors: `docs/FLOWS/auth/user-flow/courier-flows.md`
> Verification status: Partially Verified (CSRF gate on 2FA; refresh token body requirement)
> Last updated: September 2026

## Overview

This guide covers auth flows for the courier: registration, login, token refresh, logout, 2FA, and password reset. The two most critical implementation requirements are the refresh token body format and the CSRF token requirement for 2FA.

---

## Flow 1: Registration

**User Goal:** Create a new buyer account.

**UI States:** Loading | Success (redirect to onboarding) | Email exists (409) | Weak password (422) | Validation error (400) | Error

**Action:**
- `POST /api/auth/register` with `{ email, password, role: "courier", phoneNumber }`
- Success: 201 `{ userId, email }` ? redirect to onboarding / home
- Error codes:

| Status | Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | VALIDATION_ERROR | "Please check your details and try again." | Yes |
| 409 | EMAIL_ALREADY_EXISTS | "An account with this email already exists. Please log in." | No — log in |
| 422 | PASSWORD_TOO_WEAK | "Password must be at least 8 characters with mixed case and a number." | Yes |
| 5xx | — | "Something went wrong. Please try again." | Yes |

---

## Flow 2: Login

**User Goal:** Sign in to their account.

**UI States:** Loading | Success (JWT received) | Wrong credentials (401) | Account locked (401) | Suspended (401) | Error

**Action:**
- `POST /api/auth/login` with `{ email, password }`
- Success: 200 `{ accessToken, refreshToken, expiresIn }` ? store tokens, redirect home
- Lockout: after 5 failed attempts, account locked for 30 minutes — show "Too many failed attempts. Please try again in 30 minutes."

| Status | Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | INVALID_CREDENTIALS | "Incorrect email or password." | Yes |
| 401 | ACCOUNT_LOCKED | "Too many failed attempts. Please try again in 30 minutes." | No — wait |
| 401 | ACCOUNT_SUSPENDED | "Your account has been suspended. Please contact support." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes |

---

## Flow 3: Token Refresh

**User Goal:** Get a new access token when the current one expires.

> ?? **CRITICAL:** The refresh token must be sent in the **request body** as `{ "refreshToken": "..." }`. A valid JWT in the Authorization header alone is NOT sufficient. Returns `401 "Refresh token required"` if the body is missing or the `refreshToken` field is absent.

**Action:**
- `POST /api/auth/refresh` with body `{ refreshToken: "..." }`
- Success: 200 `{ accessToken, expiresIn }`

| Status | Message | User-Facing Action |
|---|---|---|
| 401 "Refresh token required" | Body was missing or empty | Re-authenticate (send user to login) |
| 401 TOKEN_EXPIRED | Refresh token expired | Re-authenticate |
| 401 INVALID_TOKEN | Token tampered | Re-authenticate |

---

## Flow 4: 2FA Enable / Disable

> ?? **CRITICAL:** `POST /api/auth/2fa/enable` and `POST /api/auth/2fa/disable` require a **CSRF token** in the request. Returns **403 "CSRF token missing"** when absent. Always include the CSRF token before calling these endpoints.

**Enable flow:** `POST /api/auth/2fa/setup` (get QR + backup codes) ? user scans QR ? `POST /api/auth/2fa/verify` (TOTP) ? `POST /api/auth/2fa/enable` (with CSRF)

**Disable flow:** `POST /api/auth/2fa/disable` (with CSRF)

| Status | Code | User-Facing Message |
|---|---|---|
| 403 | "CSRF token missing" | "Security verification failed. Please refresh the page and try again." |
| 401 | INVALID_TOTP_CODE | "Invalid code. Please check your authenticator app." |

---

## Flow 5: Password Reset

**Action:** `POST /api/auth/password/reset/initiate` ? email sent (silent — no enumeration) ? `POST /api/auth/password/reset/confirm` with token + new password

| Status | User-Facing Message |
|---|---|
| 400 TOKEN_EXPIRED | "This reset link has expired. Please request a new one." |
| 400 INVALID_TOKEN | "This reset link is invalid. Please request a new one." |
| 422 PASSWORD_TOO_WEAK | "Password must be at least 8 characters with mixed case and a number." |

