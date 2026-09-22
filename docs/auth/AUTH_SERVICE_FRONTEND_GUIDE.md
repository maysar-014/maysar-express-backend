# Auth Service — Frontend Integration Guide

> Mount path: `/api/auth` (also aliased at `/api/v1/auth`)
> Admin alias: `/api/v1/admin`

---

## Business Rules (from domain code)

### UserRole enum (auth-service)
`ADMIN` | `USER` | `MODERATOR` | `GUEST` | `BUYER` | `SELLER` | `COURIER` | `SUPPLIER` | `ENABLER` | `SYSTEM`

Self-registerable roles (from route validation): `buyer`, `seller`, `courier`, `supplier`, `enabler`, `system`, `admin`, `user`

### UserStatus enum
`ACTIVE` | `INACTIVE` | `SUSPENDED` | `PENDING_VERIFICATION` | `DEACTIVATED` | `LOCKED`

### canAuthenticate()
Returns true when `status === ACTIVE` OR `status === PENDING_VERIFICATION`. Users in `PENDING_VERIFICATION` can still log in.

### Account lockout (User.recordFailedLogin)
- After **5 failed login attempts** → `status` set to `LOCKED`, `lockoutUntil = now + 30 minutes`
- `isLocked()` = `status === LOCKED` OR `lockoutUntil > now`
- On successful login → `failedLoginAttempts` reset to 0, `lockoutUntil` cleared

### Password requirements (PasswordHash.isValidPassword)
Minimum **8 characters**. No other constraints enforced at the domain level.

### Session TTL (SessionEngine)
- `SESSION_TTL` = **3600 seconds (1 hour)**
- `REFRESH_THRESHOLD` = **300 seconds (5 minutes)** — when `expiresIn < 300`, `refreshRequired: true` is returned
- Max sessions per user: **5** (standard roles), **10** (SYSTEM role)
- Oldest sessions are evicted when limit is exceeded

### Password reset token
- Expires in **30 minutes** (`now + 30 * 60 * 1000`)
- Token format: `reset_{timestamp}_{16-byte-hex}`
- Token minimum length: **32 characters** (validated on reset)

### 2FA backup codes (BackupCodeEngine)
- **10 codes** generated per setup
- Each code is **10 hex characters** (5 random bytes → uppercase hex)
- Display format: `ABCD-1234-EF` (groups of 4 with dashes)
- Each code is **single-use** — consumed on use, removed from stored list
- Codes are bcrypt-hashed (salt rounds: 10) before storage

### 2FA setup flow
- `setup` → returns `qrCodeUrl` + `secret`
- `verify-setup` → confirms user scanned correctly, marks `isVerified: true`
- `enable` → requires `isVerified: true` first, then sets `isEnabled: true`
- Cannot enable before verifying setup

### Role switching (switch-role)
- User must already have the requested role in their `roles[]` array
- Returns `sessionId` + `selectedRole` + `availableRoles`
- Error `ROLE_NOT_ASSIGNED` if role not in user's assigned roles

### Role requests
- Requestable roles: `seller`, `supplier`, `courier`, `enabler`
- Cannot request a role already assigned → `ROLE_ALREADY_ASSIGNED`
- Cannot have two pending requests for same role → `ROLE_REQUEST_EXISTS`
- Request statuses: `PENDING` | `APPROVED` | `REJECTED` | `WITHDRAWN`

### Phone number validation (registration)
Pattern: `/^\+255[67]\d{8}$/` — Tanzanian mobile numbers only (+255 6x or 7x, 9 digits after country code)

### Rate limits (production defaults)
- Register: **10 requests / 15 minutes**
- Login: **5 requests / 15 minutes** (failed requests only)
- Forgot password: **3 requests / 1 hour**

---

## Route Reference

### Registration
```
POST /api/auth/register
```

```jsonc
{
  "email": "buyer@example.com",
  "password": "SecurePass1",       // min 8 chars
  "phoneNumber": "+255712345678",  // +255[67]XXXXXXXX
  "firstName": "John",             // min 2 chars
  "lastName": "Doe",               // min 2 chars
  "role": "buyer"                  // optional, defaults to buyer
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": { "userId": "usr_01J...", "message": "Registration successful. Verify your phone to activate." }
}
```

New users start with `status: PENDING_VERIFICATION`. A verification flow is triggered automatically.

### Login
```
POST /api/auth/login
```

```jsonc
{
  "email": "buyer@example.com",
  "password": "SecurePass1",
  "totpCode": "123456"   // optional — only needed if 2FA is enabled
}
```

**Response when 2FA required (no totpCode sent):**
```jsonc
{ "success": false, "requiresTwoFactor": true, "message": "Two-factor authentication code required" }
```

**Response when locked:**
```jsonc
{ "success": false, "locked": true, "message": "Account is temporarily locked due to too many failed attempts" }
```

**Response on success:**
```jsonc
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "userId": "usr_01J...", "email": "buyer@example.com", "role": "buyer", "roles": ["buyer"] }
  }
}
```

### Logout
```
POST /api/auth/logout
```
No body required. Terminates the server-side session immediately. Always call on explicit logout.

### Refresh token
```
POST /api/auth/refresh
```
```jsonc
{ "refreshToken": "eyJ..." }
```
Returns new `accessToken`. When `refreshRequired: true` is in the session response, proactively refresh before expiry.

### Verify session
```
GET /api/auth/verify
Authorization: Bearer <accessToken>
```
Returns session validity. Use on app startup to validate a stored token.

---

### Password management

#### Forgot password
```
POST /api/auth/forgot-password
```
```jsonc
{ "email": "buyer@example.com" }
```
Always returns 200 (no email enumeration). Reset link expires in **30 minutes**.

#### Reset password
```
POST /api/auth/reset-password
```
```jsonc
{
  "token": "<reset-token>",          // min 32 chars
  "newPassword": "NewSecure1",       // min 8 chars
  "confirmPassword": "NewSecure1"
}
```

---

### Two-factor authentication

The 2FA routes are mounted at `/api/auth/2fa` via `createTwoFactorRouter`.

#### Setup 2FA
```
POST /api/auth/2fa/setup
```
Body: `{ "userId": "usr_01J...", "email": "...", "method": "totp", "deviceName": "..." }` — all optional.
Returns `{ qrCodeUrl, secret }`. Show QR code for authenticator app scanning.

#### Verify 2FA setup
```
POST /api/auth/2fa/verify-setup
```
```jsonc
{ "userId": "usr_01J...", "code": "123456" }
```
Confirms the user scanned correctly (`isVerified: true`). Must be called before `enable`. Note: field is `code`, not `totpCode`.

#### Enable 2FA
```
POST /api/auth/2fa/enable
```
Registered via `auth.routes.ts` (not the 2fa router). Requires CSRF token header. Body: `{ "password": "...", "totpCode": "123456" }`

Returns `backupCodes[]` — **10 single-use codes**. Display once, never retrievable again.

#### Disable 2FA
```
POST /api/auth/2fa/disable
```
Two separate handlers exist:
- Via `auth.routes.ts`: requires CSRF header, body `{ "password": "..." }`
- Via `two-factor.routes.ts`: body `{ "userId": "...", "code": "..." }` (no CSRF)

#### Get 2FA status
```
GET /api/auth/2fa/status
```

#### Verify backup code
```
POST /api/auth/2fa/backup
```
```jsonc
{ "userId": "usr_01J...", "code": "<backup-code>" }
```

#### Verify TOTP during login (2fa router)
```
POST /api/auth/2fa/verify
```
```jsonc
{ "userId": "usr_01J...", "code": "123456" }
```

#### Verify OTP (otp-verification router — separate from 2fa router)
```
POST /api/auth/verify-otp
POST /api/auth/verify          (alias)
```
```jsonc
{ "userId": "usr_01J...", "otp": "123456" }
```
Also accepts `code` as an alias for `otp`.

#### Regenerate backup codes
```
POST /api/auth/2fa/backup-codes/regenerate
```
```jsonc
{ "userId": "usr_01J..." }
```
Invalidates all existing backup codes and returns 10 new ones.

---

### Role management

#### Switch active role
```
POST /api/auth/switch-role
Authorization: Bearer <accessToken>
```
```jsonc
{ "role": "seller", "deviceInfo": "Chrome/Mac" }
```
```jsonc
// Response 200
{
  "success": true,
  "data": { "sessionId": "ses_01J...", "selectedRole": "seller", "availableRoles": ["buyer", "seller"] }
}
```
Error `ROLE_NOT_ASSIGNED` (403) if role not in user's `roles[]`.

#### Request a new role
```
POST /api/auth/role-requests
Authorization: Bearer <accessToken>
```
```jsonc
{ "role": "seller", "justification": "I want to sell electronics..." }  // justification min 10 chars
```

#### List role requests
```
GET /api/auth/role-requests?status=PENDING
```

---

### Google OAuth

```
GET /api/auth/oauth/initiate     → redirects to Google consent screen
GET /api/auth/oauth/callback     → redirects to frontend with accessToken + refreshToken as query params
POST /api/auth/oauth/refresh     { "refreshToken": "..." }
POST /api/auth/oauth/revoke      { "token": "..." }
```

Strip tokens from URL immediately after extraction to prevent browser history leakage.

---

### Sessions

The sessions router is mounted at `/api/auth/sessions` and exposes:

```
GET  /api/auth/sessions          → list active sessions for the authenticated user
POST /api/auth/sessions          → create a new session (body: { userId, role, deviceInfo, ipAddress })
DELETE /api/auth/sessions/:sessionId  → terminate a specific session (returns 204)
```

> ⚠️ The terminate endpoint uses **`DELETE /:sessionId`** (not `POST /:id/terminate` as previously documented). It returns **204 No Content** on success.

---

### Email verification

Email verification is handled by the **user-service**, not the auth-service:

```
POST /api/user/verify-email/:token
```

The auth-service does not expose a `/verify-email` endpoint. After registration, the verification token is delivered by the user-service and redeemed there.

---

### Admin routes (`/api/auth/admin` or `/api/v1/admin`)

Admin routes are mounted at both `/api/auth/admin` and `/api/v1/admin`. All require `admin` role (`requireRole(['admin'])`).

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/admin/users/search` | Search users (`query`, `role`, `status`, `limit`, `offset`) |
| GET | `/api/auth/admin/users/:userId` | Get user by ID |
| PATCH | `/api/auth/admin/users/:userId/status` | Update user status (`active`, `suspended`, `deactivated`, `locked`) |
| PATCH | `/api/auth/admin/users/:userId/role` | Update user role |
| GET | `/api/auth/admin/users/:userId/sessions` | Get user sessions |
| DELETE | `/api/auth/admin/users/:userId/sessions` | Terminate all user sessions |
| DELETE | `/api/auth/admin/sessions/:sessionId` | Terminate specific session |
| GET | `/api/auth/admin/audit` | Get audit logs |
| GET | `/api/auth/admin/security-events` | Get security events |
| GET | `/api/auth/admin/stats` | Get system stats |
| POST | `/api/auth/admin/discovery/refresh` | Refresh service discovery |
| GET | `/api/auth/admin/health` | Service health overview |
| PATCH | `/api/auth/admin/users/:userId/verify-phone` | Admin phone verification bypass |

> The previously documented `POST /api/auth/admin/users/:id/suspend` and `POST /api/auth/admin/users/:id/unlock` endpoints do **not exist**. Status changes go through `PATCH /admin/users/:userId/status` with `{ "status": "suspended" }` or `{ "status": "active" }`.

---

### Events

The auth service emits the following outbox events. These drive downstream flows (user-service profile creation, notification delivery):

| Event | Emitted by | Key payload |
|---|---|---|
| `UserRegistered.v1` | `RegisterUserUseCase` | `userId, publicCode, email, role, phoneNumber, otp` |
| `AuthLoginSuccess` | `AuthenticateUserUseCase` | `userId, lastLoginAt, failedLoginAttempts: 0, lockoutUntil: null` |
| `AuthLoginFailed` | `AuthenticateUserUseCase` | `userId, failedLoginAttempts, lockoutUntil, reason` |

**Frontend note:** These events are consumed by notification-service and user-service — not called directly. They explain why a new user immediately receives a welcome SMS and why lockout state is visible on the next login attempt.

---

### Phone verification

```
POST /api/auth/phone/initiate    { "phoneNumber": "+255712345678" }
POST /api/auth/phone/verify      { "phoneNumber": "+255712345678", "otp": "123456" }
```

---

## Token storage strategy

- Store `accessToken` in **memory** (not localStorage)
- Store `refreshToken` in **httpOnly cookie** or secure storage
- On 401 → attempt one refresh → if refresh fails, clear tokens and redirect to login
- When session `refreshRequired: true` → proactively refresh before next request

---

## Integration checklist

- [ ] Strip OAuth tokens from URL immediately after extraction — never leave `?accessToken=...` in browser history
- [ ] Handle `REQUIRES_2FA` (HTTP 200) as a re-submit, not an error — show TOTP input and re-POST `/login` with `totpCode`
- [ ] Handle `ACCOUNT_LOCKED` (423) — show lockout duration, not a generic error
- [ ] Store `accessToken` in memory only — never in localStorage or sessionStorage
- [ ] Proactively refresh when session `refreshRequired: true` rather than waiting for a 401
- [ ] Call `POST /logout` on explicit user logout — do not just clear local tokens
- [ ] Unregister FCM push token on logout via `PUT /api/user/profile { fcmToken: null }`
- [ ] On Google OAuth callback, strip `?accessToken=...&refreshToken=...` from URL immediately after extraction
- [ ] Max sessions per user: 5 (standard) / 10 (SYSTEM) — oldest session is evicted automatically

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `ACCOUNT_LOCKED` | 423 | 5 failed attempts — locked 30 min |
| `REQUIRES_2FA` | 200 | 2FA code needed (not an error — re-submit with totpCode) |
| `INVALID_OTP` | 401 | Wrong TOTP or backup code |
| `TOKEN_EXPIRED` | 401 | Access token expired — refresh |
| `INVALID_RESET_TOKEN` | 400 | Reset token invalid or expired |
| `WEAK_PASSWORD` | 400 | Password < 8 characters |
| `ROLE_NOT_ASSIGNED` | 403 | Role not in user's roles array |
| `ROLE_ALREADY_ASSIGNED` | 409 | Role already assigned |
| `ROLE_REQUEST_EXISTS` | 409 | Pending request for this role already exists |
| `UserAlreadyExistsError` | 409 | Email already registered |


---

## System Maintenance (internal/ops)

These endpoints are for ops/admin use only. They are not called from the frontend.

```
POST /api/auth/system/maintenance/cleanup/outbox/report
POST /api/auth/system/maintenance/cleanup/outbox
```

**Auth:** `requireRoleOrService(['admin','system'])` **and** `x-service-key` header (value must be in `ALLOWED_SERVICE_KEYS` env var).

### Outbox cleanup report
`POST /api/auth/system/maintenance/cleanup/outbox/report` → **200**

Returns a dry-run count of outbox events eligible for deletion without deleting anything.

```jsonc
{
  "success": true,
  "batchSize": 1000,
  "retentionDays": { "sent": 7, "failed": 30 },
  "cutoffs": { "sent": "2026-09-11T...", "failed": "2026-08-19T..." },
  "counts": { "processed": 4200, "failed": 12 },
  "estimatedBatches": { "processed": 5, "failed": 1 },
  "durationMs": 45
}
```

Default retention: sent/processed events older than **7 days**, failed events older than **30 days**. Override via `OUTBOX_SENT_RETENTION_DAYS` / `OUTBOX_FAILED_RETENTION_DAYS` env vars.

### Outbox cleanup
`POST /api/auth/system/maintenance/cleanup/outbox` → **200**

Deletes eligible outbox events in batches. Pass `{ "dryRun": true }` in the body to simulate without deleting.

```jsonc
// Request (optional)
{ "dryRun": true }

// Response
{
  "success": true,
  "dryRun": true,
  "batchSize": 1000,
  "maxRuntimeMs": 20000,
  "results": {
    "processed": { "deleted": 4200, "batches": 5 },
    "failed": { "deleted": 12, "batches": 1 }
  },
  "durationMs": 1240
}
```

`maxRuntimeMs` defaults to **20 seconds** — the job stops after this window and reports what was done. Re-run if more batches remain.
