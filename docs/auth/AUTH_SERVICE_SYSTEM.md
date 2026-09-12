# Maysar Auth Service — Implementation Reference (As-Built)

> **Status:** Live and verified — JWT authentication, session management, 2FA, phone OTP, Google OAuth, role switching.
> **Last updated:** September 2026
> **Scope:** `services/auth-service` + `prisma/schema.prisma` (`Auth_*` models)
> **Where this fits:** The auth service is the identity gateway for the entire platform. Every other service validates JWTs issued here. User data lives in the user-service; auth-service holds only credentials and session state.

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **Auth-service holds credentials, not profiles** | Stores `passwordHash`, `twoFactorSecret`, `failedLoginAttempts`, `lockoutUntil` — profile data fetched from `user-service` via `UserServiceRepository` |
| **Brute-force lockout is automatic** | `User.recordFailedLogin()` increments counter; at 5 failures `status = LOCKED`, `lockoutUntil = now + 30min` |
| **Lockout expiry is time-based, not event-based** | `AuthenticateUserUseCase` checks `lockoutUntil <= now` and treats expired locks as ACTIVE — no manual unlock required |
| **JWT payload carries roles array** | `resolveUserRoles()` reads `profile.roles[]` first, falls back to `user.role`; `system` role always includes `['admin','system']` |
| **2FA uses TOTP (speakeasy)** | `speakeasy.totp.verify()` with `window: 1` for clock skew tolerance; 10 backup codes generated at setup |
| **Phone OTP is 6-digit, 10-minute TTL** | Generated in `RegisterUserUseCase`, stored in `profile.phoneOtp` + `phoneOtpExpiresAt` |
| **Self-registerable roles are bounded** | `SELF_REGISTERABLE_ROLES = { buyer, seller, supplier, courier, enabler }` — `system`/`admin` require `allowPrivilegedRole: true` |
| **Events are best-effort** | `AuthLoginSuccess` / `AuthLoginFailed` published via `AuthEventPublisher`; failure never blocks authentication |

---

## 2. Domain Model

### 2.1 User Entity (`domain/entities/user.entity.ts`)

```
UserStatus: ACTIVE | INACTIVE | SUSPENDED | PENDING_VERIFICATION | DEACTIVATED | LOCKED
UserRole:   ADMIN | USER | MODERATOR | GUEST | BUYER | SELLER | COURIER | SUPPLIER | ENABLER | SYSTEM
```

Key domain methods:

| Method | Behavior |
|---|---|
| `recordFailedLogin()` | Increments `failedLoginAttempts`; locks account at ≥5 for 30 minutes |
| `recordSuccessfulLogin()` | Resets `failedLoginAttempts = 0`, clears `lockoutUntil` |
| `enableTwoFactor(secret)` | Sets `twoFactorSecret` + `twoFactorEnabled = true` |
| `disableTwoFactor()` | Clears both fields |
| `verifyEmail()` / `verifyPhone()` | Sets `emailVerified` / `phoneVerified = true` |
| `suspend()` / `reactivate()` / `deactivate()` / `unlock()` | Status transitions |
| `canAuthenticate()` | Returns true for `ACTIVE` or `PENDING_VERIFICATION` |
| `isLocked()` | Returns true if `status === LOCKED` OR `lockoutUntil > now` |

### 2.2 Value Objects

| Value Object | Enforces |
|---|---|
| `Email` | RFC-compliant format, lowercase normalization |
| `PasswordHash` | bcrypt hashing; `isValidPassword()` enforces min 8 chars, mixed case, digit |
| `PhoneNumber` | E.164 format, Tanzania prefix normalization |

### 2.3 Session Entity (`session/domain/session.entity.ts`)

Redis-backed sessions. Fields: `sessionId`, `userId`, `role`, `roles`, `ipAddress`, `userAgent`, `createdAt`, `expiresAt`, `isActive`.

---

## 3. Domain Engines

### 3.1 AuthenticationEngine (`domain/engines/authentication.engine.ts`)

Stateless engine orchestrating authentication decisions:

| Method | Purpose |
|---|---|
| `authenticateUser(user, password, totpCode?)` | Password verify → lockout check → 2FA verify → `recordSuccessfulLogin()` |
| `registerUser(email, password, role, creator?)` | Validates password strength, creates `User` in `PENDING_VERIFICATION` |
| `changePassword(user, current, new)` | Verifies current, validates new strength, rejects same-as-current |
| `initiatePasswordReset(user)` | Generates 30-min reset token |
| `enableTwoFactor(user, secret)` | Generates QR URL + 10 backup codes |
| `manageAccountStatus(manager, target, action)` | Policy-gated suspend/reactivate/deactivate/unlock |

### 3.2 SessionEngine (`session/domain/engines/session.engine.ts`)

Manages session lifecycle: create, validate, refresh, revoke. Sessions are Redis-backed with configurable TTL.

### 3.3 AccessEngine (`domain/engines/access.engine.ts`)

RBAC enforcement: resource-action permission matrix per role.

---

## 4. Application Layer (Use Cases)

### 4.1 Core authentication

| Use case | What it does |
|---|---|
| `RegisterUserUseCase` | Checks email uniqueness, normalizes role, generates phone OTP, creates user, emits `UserRegistered.v1` |
| `AuthenticateUserUseCase` | Fetches user from user-service, checks lockout, verifies password, checks 2FA, generates JWT pair |
| `ForgotPasswordUseCase` | Finds user, generates reset token, sends email |
| `ResetPasswordUseCase` | Validates token + expiry, hashes new password |
| `InitiatePhoneVerificationUseCase` | Generates OTP, stores in profile, triggers SMS |
| `VerifyPhoneOtpUseCase` | Validates OTP + TTL, marks phone verified |

### 4.2 2FA (`src/2fa/`)

| Use case | What it does |
|---|---|
| `Setup2FAUseCase` | Generates TOTP secret, returns QR URL + backup codes |
| `Verify2FAUseCase` | Validates TOTP code using speakeasy |
| `Disable2FAUseCase` | Requires password confirmation before disabling |

### 4.3 Session (`src/session/`)

| Use case | What it does |
|---|---|
| `CreateSessionUseCase` | Creates Redis session after successful auth |
| `ValidateSessionUseCase` | Checks session existence + expiry |
| `RevokeSessionUseCase` | Deletes session from Redis |
| `RefreshSessionUseCase` | Issues new access token from valid refresh token |

### 4.4 Admin

| Use case | What it does |
|---|---|
| `AdminService.listUsers()` | Paginated user list with filters |
| `AdminService.suspendUser()` | Policy-gated account suspension |
| `AdminService.unlockUser()` | Clears lockout state |

---

## 5. JWT Token Structure

```jsonc
// Access token payload
{
  "userId": "usr_01...",
  "email": "user@example.com",
  "role": "buyer",
  "roles": ["buyer"],
  "iat": 1725000000
}
```

- Algorithm: `JWT_ALGORITHM` env (default `HS256`; RS256/ES256 supported)
- Access token expiry: `JWT_ACCESS_TOKEN_EXPIRY` (default `1d`)
- Refresh token expiry: `7d`
- Issuer: `JWT_ISSUER` (default `maysar-auth-service`)
- `system` role users always receive `roles: ['admin', 'system']`

---

## 6. HTTP Surface

Mounted at `/api/auth` (module name `auth-service` → strip `-service` → `/api/auth`). Also aliased at `/api/v1/auth`. Admin routes additionally aliased at `/api/v1/admin`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | none | Register new user |
| POST | `/api/auth/login` | none | Authenticate, receive JWT pair |
| POST | `/api/auth/logout` | JWT | Revoke session |
| POST | `/api/auth/refresh` | refresh token | Issue new access token |
| GET  | `/api/auth/verify` | JWT | Verify session validity |
| POST | `/api/auth/forgot-password` | none | Initiate password reset |
| POST | `/api/auth/reset-password` | reset token | Complete password reset |
| POST | `/api/auth/verify-email` | JWT | Verify email address |
| POST | `/api/auth/phone/initiate` | JWT | Send phone OTP |
| POST | `/api/auth/phone/verify` | JWT | Verify phone OTP |
| POST | `/api/auth/2fa/setup` | JWT | Generate 2FA secret + QR |
| POST | `/api/auth/2fa/verify` | JWT | Confirm 2FA setup |
| POST | `/api/auth/2fa/enable` | JWT + CSRF | Enable 2FA (requires password + TOTP) |
| POST | `/api/auth/2fa/disable` | JWT + CSRF | Disable 2FA |
| GET  | `/api/auth/2fa/status` | JWT | Get 2FA status |
| POST | `/api/auth/2fa/backup-codes/regenerate` | JWT | Regenerate backup codes |
| GET  | `/api/auth/sessions` | JWT | List active sessions |
| POST | `/api/auth/sessions/:id/terminate` | JWT | Terminate specific session |
| POST | `/api/auth/switch-role` | JWT | Switch active role |
| POST | `/api/auth/role-requests` | JWT | Request additional role |
| GET  | `/api/auth/role-requests` | JWT | List own role requests |
| GET  | `/api/auth/oauth/initiate` | none | Google OAuth initiation |
| GET  | `/api/auth/oauth/callback` | none | Google OAuth callback |
| POST | `/api/auth/verify-otp` | none | Verify 2FA login OTP |
| GET  | `/api/auth/admin/users` | admin JWT | List users |
| POST | `/api/auth/admin/users/:id/suspend` | admin JWT | Suspend user |
| POST | `/api/auth/admin/users/:id/unlock` | admin JWT | Unlock user |
| GET  | `/api/auth/health/live` | none | Health check |

---

## 7. Events

| Event | Emitted by | Payload |
|---|---|---|
| `UserRegistered.v1` | `RegisterUserUseCase` | `userId, publicCode, email, role, profile, phoneNumber, otp` |
| `AuthLoginSuccess` | `AuthenticateUserUseCase` | `userId, lastLoginAt, failedLoginAttempts: 0, lockoutUntil: null` |
| `AuthLoginFailed` | `AuthenticateUserUseCase` | `userId, failedLoginAttempts, lockoutUntil, reason` |

---

## 8. Security Model

| Control | Implementation |
|---|---|
| **Password hashing** | bcrypt via `PasswordHash.fromPlainPassword()` |
| **Brute-force protection** | 5-attempt lockout, 30-minute window, automatic expiry |
| **2FA** | TOTP (speakeasy), window ±1 for clock skew, 10 backup codes |
| **Phone OTP** | 6-digit, 10-minute TTL, stored in profile JSON |
| **JWT signing** | HS256 (default) or RS256/ES256 via env config |
| **Role escalation prevention** | `SELF_REGISTERABLE_ROLES` set; privileged roles require `allowPrivilegedRole: true` |
| **Session revocation** | Redis-backed; logout deletes session key immediately |
| **Google OAuth** | `google-oauth.service.ts` via passport; creates/links user on first login |

---

## 9. Verification Evidence

| Artifact | What it proves |
|---|---|
| `domain/engines/__tests__/authentication.engine.test.ts` | Lockout logic, 2FA flow, password change guards |
| `api/routes/__tests__/auth.routes.test.ts` | Full HTTP surface coverage |
| `infrastructure/repositories/prisma-user.repository.test.ts` | Credential persistence |
| `session/` test suite | Session create/validate/revoke lifecycle |
| `2fa/` test suite | TOTP setup, verify, disable |
| E2E Postman collection | Login → JWT → protected route → logout |
