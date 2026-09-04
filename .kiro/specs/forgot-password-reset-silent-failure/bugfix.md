# Bugfix Requirements Document

## Introduction

The forgot-password / reset-password flow has two compounding silent failures that together make self-service password recovery completely non-functional.

**Bug 1 — Email not delivered**: `POST /api/auth/forgot-password` always returns HTTP 200 (by design, for security), but the reset email is never sent when the caller email belongs to a real user. The `userRepository.findByEmail()` call inside `ForgotPasswordUseCase` goes through `UserServiceRepository`, which proxies to the user-service client. When the client returns `null` the token/email block is silently skipped, so no `[AuthService] Password reset token generated` log line is produced and no email reaches the user.

**Bug 2 — Password not persisted after reset**: Even when a valid reset token is obtained (e.g., from the database directly), completing `POST /api/auth/reset-password` returns HTTP 200 but the old password continues to work. Inside `ResetPasswordUseCase`, the new password hash is assigned via a raw property mutation (`(user as any).passwordHash = passwordHash`) that bypasses the entity's `changePassword()` method. When `userRepository.save()` is called, `UserServiceRepository.save()` only syncs `failedLoginAttempts`, `lockoutUntil`, and `lastLoginAt` — the `passwordHash` field is never included in the update payload sent to user-service. The password change is therefore silently discarded.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits a forgot-password request with a valid, registered email address THEN the system skips token generation and email dispatch, producing no reset token and no email delivery, while still returning `{ success: true }`

1.2 WHEN `UserServiceRepository.findByEmail()` is called and the underlying user-service client returns `null` for a valid email THEN the system treats the user as non-existent and silently bypasses the entire password-reset token and email block

1.3 WHEN a user submits a reset-password request with a valid, unexpired token and a new password THEN the system returns `{ success: true, message: "Your password has been successfully reset" }` but the new password is never persisted to the database

1.4 WHEN `ResetPasswordUseCase` assigns the new password hash via `(user as any).passwordHash = passwordHash` and calls `userRepository.save(user)` THEN the system sends an update payload to user-service that contains only login-tracking fields (`failedLoginAttempts`, `lockoutUntil`, `lastLoginAt`), omitting `passwordHash` entirely

1.5 WHEN a user attempts to log in with their new password after a completed reset flow THEN the system rejects the login because the stored password hash was never changed

### Expected Behavior (Correct)

2.1 WHEN a user submits a forgot-password request with a valid, registered email address THEN the system SHALL generate a reset token, persist it, and dispatch a password reset email to that address, logging `[AuthService] Password reset token generated`

2.2 WHEN `UserServiceRepository.findByEmail()` is called for a valid email THEN the system SHALL return the corresponding `AuthUser` object so that the forgot-password token block executes correctly

2.3 WHEN a user submits a reset-password request with a valid, unexpired token and a new password THEN the system SHALL persist the new password hash to the user's record in user-service before returning `{ success: true }`

2.4 WHEN `ResetPasswordUseCase` computes a new password hash THEN the system SHALL call the entity's `changePassword()` method (or an equivalent dedicated path) and SHALL include `passwordHash` in the update payload dispatched to user-service

2.5 WHEN a user attempts to log in with their new password after a successful reset THEN the system SHALL authenticate the user successfully using the newly persisted password hash

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user submits a forgot-password request with an email that does not belong to any account THEN the system SHALL CONTINUE TO return `{ success: true }` without revealing whether an account exists (security by design)

3.2 WHEN a user submits a reset-password request with an expired token THEN the system SHALL CONTINUE TO return `{ success: false, message: "This reset token has expired" }`

3.3 WHEN a user submits a reset-password request with an already-used token THEN the system SHALL CONTINUE TO return `{ success: false, message: "This reset token has already been used" }`

3.4 WHEN a user submits a reset-password request where the two password fields do not match THEN the system SHALL CONTINUE TO return `{ success: false, message: "Passwords do not match" }`

3.5 WHEN a user submits a reset-password request with a password shorter than 8 characters THEN the system SHALL CONTINUE TO return `{ success: false, message: "Password must be at least 8 characters long" }`

3.6 WHEN `UserServiceRepository.save()` is called for a normal login-event (recording failed or successful login attempts) THEN the system SHALL CONTINUE TO sync only `failedLoginAttempts`, `lockoutUntil`, and `lastLoginAt` without affecting other user fields

3.7 WHEN a user logs in with their current (pre-reset) password before initiating a reset THEN the system SHALL CONTINUE TO authenticate the user successfully

---

## Bug Condition Pseudocode

### Bug 1 — findByEmail returns null for valid email

```pascal
FUNCTION isBugCondition_ForgotPassword(X)
  INPUT: X of type ForgotPasswordInput { email: string }
  OUTPUT: boolean

  // Bug fires when the email belongs to a real user but findByEmail returns null
  RETURN emailExistsInUserService(X.email) = true
     AND UserServiceRepository.findByEmail(X.email) = null
END FUNCTION

// Property: Fix Checking — forgot-password with valid email
FOR ALL X WHERE isBugCondition_ForgotPassword(X) DO
  result ← forgotPassword'(X)
  ASSERT passwordResetTokenCreated(X.email) = true
  ASSERT resetEmailDispatched(X.email) = true
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_ForgotPassword(X) DO
  ASSERT forgotPassword(X) = forgotPassword'(X)   // { success: true } regardless
END FOR
```

### Bug 2 — passwordHash not persisted on save

```pascal
FUNCTION isBugCondition_ResetPassword(X)
  INPUT: X of type ResetPasswordInput { token: string, newPassword: string, confirmPassword: string }
  OUTPUT: boolean

  // Bug fires when a valid reset completes but the save path omits passwordHash
  RETURN tokenIsValid(X.token) = true
     AND NOT userRepository.save includes passwordHash in update payload
END FUNCTION

// Property: Fix Checking — password is persisted after reset
FOR ALL X WHERE isBugCondition_ResetPassword(X) DO
  result ← resetPassword'(X)
  ASSERT result.success = true
  ASSERT storedPasswordHash(tokenUserId(X.token)) = hash(X.newPassword)
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition_ResetPassword(X) DO
  ASSERT resetPassword(X) = resetPassword'(X)   // error responses unchanged
END FOR
```
