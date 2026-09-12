# Maysar User Service — Implementation Reference (As-Built)

> **Status:** Live and verified — user profiles, phone verification, role management, 2FA setup, COD reputation, account lifecycle sagas.
> **Last updated:** September 2026
> **Scope:** `services/user-service` + `prisma/schema.prisma` (`User_*` models)

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **User-service owns profiles, auth-service owns credentials** | `user-service` stores name, phone, address, KYC status, COD reputation — auth-service stores passwordHash, sessions |
| **COD reputation is a separate engine** | `CODReputationEngine` (`domain/engines/cod-reputation.engine.ts`) computes score from signal history |
| **Role changes are saga-orchestrated** | `RoleChangeSaga` validates business rules, notifies downstream services, compensates on failure |
| **Account deletion is saga-orchestrated** | `AccountDeletionSaga` anonymizes PII, releases resources, emits `user.deleted` |
| **Phone verification is OTP-gated** | `VerifyPhoneUseCase` validates 6-digit OTP + TTL from `profile.phoneOtp` |
| **Security breaches are audited** | `ReportSecurityBreachUseCase` creates an audit record and triggers account review |

---

## 2. Domain Model

### 2.1 User Entity (`domain/entities/user.entity.ts`)

```
UserStatus: ACTIVE | INACTIVE | SUSPENDED | PENDING_VERIFICATION | DEACTIVATED | LOCKED
```

Key fields: `userId`, `publicCode`, `email`, `role`, `roles[]`, `status`, `profile` (JSON), `kycStatus`, `phoneVerified`, `emailVerified`, `codReputationScore`, `createdAt`.

### 2.2 Value Objects

| Value Object | Enforces |
|---|---|
| `Email` | RFC format, lowercase |
| `PasswordHash` | bcrypt, strength requirements |
| `PhoneNumber` | E.164, Tanzania normalization |
| `Address` | Required city + region |

### 2.3 COD Reputation Engine (`domain/engines/cod-reputation.engine.ts`)

Computes COD trust score from signal history. Mirrors the order-service trust model — the user-service is the authoritative store for the score; the order-service reads it via `GetCODReputationUseCase`.

---

## 3. Application Layer (Use Cases)

| Use case | What it does |
|---|---|
| `CreateUserUseCase` | Creates user profile after `UserRegistered.v1` event from auth-service |
| `GetUserUseCase` | Fetch user by ID or email |
| `UpdateUserUseCase` | Update profile fields (name, address, avatar) |
| `VerifyPhoneUseCase` | Validate OTP + TTL → mark `phoneVerified = true` |
| `VerifyEmailUseCase` | Mark `emailVerified = true` |
| `ChangePasswordUseCase` | Delegates to auth-service credential update |
| `ChangeRoleUseCase` | Policy check → `RoleChangeSaga` |
| `SetupTwoFactorUseCase` | Delegates to auth-service 2FA setup |
| `SuspendAccountUseCase` | Admin-initiated → `AccountSuspensionSaga` |
| `DeleteAccountUseCase` | User-initiated → `AccountDeletionSaga` (PII anonymization) |
| `ReportSecurityBreachUseCase` | Creates audit record, flags account for review |
| `GetCODReputationUseCase` | Returns COD score + tier for order-service consumption |
| `UpdateCODReputationUseCase` | Applies trust signal delta → updates score |
| `SearchUsersUseCase` | Admin user search with filters |

---

## 4. Sagas (`application/sagas/`)

| Saga | What it does |
|---|---|
| `UserRegistrationSaga` | Post-registration: create wallet, send welcome notification, set up profile |
| `PhoneVerificationSaga` | OTP generation → SMS delivery → verification |
| `EmailVerificationSaga` | Token generation → email delivery → verification |
| `PasswordResetSaga` | Token → email → reset → session revocation |
| `RoleChangeSaga` | Validate → update role → notify downstream → compensate on failure |
| `AccountSuspensionSaga` | Suspend → revoke sessions → notify |
| `AccountDeletionSaga` | Anonymize PII → release resources → emit `user.deleted` |
| `TwoFactorSetupSaga` | Generate secret → verify → enable |
| `SecurityPolicyBreachSaga` | Audit → flag → notify security team |
| `ProfileUpdateSaga` | Update → re-index in search → notify |

---

## 5. HTTP Surface

Mounted at `/api/user` (module name `user-service` → strip `-service` → `/api/user`). Routes are mounted directly with no `/users` sub-prefix.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/user/` | public | Create user |
| GET  | `/api/user/profile` | JWT | Get own profile |
| PUT  | `/api/user/profile` | JWT | Update own profile |
| GET  | `/api/user/:id` | JWT | Get user by ID |
| PUT  | `/api/user/:id` | JWT (admin) | Update user |
| DELETE | `/api/user/:id` | JWT | Delete account (saga) |
| POST | `/api/user/verify-email/:token` | public | Verify email |
| POST | `/api/user/request-password-reset` | public | Request password reset |
| POST | `/api/user/reset-password/:token` | public | Complete password reset |
| POST | `/api/user/:id/password` | JWT | Change password |
| POST | `/api/user/:id/suspend` | JWT (admin) | Suspend account |
| POST | `/api/user/:id/role` | JWT (admin) | Change role |
| POST | `/api/user/:id/phone/verify` | JWT | Verify phone OTP |
| POST | `/api/user/:id/2fa/setup` | JWT | Setup 2FA |
| POST | `/api/user/security/breaches/report` | JWT (system) | Report security breach |
| GET  | `/api/user/:userId/cod-reputation` | JWT | COD score + tier |
| DELETE | `/api/user/:id/addresses/:addressId` | JWT | Delete address |
| GET  | `/api/user/health` | none | Health check |

---

## 6. Events

| Event | Emitted by | Payload |
|---|---|---|
| `user.profile_updated` | `UpdateUserUseCase` | `userId, changedFields` |
| `user.phone_verified` | `VerifyPhoneUseCase` | `userId, phoneNumber` |
| `user.role_changed` | `RoleChangeSaga` | `userId, oldRole, newRole` |
| `user.suspended` | `AccountSuspensionSaga` | `userId, reason` |
| `user.deleted` | `AccountDeletionSaga` | `userId` (PII stripped) |
| `cod.trust_signal` | `UpdateCODReputationUseCase` | `userId, signalType, delta, newScore` |

Events consumed:
- `UserRegistered.v1` (from auth-service) → `CreateUserUseCase`
- `order.delivered` → `UpdateCODReputationUseCase` (SUCCESSFUL_DELIVERY signal)
- `order.refused` → `UpdateCODReputationUseCase` (REFUSED_DELIVERY signal)

---

## 7. Frontend Integration Guide

### Get profile

`GET /api/user/profile`

```jsonc
{
  "data": {
    "userId": "usr_01...",
    "publicCode": "MAY-12345",
    "email": "buyer@example.com",
    "role": "buyer",
    "roles": ["buyer"],
    "profile": {
      "name": "John Doe",
      "phoneNumber": "+255712345678",
      "address": { "city": "Dar es Salaam", "region": "Kinondoni" }
    },
    "phoneVerified": true,
    "emailVerified": true,
    "kycStatus": "APPROVED",
    "codReputationScore": 45,
    "codTier": "TRUSTED_BUYER"
  }
}
```

### Update profile

`PUT /api/user/profile`

```jsonc
{
  "name": "John Doe",
  "address": { "city": "Dar es Salaam", "region": "Kinondoni", "street": "..." },
  "avatar": "https://..."
}
```

### COD reputation

`GET /api/user/cod-reputation`

```jsonc
{
  "data": {
    "score": 45,
    "tier": "TRUSTED_BUYER",
    "lifetimeCODValue": 650000,
    "exposureLimit": 500000,
    "currentExposure": 120000
  }
}
```

Display this in the user's profile and in the COD checkout flow.

### Error handling

| Code | HTTP | UI action |
|---|---|---|
| `PHONE_ALREADY_VERIFIED` | 409 | "Phone already verified" |
| `INVALID_OTP` | 400 | "Incorrect code" |
| `OTP_EXPIRED` | 410 | "Code expired, request a new one" |
| `ROLE_CHANGE_NOT_ALLOWED` | 403 | Show eligibility requirements |
| `ACCOUNT_HAS_ACTIVE_ORDERS` | 409 | "Cannot delete account with active orders" |

### Integration checklist

- [ ] Show `publicCode` (e.g. MAY-12345) as the user's shareable identifier
- [ ] Display `phoneVerified` and `emailVerified` status with verification CTAs
- [ ] Show `kycStatus` with appropriate messaging per status
- [ ] Display COD tier and exposure limits in profile and checkout
- [ ] Handle role change flow — user may need to complete additional verification
- [ ] Show account deletion warning about PII anonymization (irreversible)
