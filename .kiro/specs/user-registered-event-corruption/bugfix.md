# Bugfix Requirements Document

## Introduction

After a user registers via `POST /api/auth/register`, auth-service publishes a `UserRegistered.v1` event. The `UserRegistered.v1` handler in `user-service`'s `AuthEventHandlers` class processes this event and upserts the `user_User` record. The `update` clause of that upsert unconditionally overwrites `role` and `status` on every delivery — including re-deliveries that fire asynchronously after the seed script has already set accounts to the correct state.

This causes two concrete corruptions:

1. **Buyer account suspended/blocked**: The asynchronous event delivery resets `status` to `PENDING_VERIFICATION` (or worse, to an incorrect value depending on timing and event ordering), causing the account to be in a state that renders login impossible with "Authentication not allowed".

2. **Admin account role overwritten to `buyer`**: When the `UserRegistered.v1` event fires asynchronously for the admin user, the `update` clause calls `mapRole(payload.role)`. If the `role` field in the event payload is absent, malformed, or defaults incorrectly, `mapRole` falls back to `User_UserRole.BUYER`, overwriting the correct `SYSTEM` role that was set during registration.

The defect is reproducible after a DB reset + re-seed: the seed script activates accounts via Prisma and HTTP, but the event processor fires asynchronously afterward and overwrites the correct state. Running the seed script a second time works around the issue because the second run re-applies the correct state after the event has already fired.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user is registered via `POST /api/auth/register` and the `UserRegistered.v1` event fires asynchronously after the account has been activated THEN the system overwrites the `user_User.status` field, causing the buyer account to end up in a state that produces "Authentication not allowed" on login

1.2 WHEN the `UserRegistered.v1` event fires for an admin user (registered with `role: 'system'`) and the event payload's `role` field is absent or does not map to a recognised value THEN the system sets `user_User.role` to `BUYER` (the `mapRole` default), overwriting the correct `SYSTEM` role

1.3 WHEN the `UserRegistered.v1` event fires asynchronously after `bootstrapAdminActivation()` has set the admin's `status` to `ACTIVE` THEN the system resets `user_User.status` back to `PENDING_VERIFICATION` via the `update` clause, causing subsequent login to fail with "Authentication not allowed"

1.4 WHEN the seed script is run once after a DB reset THEN the system produces broken accounts (buyer cannot log in, admin has wrong role), but running the seed script a second time after a ~5 second delay works around the issue because the second run re-applies correct state after all events have already fired

### Expected Behavior (Correct)

2.1 WHEN the `UserRegistered.v1` event fires for a buyer account THEN the system SHALL NOT overwrite an `ACTIVE` status — if the record already exists with `status = ACTIVE`, the `update` clause SHALL leave `status` unchanged

2.2 WHEN the `UserRegistered.v1` event fires for an account with a valid `role` in the payload THEN the system SHALL correctly map and persist that role without defaulting to `BUYER` regardless of event delivery timing

2.3 WHEN the `UserRegistered.v1` event fires for the admin user (with `role: 'system'` in the payload) THEN the system SHALL persist `role = SYSTEM` and SHALL NOT downgrade it to `BUYER`

2.4 WHEN the `UserRegistered.v1` event fires asynchronously after a seed script has activated an account THEN the system SHALL NOT reset `status` from `ACTIVE` back to `PENDING_VERIFICATION`

2.5 WHEN the seed script is run once after a DB reset THEN the system SHALL produce fully functional accounts on the first run — buyer can log in immediately and admin has the correct `SYSTEM` role

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `UserRegistered.v1` fires for a brand-new account that has never been activated THEN the system SHALL CONTINUE TO create the `user_User` record with `status = PENDING_VERIFICATION` as before

3.2 WHEN `UserRegistered.v1` fires for a brand-new account THEN the system SHALL CONTINUE TO set `role` from the event payload, including encrypted email and PII index entries, exactly as it does today for the `create` branch of the upsert

3.3 WHEN the `AuthLoginSuccess` event fires THEN the system SHALL CONTINUE TO update `lastLoginAt` and reset `failedLoginAttempts` on the `user_User` record, unchanged

3.4 WHEN the `AuthLoginFailed` event fires THEN the system SHALL CONTINUE TO increment `failedLoginAttempts` and set `lockoutUntil` on the `user_User` record, unchanged

3.5 WHEN the `AuthTwoFactorEnabled` or `AuthTwoFactorDisabled` event fires THEN the system SHALL CONTINUE TO mirror `twoFactorEnabled` and `twoFactorSecret` on the `user_User` record, unchanged

3.6 WHEN a user is created via user-service's internal `CreateUserUseCase` path THEN the system SHALL CONTINUE TO create the `user_User` record via that path without interference from the `UserRegistered.v1` handler

---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies the inputs that trigger the corruption:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type UserRegisteredV1Event
  OUTPUT: boolean

  // Bug fires when a UserRegistered.v1 event is delivered for an account
  // that was already activated (status = ACTIVE) or has a privileged role
  // (role = SYSTEM) set by an out-of-band mechanism before or concurrently
  // with event processing.
  RETURN X.eventType = "UserRegistered.v1"
     AND (
       user_User.findById(X.data.userId).status = ACTIVE
       OR user_User.findById(X.data.userId).role = SYSTEM
     )
END FUNCTION
```

**Property: Fix Checking** — desired behavior for all buggy inputs:

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  record_before ← user_User.findById(X.data.userId)
  
  handleUserRegisteredV1(X)           // F'(X) — fixed handler
  
  record_after ← user_User.findById(X.data.userId)

  // Status must not be downgraded from ACTIVE
  IF record_before.status = ACTIVE THEN
    ASSERT record_after.status = ACTIVE
  END IF

  // Role must not be overwritten with a wrong value
  IF X.data.role IS NOT NULL AND X.data.role != '' THEN
    ASSERT record_after.role = mapRole(X.data.role)
  END IF
END FOR
```

**Property: Preservation Checking** — non-buggy inputs must be unaffected:

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  // Brand-new registrations (no existing user_User record)
  ASSERT F(X) = F'(X)   // behavior identical before and after the fix
END FOR
```
