# Forgot Password / Reset Password Silent Failure — Bugfix Design

## Overview

Two compounding silent failures make self-service password recovery completely non-functional.

**Bug 1 — Email not delivered**: `ForgotPasswordUseCase` calls `userRepository.findByEmail()`, which is fulfilled by `UserServiceRepository`. When the in-process client (`UserServiceClient.findUserByEmail`) successfully calls `findUserByEmail()` from the user-service facade, it normally returns a mapped user object. However, any failure in the underlying `PrismaUserRepository.findByEmail()` path (encrypted index miss, PII hash mismatch, schema divergence) causes the facade to return `null`. `ForgotPasswordUseCase` silently skips the entire token-and-email block when `user` is falsy, and still returns `{ success: true }`. No token is persisted, no email is sent.

**Bug 2 — Password not persisted**: `ResetPasswordUseCase` mutates the user object via `(user as any).passwordHash = passwordHash`, bypassing the `user.changePassword()` domain method. `UserServiceRepository.save()` then inspects only `failedLoginAttempts`, `lockoutUntil`, and `lastLoginAt`, so `passwordHash` is never included in the update payload sent to user-service. The password change is silently discarded even though the use case returns `{ success: true }`.

The fix strategy is:
- **Bug 1**: Replace the `userRepository.findByEmail()` call in `ForgotPasswordUseCase` with `userServiceClient.findUserByEmail()` (or add an explicit throw/log when `findByEmail` returns null for a verified-existent email), and add error surfacing so lookup failures are detectable.
- **Bug 2**: Replace the raw property mutation with `user.changePassword(passwordHash)` and call the dedicated `userServiceClient.updatePassword(userId, passwordHash.toString())` path directly instead of relying on `userRepository.save()`.

---

## Glossary

- **Bug_Condition (C)**: The set of runtime conditions under which a defect manifests silently.
- **Property (P)**: The desired observable outcome when the bug condition holds after the fix is applied.
- **Preservation**: Existing behaviors that must remain byte-for-byte identical after the fix.
- **ForgotPasswordUseCase**: `services/auth-service/src/application/use-cases/forgot-password.use-case.ts` — orchestrates token generation and email dispatch for the forgot-password flow.
- **ResetPasswordUseCase**: `services/auth-service/src/application/use-cases/reset-password.use-case.ts` — validates the token and applies the new password.
- **UserServiceRepository**: `services/auth-service/src/infrastructure/repositories/user-service.repository.ts` — auth-service's IUserRepository adapter; proxies to the user-service in-process facade via `UserServiceClient`.
- **UserServiceClient**: `services/auth-service/src/infrastructure/clients/user-service.client.ts` — thin wrapper around the user-service facade exports. Exposes `findUserByEmail`, `updatePassword`, etc.
- **user-service facade**: `services/user-service/src/internal/user-service.facade.ts` — in-process entry point; `findUserByEmail` calls `PrismaUserRepository.findByEmail` and maps to a plain DTO; `updatePassword` calls `PrismaUserRepository.updatePassword` directly.
- **PrismaUserRepository.updatePassword**: `services/user-service/src/infrastructure/repositories/prisma-user.repository.ts` — executes `prisma.user_User.update({ data: { passwordHash, passwordChangedAt } })`.
- **save() auth path**: The non-registration branch of `UserServiceRepository.save()` — only syncs `failedLoginAttempts`, `lockoutUntil`, and `lastLoginAt`.
- **changePassword()**: Domain method on `User` entity — `this.props.passwordHash = newPasswordHash`.

---

## Bug Details

### Bug 1 — findByEmail returns null for a valid registered email

The bug manifests when a real user's email passes the format check in `ForgotPasswordUseCase` but `userRepository.findByEmail(normalizedEmail)` returns `null`. The `if (user)` guard silently skips token creation and email dispatch.

**Formal Specification:**
```
FUNCTION isBugCondition_ForgotPassword(X)
  INPUT:  X of type ForgotPasswordInput { email: string }
  OUTPUT: boolean

  // Bug fires: email is registered but findByEmail returns null
  RETURN emailExistsInUserService(X.email) = true
     AND UserServiceRepository.findByEmail(X.email) = null
END FUNCTION
```

### Examples — Bug 1

| Scenario | Input email | findByEmail result | Expected outcome | Actual (buggy) outcome |
|---|---|---|---|---|
| Valid registered user | `buyer@example.com` | `null` (PII hash miss) | Token persisted, email sent | Token skipped, no email, `{ success: true }` |
| Valid registered user | `seller@example.com` | `null` (schema fallback fail) | Token persisted, email sent | Token skipped, no email, `{ success: true }` |
| Non-existent email | `ghost@example.com` | `null` (expected) | `{ success: true }`, no email (by design) | `{ success: true }` (correct — preservation case) |

---

### Bug 2 — passwordHash not included in save() payload

The bug manifests when a valid, unexpired token is submitted with a new password. `ResetPasswordUseCase` computes `passwordHash`, raw-assigns it to the user object, calls `userRepository.save(user)`, but the `save()` non-registration path in `UserServiceRepository` only reads `failedLoginAttempts`, `lockoutUntil`, and `lastLoginAt` — `passwordHash` is never extracted.

**Formal Specification:**
```
FUNCTION isBugCondition_ResetPassword(X)
  INPUT:  X of type ResetPasswordInput { token: string, newPassword: string, confirmPassword: string }
  OUTPUT: boolean

  // Bug fires: token is valid AND save() call omits passwordHash from update payload
  RETURN tokenIsValid(X.token) = true
     AND passwordResetRecord(X.token).used = false
     AND passwordResetRecord(X.token).expiresAt >= now()
     AND updatePayloadSentToUserService does NOT contain 'passwordHash'
END FUNCTION
```

### Examples — Bug 2

| Scenario | Token state | New password | Expected outcome | Actual (buggy) outcome |
|---|---|---|---|---|
| Valid unexpired token | Valid, unused | `NewPass123!` | Hash persisted, login works with new password | `{ success: true }`, old hash unchanged |
| Valid unexpired token | Valid, unused | `AnotherPass99` | Hash persisted, login works with new password | `{ success: true }`, old hash unchanged |
| Expired token | Expired | `NewPass123!` | `{ success: false, "...expired" }` | `{ success: false }` (correct — preservation) |
| Already-used token | Used | `NewPass123!` | `{ success: false, "...already been used" }` | `{ success: false }` (correct — preservation) |

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- WHEN a forgot-password request is made for a non-existent email, the system SHALL continue returning `{ success: true }` without revealing whether an account exists (security by design).
- WHEN a reset-password request is made with an expired token, the system SHALL continue returning `{ success: false, message: "This reset token has expired" }`.
- WHEN a reset-password request is made with an already-used token, the system SHALL continue returning `{ success: false, message: "This reset token has already been used" }`.
- WHEN a reset-password request is made with mismatched passwords, the system SHALL continue returning `{ success: false, message: "Passwords do not match" }`.
- WHEN a reset-password request is made with a password shorter than 8 characters, the system SHALL continue returning `{ success: false, message: "Password must be at least 8 characters long" }`.
- WHEN `UserServiceRepository.save()` is called for a login-event update (recording failed/successful logins), the system SHALL continue syncing only `failedLoginAttempts`, `lockoutUntil`, and `lastLoginAt`.
- WHEN a user logs in with their current password before initiating a reset, the system SHALL continue authenticating them successfully.

**Scope:**
All inputs that do NOT satisfy `isBugCondition_ForgotPassword` or `isBugCondition_ResetPassword` must be completely unaffected by this fix. This includes:
- Forgot-password requests for emails that genuinely do not exist in the system.
- Reset-password requests that fail validation (bad token, expired, used, password mismatch).
- All login / authenticate flows (no changes to `AuthenticateUserUseCase` or its dependencies).
- All other `UserServiceRepository.save()` callers (login attempt recording, etc.).

---

## Hypothesized Root Cause

### Bug 1 — findByEmail null return

1. **PII hash mismatch / encryption key rotation**: `PrismaUserRepository.findByEmail` looks up `user_UserIndex` by `piiService.hash(email)`. If the encryption key or hashing salt used at write-time differs from the key used at read-time, the index row is not found, `findByEmail` returns `null`, and `ForgotPasswordUseCase` skips the token block. This is the most likely root cause in staging/test environments where seed users were created before a key change.

2. **Legacy schema fallback failure**: `PrismaUserRepository.findByEmail` has a three-tier fallback (current index → legacy index → full scan). If all three tiers fail for a user that physically exists, `null` is returned silently with only an `error` log, not an exception. `ForgotPasswordUseCase` treats `null` identically to "user not found" — it does not distinguish a lookup failure from a genuine non-existent email.

3. **Missing error propagation in UserServiceRepository.findByEmail**: The HTTP fallback path (`lookupUserByEmail`) swallows errors and returns `null`. Combined with the primary path returning `null`, there is no exception to surface the failure upward.

4. **Silent guard `if (user)` in ForgotPasswordUseCase**: Even when a lookup error is theoretically detectable, the current code structure treats `null` as "no account found" — a legitimate, non-error path — so no alarm is raised.

### Bug 2 — passwordHash not persisted

1. **Raw property mutation bypasses domain method**: `(user as any).passwordHash = passwordHash` sets a typed `PasswordHash` value object onto the `AuthUser` plain object (which has no `changePassword()` method). This does not trigger any dirty-tracking or domain events.

2. **`UserServiceRepository.save()` only syncs login-tracking fields**: The auth-path of `save()` was designed exclusively for recording login events. It iterates only `failedLoginAttempts`, `lockoutUntil`, and `lastLoginAt`. The `passwordHash` key is never read from the user object.

3. **`UserServiceClient.updatePassword()` exists but is never called in the reset flow**: The client already exposes `updatePassword(userId, newPasswordHash)`, which calls the facade's `updatePassword()` → `PrismaUserRepository.updatePassword()`. This is the correct path but `ResetPasswordUseCase` does not use it.

4. **No write-through or dirty-flag mechanism**: `AuthUser` is a plain object; there is no infrastructure to detect which fields changed when `save()` is called, so any field not explicitly extracted in `save()` is silently dropped.

---

## Correctness Properties

Property 1: Bug Condition — Forgot Password Token and Email Dispatch

_For any_ `ForgotPasswordInput` where `isBugCondition_ForgotPassword` returns true (the email belongs to a registered user but `findByEmail` would have returned null on the unfixed code), the fixed `ForgotPasswordUseCase.execute()` SHALL generate a password reset token, persist it via `passwordResetRepository.create()`, and dispatch a reset email via `emailService.sendPasswordResetEmail()`, logging `[AuthService] Password reset token generated`.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Password Hash Persisted After Reset

_For any_ `ResetPasswordInput` where `isBugCondition_ResetPassword` returns true (the token is valid, unused, and unexpired), the fixed `ResetPasswordUseCase.execute()` SHALL persist the new password hash to the user's record in user-service such that `storedPasswordHash(userId) = hash(newPassword)`, and SHALL return `{ success: true }`.

**Validates: Requirements 2.3, 2.4, 2.5**

Property 3: Preservation — Forgot Password Non-Bug Inputs

_For any_ `ForgotPasswordInput` where `isBugCondition_ForgotPassword` returns false (email does not belong to a registered user), the fixed `ForgotPasswordUseCase.execute()` SHALL produce exactly the same result as the original — `{ success: true }` with no token created and no email sent — preserving the security-by-design non-disclosure behavior.

**Validates: Requirements 3.1**

Property 4: Preservation — Reset Password Error Paths

_For any_ `ResetPasswordInput` where `isBugCondition_ResetPassword` returns false (expired token, used token, password validation failure, mismatched passwords), the fixed `ResetPasswordUseCase.execute()` SHALL produce exactly the same `{ success: false, message: "..." }` response as the original code.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

Property 5: Preservation — Save() Auth-State Path Unaffected

_For any_ invocation of `UserServiceRepository.save()` that is NOT triggered by `ResetPasswordUseCase` (i.e., login-event recording calls), the fixed code SHALL sync exactly the same fields (`failedLoginAttempts`, `lockoutUntil`, `lastLoginAt`) as before, with no change in behavior.

**Validates: Requirements 3.6, 3.7**

---

## Fix Implementation

### Changes Required

#### Fix 1 — `ForgotPasswordUseCase`: surface findByEmail null as a loggable failure, not a silent skip

**File**: `services/auth-service/src/application/use-cases/forgot-password.use-case.ts`

**Current behavior**: `if (user)` silently skips token generation when `findByEmail` returns `null`.

**Specific Changes**:

1. **Distinguish lookup failure from genuine non-existent email**: Add an `emailExists` pre-check via `userRepository.emailExists(normalizedEmail)`. If `emailExists` returns `true` but `findByEmail` returns `null`, log an error and throw (or return a controlled error) so the failure is visible in observability. This ensures Bug 1 cannot be silently masked.

2. **Alternative / preferred path — use `userServiceClient.updatePassword` directly**: Since `UserServiceClient` exposes `findUserByEmail` directly, the use case (or repository) can be updated to throw when the in-process facade returns null for a confirmed-existent email, making the failure surface as a 500 rather than a silent success.

3. **Log on null return even without emailExists check**: At minimum, change the `else` branch to `logger.warn('[AuthService] findByEmail returned null for a confirmed email — skipping token generation (possible PII index miss)', ...)` so the failure is detectable in logs.

```typescript
// Pseudocode for the corrected guard:
const user = await this.userRepository.findByEmail(normalizedEmail);
if (!user) {
  // Check if the email actually exists before silently skipping
  const exists = await this.userRepository.emailExists(normalizedEmail);
  if (exists) {
    // PII lookup failure — this is an error, not a valid "no account" path
    logger.error('[AuthService] findByEmail returned null for verified-existent email', { email: normalizedEmail });
    throw new Error('User lookup failed for existing account');
  }
  // Genuine non-existent email — preserve security-by-design response
  logger.info('[AuthService] Forgot password requested for non-existent email', { email: normalizedEmail });
} else {
  // ... existing token + email block unchanged ...
}
```

---

#### Fix 2 — `ResetPasswordUseCase`: call `userServiceClient.updatePassword()` instead of `userRepository.save()`

**File**: `services/auth-service/src/application/use-cases/reset-password.use-case.ts`

**Current behavior**:
```typescript
(user as any).passwordHash = passwordHash;   // ❌ bypasses domain method, sets PasswordHash VO
await this.userRepository.save(user);        // ❌ save() never includes passwordHash in payload
```

**Specific Changes**:

1. **Use `user.changePassword(passwordHash)`**: Replace the raw mutation with the domain method. This is the correct DDD pattern and keeps the entity consistent.

   ```typescript
   user.changePassword(passwordHash);    // ✅ updates props.passwordHash via domain method
   ```

2. **Call the dedicated password-update path**: After calling `changePassword()`, call `userServiceClient.updatePassword(user.id, passwordHash.toString())` directly. This routes to `PrismaUserRepository.updatePassword()` which writes `passwordHash` and `passwordChangedAt` atomically.

   The `userServiceClient` is accessible via the injected `userRepository` cast, or the use case can accept the client as an additional constructor dependency.

   ```typescript
   // Option A — inject UserServiceClient as second dependency (preferred, testable):
   await this.userServiceClient.updatePassword(user.id, passwordHash.toString());
   
   // Option B — cast through repository (less clean but avoids DI change):
   const client = (this.userRepository as UserServiceRepository).userServiceClient;
   await client.updatePassword(user.id, passwordHash.toString());
   ```

3. **Keep `passwordResetRepository.markAsUsed()` call**: This is correct and unchanged.

4. **Remove the now-redundant `userRepository.save(user)` call** for the password field, or retain it solely to sync any ancillary fields if needed. The critical fix is that `passwordHash` must reach `PrismaUserRepository.updatePassword`.

```typescript
// Corrected block:
const user = await this.userRepository.findById(resetRecord.userId);
if (!user) {
  return { success: false, message: 'Associated user account not found' };
}

const passwordHash = await PasswordHash.fromPlainPassword(newPassword);
user.changePassword(passwordHash);                                           // ✅ domain method

await this.userServiceClient.updatePassword(user.id, passwordHash.toString()); // ✅ persists to DB
await this.passwordResetRepository.markAsUsed(resetRecord.id);
```

---

### Constructor / DI Changes

`ResetPasswordUseCase` currently accepts `(userRepository, passwordResetRepository)`. To support Option A for Fix 2, add `UserServiceClient` as a third dependency:

```typescript
constructor(
  private readonly userRepository: IUserRepository,
  private readonly passwordResetRepository: IPasswordResetRepository,
  private readonly userServiceClient: UserServiceClient   // new
) {}
```

Update `services/auth-service/index.ts` where `ResetPasswordUseCase` is instantiated to pass `userServiceClient`.

---

## Testing Strategy

### Validation Approach

The testing strategy follows the bug condition methodology: first write **exploratory tests** that exercise the unfixed code to confirm the bug manifests as described, then write **fix-checking tests** to verify Property 1 and Property 2 hold after the fix, and finally write **preservation tests** to verify Properties 3–5 hold.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples demonstrating both bugs on the UNFIXED code. Confirm or refute root cause analysis before writing the fix.

**Test Plan**: Mock `userRepository.findByEmail` to return `null` for a valid email in unit tests of `ForgotPasswordUseCase`. Mock `userRepository.save` in unit tests of `ResetPasswordUseCase` and assert that `passwordHash` is never included in the captured call arguments. Run these tests on the unfixed code; they SHOULD FAIL (i.e., confirm the bug is reproducible).

**Test Cases — Bug 1**:
1. **findByEmail null, emailExists true**: Mock `findByEmail` → `null`, mock `emailExists` → `true`. Assert `passwordResetRepository.create` is never called and `emailService.sendPasswordResetEmail` is never called. (will confirm bug on unfixed code)
2. **findByEmail null, emailExists false**: Same mock but `emailExists` → `false`. Assert same — but this is the legitimate "no account" path.
3. **findByEmail returns valid user**: Mock `findByEmail` → valid `AuthUser`. Assert `passwordResetRepository.create` IS called and email IS sent. (baseline sanity check)

**Test Cases — Bug 2**:
1. **Valid token, new password**: Spy on `userRepository.save`. After `ResetPasswordUseCase.execute()` completes with `{ success: true }`, assert that the captured `save()` argument does NOT contain a `passwordHash` property (confirms bug).
2. **Valid token — verify no DB write**: Use an in-memory `userRepository.save` spy; assert `passwordHash` field is absent from every call. (will confirm bug on unfixed code)

**Expected Counterexamples**:
- `passwordResetRepository.create` call count = 0 when `findByEmail` returns null (Bug 1).
- `userRepository.save` call argument lacks `passwordHash` key (Bug 2).

---

### Fix Checking

**Goal**: Verify Property 1 and Property 2 hold for all inputs where the bug condition is true.

**Pseudocode — Property 1:**
```
FOR ALL X WHERE isBugCondition_ForgotPassword(X) DO
  result := forgotPasswordFixed(X)
  ASSERT passwordResetTokenCreated(X.email) = true
  ASSERT resetEmailDispatched(X.email) = true
END FOR
```

**Pseudocode — Property 2:**
```
FOR ALL X WHERE isBugCondition_ResetPassword(X) DO
  result := resetPasswordFixed(X)
  ASSERT result.success = true
  ASSERT storedPasswordHash(tokenUserId(X.token)) = hash(X.newPassword)
END FOR
```

**Unit Test Plan**:
1. **ForgotPasswordUseCase (fixed)**: Mock `findByEmail` → `null`, `emailExists` → `true`. Assert use case throws (or logs error and returns controlled failure) — the silent skip is eliminated.
2. **ForgotPasswordUseCase (fixed)**: Mock `findByEmail` → valid user. Assert `passwordResetRepository.create` is called with correct `userId` and `emailService.sendPasswordResetEmail` is called with correct email.
3. **ResetPasswordUseCase (fixed)**: Call with valid token and new password. Assert `userServiceClient.updatePassword` is called with `(user.id, expectedHash)`. Assert `passwordResetRepository.markAsUsed` is called.
4. **Integration**: Obtain a reset token from the DB, call the reset endpoint, then call the login endpoint with the new password — expect HTTP 200.

---

### Preservation Checking

**Goal**: Verify Properties 3–5 hold for all inputs where the bug condition does NOT hold.

**Pseudocode — Property 3:**
```
FOR ALL X WHERE NOT isBugCondition_ForgotPassword(X) DO
  ASSERT forgotPasswordOriginal(X) = forgotPasswordFixed(X)   // { success: true }, no token
END FOR
```

**Pseudocode — Property 4:**
```
FOR ALL X WHERE NOT isBugCondition_ResetPassword(X) DO
  ASSERT resetPasswordOriginal(X) = resetPasswordFixed(X)   // same { success: false, message }
END FOR
```

**Pseudocode — Property 5:**
```
FOR ALL save(user) call where user is a login-event (NOT reset-password):
  ASSERT updatePayload = { failedLoginAttempts, lockoutUntil, lastLoginAt }
  ASSERT 'passwordHash' NOT IN updatePayload
END FOR
```

**Testing Approach**: Property-based testing is appropriate for preservation checking:
- Generate random `ForgotPasswordInput` with emails that don't exist (the non-bug path) and verify the response is always `{ success: true }` regardless of input variation.
- Generate random invalid `ResetPasswordInput` (expired tokens, mismatched passwords, too-short passwords) and assert the exact error message and `{ success: false }` are preserved.
- Generate random login-event `save()` calls and assert the update payload never contains `passwordHash`.

**Preservation Test Cases**:
1. **Non-existent email**: `forgotPassword({ email: "nonexistent@x.com" })` → `{ success: true }`, no token, no email.
2. **Expired token on reset**: → `{ success: false, message: "This reset token has expired" }`.
3. **Used token on reset**: → `{ success: false, message: "This reset token has already been used" }`.
4. **Password mismatch on reset**: → `{ success: false, message: "Passwords do not match" }`.
5. **Too-short password on reset**: → `{ success: false, message: "Password must be at least 8 characters long" }`.
6. **Login-event save() call**: `save({ failedLoginAttempts: 3, lockoutUntil: null, lastLoginAt: new Date() })` → payload sent to user-service contains only login fields, NOT `passwordHash`.

---

### Unit Tests

- Test `ForgotPasswordUseCase` with `findByEmail` returning `null` + `emailExists` returning `true` → expect error/throw (Bug 1 fix).
- Test `ForgotPasswordUseCase` with `findByEmail` returning `null` + `emailExists` returning `false` → expect `{ success: true }` (preservation).
- Test `ForgotPasswordUseCase` with valid user returned → expect token created and email sent.
- Test `ResetPasswordUseCase` with valid token → expect `userServiceClient.updatePassword` called with correct hash (Bug 2 fix).
- Test `ResetPasswordUseCase` with each error path (expired, used, mismatched, too-short) → verify response messages unchanged.
- Test `UserServiceRepository.save()` with a login-event user object → verify `passwordHash` is absent from payload (regression guard).

### Property-Based Tests

- Generate arbitrary emails not in the user store; assert `ForgotPasswordUseCase` always returns `{ success: true }` with no side effects (preservation of security-by-design).
- Generate arbitrary invalid reset inputs (randomized token strings, random passwords of varied lengths, mismatched confirm passwords); assert all error messages match original responses exactly.
- Generate arbitrary login-event user objects (varying `failedLoginAttempts`, `lockoutUntil`, `lastLoginAt`); assert `save()` payload never includes `passwordHash`.

### Integration Tests

- Full forgot-password → reset-password → login flow using a seeded test user: assert login succeeds with new password after reset.
- Full forgot-password flow for a non-existent email: assert `{ success: true }`, no DB token row created.
- Reset with expired token (seed a token with `expiresAt` in the past): assert `{ success: false, "...expired" }`.
- Verify that login-event recording (failed login counter) continues to work correctly after the fix is applied.
