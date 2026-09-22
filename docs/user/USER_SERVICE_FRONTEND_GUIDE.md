# User Service — Frontend Integration Guide

> Mount path: `/api/user`
> All user routes are directly under `/api/user/` — there is no `/users` sub-prefix.

---

## Business Rules (from domain code)

### UserRole enum (user-service — lowercase values)
`buyer` | `seller` | `supplier` | `courier` | `enabler` | `system`

Note: auth-service uses uppercase role values (`BUYER`, `SELLER`…). User-service uses lowercase. JWT claims use the auth-service format.

### UserStatus enum (lowercase values)
`active` | `inactive` | `suspended` | `pending_verification` | `deactivated` | `locked`

### KycStatus enum
`none` | `pending` | `verified` | `rejected`

### canUpdateProfile() — blocked statuses
`suspended`, `deactivated`, `inactive` → blocked. `pending_verification` and `locked` users **can** update their profile (e.g. add addresses before email verification).

Email cannot be changed via profile update — returns `{ allowed: false, reason: 'Email updates not allowed through profile update' }`.

Minimum age: **13 years** (enforced if `dateOfBirth` is provided). Violation returns `VALIDATION_ERROR` (400).

### canChangePassword() — blocked statuses
`suspended`, `deactivated`, `inactive` → blocked.

### Role transition rules (UserPolicies.canChangeRole)
Only `SYSTEM` role can change roles. Valid transitions:

| From | To |
|---|---|
| `buyer` | `seller`, `supplier` |
| `seller` | `buyer`, `supplier` |
| `supplier` | `seller` |
| `courier` | — (no transitions) |
| `enabler` | — (no transitions) |

### canDeleteUser() rules
- Only `SYSTEM` role can delete users
- Cannot delete `ACTIVE` users (must deactivate first)
- Cannot delete users with activity in the last **90 days**

### Status transition restrictions
- `DEACTIVATED → ACTIVE` is **invalid** (deactivated accounts cannot be reactivated)
- `LOCKED → ACTIVE` is **invalid** (locked accounts need manual unlock)

### Phone number validation (PhoneNumber value object)
- Format: `+{7-15 digits}` (E.164)
- Tanzanian mobile: starts with `+255`, national number starts with `6` or `7`
- Auto-normalisation: `0XXXXXXXXX` → `+255XXXXXXXXX`, `255XXXXXXXXX` → `+255XXXXXXXXX`
- `isTanzanian()` = `countryCode === '+255'`

### Language preferences
Valid values: `en`, `sw`, `fr`

### COD reputation engine (CODReputationEngine)

| Threshold | Effect |
|---|---|
| Score < 10 | `permanentlyDisabled = true` |
| Score < 30 | `suspendedUntil = now + 30 days` |
| Score < 50 | COD ineligible (`MIN_ELIGIBILITY_SCORE`) |
| `successfulOrders < 3` | COD ineligible (`MIN_SUCCESSFUL_ORDERS`) |

Score changes:
- First successful delivery: **+25** (SUCCESS_BONUS 5 + INITIAL_UNLOCK_BONUS 20)
- Subsequent successful delivery: **+5**
- Delivery refused: **-10**
- Fraud detected: **-20**
- Manual penalty: **-10**

### Route ordering
`/profile`, `/lookup`, `/search`, `/verify-email/:token`, `/request-password-reset`, `/reset-password/:token`, `/security/breaches/report` are all registered **before** `/:id`. Always use `/profile` for own-profile reads — never `/:id` with your own ID.

---

## Route Reference

### Registration
```
POST /api/user/
```
```jsonc
{
  "email": "john@example.com",
  "phoneNumber": "+255712345678",
  "firstName": "John",
  "lastName": "Doe",
  "role": "buyer",
  "preferredLanguage": "sw",
  "preferredCurrency": "TZS",
  "addresses": [
    {
      "type": "shipping",
      "isPrimary": true,
      "street": "123 Uhuru Street",
      "ward": "Kivukoni",
      "district": "Ilala Cbd",
      "region": "Dar es Salaam",
      "postalCode": "11101",
      "country": "Tanzania"
    }
  ]
}
```

> ⚠️ **Known validator quirk (as-built):** `email` must match `@example.com` (contract-test accommodation — `EXAMPLE_DOT_COM_EMAIL_PATTERN` in `user.routes.ts`). Real email domains are rejected with `400` until this pattern is relaxed. `role` is **required**.

New users start with `status: pending_verification`. Verification email sent automatically.

### Email verification
```
POST /api/user/verify-email/:token
```
```jsonc
{ "userId": "usr_01J..." }
```
On success: `emailVerified: true`, `status: active`.

### Password reset
```
POST /api/user/request-password-reset
{ "email": "john@example.com" }

POST /api/user/reset-password/:token
{ "userId": "usr_01J...", "token": "...", "newPassword": "NewSecure1!" }
```

### Get own profile
```
GET /api/user/profile
```

```jsonc
{
  "success": true,
  "data": {
    "id": "usr_01J...",
    "email": "john@example.com",
    "phoneNumber": "+255712345678",
    "firstName": "John",
    "lastName": "Doe",
    "role": "buyer",
    "status": "active",
    "emailVerified": true,
    "phoneVerified": false,
    "twoFactorEnabled": false,
    "kycStatus": "none",
    "preferredLanguage": "sw",
    "preferredCurrency": "TZS",
    "addresses": [...],
    "createdAt": "2026-09-01T10:00:00Z"
  }
}
```

### Update own profile
```
PUT /api/user/profile
```
All fields optional. To add a new address: omit `id`. To update existing: include `id`.

Blocked for `suspended`, `deactivated`, `inactive` users. Email field is ignored even if provided.

### Get user by ID
```
GET /api/user/:id
```

### Update user (admin)
```
PUT /api/user/:id
```

### Delete account
```
DELETE /api/user/:id
```
Triggers PII anonymisation saga. Only works on non-ACTIVE users with no activity in last 90 days.

### Delete address
```
DELETE /api/user/:id/addresses/:addressId
```

---

### Security operations

#### Change password
```
POST /api/user/:id/password
```
```jsonc
{ "currentPassword": "OldPass1!", "newPassword": "NewPass2!" }
```
Invalidates all existing sessions.

#### Verify phone
```
POST /api/user/:id/phone/verify
```
```jsonc
{ "phoneNumber": "+255712345678", "otp": "123456", "verificationMethod": "sms" }
```
OTP must be exactly 6 digits.

#### Setup 2FA
```
POST /api/user/:id/2fa/setup
```
```jsonc
{ "method": "totp", "deviceId": "device-uuid" }
```
`method`: `totp` or `sms`. Response includes TOTP secret/QR code for `totp`.

#### Suspend account (admin)
```
POST /api/user/:id/suspend
```
```jsonc
{ "reason": "Violation of terms", "duration": 30 }
```
`duration` in days — omit for indefinite suspension.

#### Change role (admin)
```
POST /api/user/:id/role
```
```jsonc
{ "newRole": "seller" }
```
Only `SYSTEM` role can call this. Valid transitions are restricted (see table above).

#### Report security breach (system/security only)
```
POST /api/user/security/breaches/report
```
```jsonc
{
  "userId": "usr_01J...",
  "breachType": "suspicious_login",
  "severity": "high",
  "details": { "ip": "1.2.3.4", "userAgent": "..." }
}
```
`breachType`: `suspicious_login` | `multiple_failed_attempts` | `unusual_activity` | `location_anomaly`
`severity`: `low` | `medium` | `high` | `critical`

This endpoint is called by internal security systems, not by end-user UI. Include in admin security dashboards only.

---

### COD reputation
```
GET /api/user/:userId/cod-reputation
```

```jsonc
{
  "success": true,
  "data": {
    "userId": "usr_01J...",
    "score": 65,
    "successfulOrders": 5,
    "suspendedUntil": null,
    "permanentlyDisabled": false,
    "eligible": true,
    "tier": "TRUSTED_BUYER",
    "lifetimeCODValue": 650000,
    "exposureLimit": 500000,
    "currentExposure": 120000
  }
}
```

Use this to show COD eligibility and limits on the checkout screen. If `eligible: false`, hide COD option and show `reason`.

---

### Push token registration

Register the device FCM token via the user profile update, **not** via the notification service:

```
PUT /api/user/profile
```
```jsonc
{ "fcmToken": "ExponentPushToken[xxxxxx]" }
```

Call this on every app launch after the user grants push notification permission. On logout, clear the token:
```jsonc
{ "fcmToken": null }
```

---

## Route Map

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/user/` | public | Register new user |
| GET | `/api/user/profile` | JWT | Get own profile |
| PUT | `/api/user/profile` | JWT | Update own profile |
| GET | `/api/user/lookup` | internal | Lookup by email/phone (auth-service only) |
| GET | `/api/user/search` | internal | Search users (auth-service only) |
| GET | `/api/user/:id` | JWT | Get user by ID |
| PUT | `/api/user/:id` | JWT (admin) | Update user (admin) |
| DELETE | `/api/user/:id` | JWT | Delete account |
| POST | `/api/user/verify-email/:token` | public | Verify email |
| POST | `/api/user/request-password-reset` | public | Request password reset |
| POST | `/api/user/reset-password/:token` | public | Complete password reset |
| POST | `/api/user/:id/password` | JWT | Change password |
| POST | `/api/user/:id/suspend` | JWT (admin) | Suspend account |
| POST | `/api/user/:id/role` | JWT (admin) | Change role |
| POST | `/api/user/:id/phone/verify` | JWT | Verify phone OTP |
| POST | `/api/user/:id/2fa/setup` | JWT | Setup 2FA |
| POST | `/api/user/security/breaches/report` | JWT (system/security) | Report security breach |
| GET | `/api/user/:userId/cod-reputation` | JWT | COD reputation + tier |
| DELETE | `/api/user/:id/addresses/:addressId` | JWT | Delete address |

---

## Address type enum
`billing` | `shipping` | `business` | `home` | `work` | `other`

Tanzania canonical address hierarchy (preferred over `city`):
- `ward` — most precise (e.g. "Kivukoni")
- `district` — e.g. "Ilala Cbd"
- `region` — e.g. "Dar es Salaam"

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `USER_NOT_FOUND` | 404 | User ID invalid |
| `EMAIL_ALREADY_EXISTS` | 409 | Email already registered |
| `PHONE_ALREADY_EXISTS` | 409 | Phone already registered |
| `INVALID_TOKEN` | 400 | Verification or reset token invalid/expired |
| `INVALID_OTP` | 400 | Wrong OTP code |
| `ACCOUNT_SUSPENDED` | 403 | Account suspended — show reason |
| `ACCOUNT_DEACTIVATED` | 403 | Account deactivated |
| `INVALID_ROLE_TRANSITION` | 422 | Role change not allowed (see transition table) |
| `INVALID_STATUS_TRANSITION` | 422 | Status change not allowed |
| `CANNOT_DELETE_ACTIVE_USER` | 422 | Must deactivate before deleting |
| `RECENT_ACTIVITY_RETENTION` | 422 | Activity in last 90 days — cannot delete |
| `VALIDATION_ERROR` | 400 | Missing/invalid fields — includes underage dateOfBirth |


---

## System Maintenance (internal/ops)

These endpoints are for ops/admin use only. They are not called from the frontend.

```
POST /api/user/system/maintenance/cleanup/outbox/report
POST /api/user/system/maintenance/cleanup/outbox
```

**Auth:** `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

### Outbox cleanup report
`POST /api/user/system/maintenance/cleanup/outbox/report` → **200** — dry-run count of deletable outbox events.

### Outbox cleanup
`POST /api/user/system/maintenance/cleanup/outbox` → **200** — batched deletion. Body: `{ "dryRun": true }` to simulate. `maxRuntimeMs` defaults to 20 seconds.
