# Bugfix Requirements Document

## Introduction

When a user registers via `POST /api/auth/register` (auth-service), the auth-service creates an `auth_users` record and publishes a `UserRegistered.v1` event. However, user-service has no subscriber for `UserRegistered.v1`, so no corresponding `User_User` record is ever created in the `users` table.

The consequence is that registered users can authenticate (auth-service has their credentials) but have no profile in user-service — meaning no wallet linkage, no KYC data, no COD reputation, and no profile visibility anywhere in the platform.

The fix must make user-service consume the `UserRegistered.v1` event emitted by auth-service and create the corresponding `User_User` record, keeping auth-service as the registration entry point (since that is what the frontend calls and the API contract defines).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits `POST /api/auth/register` with valid credentials THEN the system creates an `auth_users` record but does NOT create a `users` record in user-service

1.2 WHEN auth-service publishes a `UserRegistered.v1` event after registration THEN the system has no subscriber in user-service that handles this event, so the event is silently dropped

1.3 WHEN a registered user's profile is queried in user-service THEN the system returns a "not found" error because no `User_User` row exists for that user

### Expected Behavior (Correct)

2.1 WHEN a user submits `POST /api/auth/register` with valid credentials THEN the system SHALL create both an `auth_users` record (in auth-service) and a `User_User` record (in user-service) with matching `id`, `email`, `role`, `publicCode`, and `status`

2.2 WHEN auth-service publishes a `UserRegistered.v1` event THEN the system SHALL have a subscriber in user-service that handles the event and creates the corresponding `User_User` record idempotently (no duplicate on repeated delivery)

2.3 WHEN the `UserRegistered.v1` event payload contains `firstName` and `lastName` (from the `profile` field) THEN the system SHALL populate those fields on the `User_User` record; when they are absent THEN the system SHALL leave them null without failing

2.4 WHEN the `UserRegistered.v1` event payload contains a `phoneNumber` THEN the system SHALL populate `phoneNumber` on the `User_User` record

### Unchanged Behavior (Regression Prevention)

3.1 WHEN auth-service receives a `UserRegistered` event from user-service (the documented two-way sync flow) THEN the system SHALL CONTINUE TO upsert the `auth_users` record via `UserSyncEventHandlers` without modification

3.2 WHEN a user logs in successfully THEN the system SHALL CONTINUE TO publish `AuthLoginSuccess` and user-service SHALL CONTINUE TO update `lastLoginAt` and reset `failedLoginAttempts` on the `User_User` record

3.3 WHEN a user login fails THEN the system SHALL CONTINUE TO publish `AuthLoginFailed` and user-service SHALL CONTINUE TO increment `failedLoginAttempts` and set `lockoutUntil` on the `User_User` record

3.4 WHEN 2FA is enabled or disabled THEN the system SHALL CONTINUE TO publish `AuthTwoFactorEnabled` / `AuthTwoFactorDisabled` and user-service SHALL CONTINUE TO mirror the `twoFactorEnabled` flag on the `User_User` record

3.5 WHEN a user is created directly via user-service's own `CreateUserUseCase` (internal/admin path) THEN the system SHALL CONTINUE TO create the `User_User` record and publish `UserRegistered` as before, without interference from the new event handler

---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies the inputs that trigger the missing-record bug:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type RegistrationRequest
  OUTPUT: boolean

  // Bug fires whenever registration goes through auth-service's entry point
  RETURN X.entryPoint = "POST /api/auth/register"
END FUNCTION
```

**Property: Fix Checking** — desired behavior for all buggy inputs:

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  authRecord  ← auth_users.findById(X.userId)
  userRecord  ← users.findById(X.userId)

  ASSERT authRecord IS NOT NULL
  ASSERT userRecord IS NOT NULL
  ASSERT userRecord.id        = authRecord.id
  ASSERT userRecord.email     = authRecord.email
  ASSERT userRecord.publicCode = authRecord.publicCode
END FOR
```

**Property: Preservation Checking** — non-buggy inputs must be unaffected:

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  // Registrations via user-service's own CreateUserUseCase
  ASSERT F(X) = F'(X)   // behavior identical before and after the fix
END FOR
```
