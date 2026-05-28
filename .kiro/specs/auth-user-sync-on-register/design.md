# Auth User Sync on Register — Bugfix Design

## Overview

When a user registers via `POST /api/auth/register`, auth-service creates an `auth_users` record and publishes a `UserRegistered.v1` event. user-service has no subscriber for `UserRegistered.v1`, so no `User_User` record is ever created in the `users` table. The fix adds a `UserRegistered.v1` handler inside user-service's existing `AuthEventHandlers` class that upserts the `User_User` record idempotently, mirroring the same bootstrap pattern already used for `AuthLoginSuccess`, `AuthLoginFailed`, and `AuthTwoFactor*` events.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the missing-record bug — a registration request that enters the system through auth-service's `POST /api/auth/register` entry point
- **Property (P)**: The desired behavior when the bug condition holds — both an `auth_users` record and a matching `User_User` record exist after registration, with identical `id`, `email`, `publicCode`, and `role`
- **Preservation**: All existing auth↔user sync flows (login success/failure, 2FA toggle) and the internal `CreateUserUseCase` path must remain completely unaffected by the fix
- **`RegisterUserUseCase`**: The use case in `services/auth-service/src/application/use-cases/register-user.use-case.ts` that creates the `auth_users` record and publishes `UserRegistered.v1`
- **`AuthEventHandlers`**: The class in `services/user-service/src/infrastructure/messaging/auth-event-handlers.ts` that subscribes to auth-originated events and updates `User_User` records
- **`UserRegistered.v1`**: The `EventEnvelope` published by auth-service with `eventType: "UserRegistered.v1"` and `data: { userId, publicCode, email, role, profile: { firstName?, lastName?, phoneNumber? } }`
- **`User_User`**: The Prisma model mapped to the `users` table in user-service's database
- **Idempotent upsert**: A `prisma.user_User.upsert` call that creates the record on first delivery and silently no-ops (or updates non-destructively) on duplicate delivery

## Bug Details

### Bug Condition

The bug manifests whenever a registration request is processed by auth-service's `RegisterUserUseCase`. The `AuthEventHandlers` class in user-service subscribes to `AuthLoginSuccess`, `AuthLoginFailed`, `AuthTwoFactorEnabled`, and `AuthTwoFactorDisabled` — but has no subscription for `UserRegistered.v1`. The event is published to the in-process `eventBus` and immediately dropped because no handler is registered for that event type.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type RegistrationRequest
  OUTPUT: boolean

  // Bug fires whenever registration goes through auth-service's entry point
  RETURN X.entryPoint = "POST /api/auth/register"
         AND eventBus.getSubscriberCount("UserRegistered.v1") = 0
END FUNCTION
```

### Examples

- **Normal registration**: User POSTs `{ email: "alice@example.com", password: "…" }` to `POST /api/auth/register`. `auth_users` row is created. `UserRegistered.v1` is published. No handler exists → `users` row is never created. Any subsequent call to `GET /api/users/:id` returns 404.
- **Registration with profile**: User POSTs with `profile: { firstName: "Alice", lastName: "Smith", phoneNumber: "+255700000001" }`. Same outcome — `users` row is missing, profile fields are lost.
- **Duplicate registration attempt**: User POSTs the same email twice. auth-service throws `UserAlreadyExistsError` on the second attempt — no event is published, so the bug does not compound. The first registration still leaves no `users` row.
- **Edge case — missing profile fields**: Event payload arrives with `profile: {}` or `profile` absent. The handler must not throw; it must create the `users` row with `firstName`, `lastName`, and `phoneNumber` set to `null`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `AuthLoginSuccess` handler must continue to update `lastLoginAt` and reset `failedLoginAttempts` on the `User_User` record
- `AuthLoginFailed` handler must continue to increment `failedLoginAttempts` and set `lockoutUntil` / `status = LOCKED` on the `User_User` record
- `AuthTwoFactorEnabled` handler must continue to set `twoFactorEnabled = true` on the `User_User` record
- `AuthTwoFactorDisabled` handler must continue to set `twoFactorEnabled = false` and clear `twoFactorSecret` on the `User_User` record
- `UserSyncEventHandlers` in auth-service must continue to upsert `auth_users` when it receives `UserRegistered` (the user-service-originated event) without modification
- `CreateUserUseCase` in user-service must continue to create `User_User` records and publish `UserRegistered` (its own domain event) without interference from the new handler

**Scope:**
All inputs that do NOT involve a registration request entering through `POST /api/auth/register` must be completely unaffected by this fix. This includes:
- Login flows (success and failure)
- 2FA enable/disable flows
- Direct user creation via user-service's internal `CreateUserUseCase`
- Any other event type already handled by `AuthEventHandlers`

## Hypothesized Root Cause

Based on the bug description and code inspection, the root cause is straightforward:

1. **Missing subscription**: `AuthEventHandlers.setupSubscriptions()` registers handlers for `AuthLoginSuccess`, `AuthLoginFailed`, `AuthTwoFactorEnabled`, and `AuthTwoFactorDisabled` — but never calls `eventBus.subscribe('UserRegistered.v1', …)`. The event is published by auth-service but silently discarded by the in-process bus because `handlers.get('UserRegistered.v1')` returns an empty array.

2. **Event type mismatch risk**: auth-service publishes `eventType: "UserRegistered.v1"` (versioned). The existing `UserSyncEventHandlers` in auth-service subscribes to `"UserRegistered"` (unversioned). The new handler in user-service must subscribe to `"UserRegistered.v1"` exactly, matching what `RegisterUserUseCase` publishes.

3. **No upsert guard**: Even if a subscription were added naively using `prisma.user_User.create`, a duplicate event delivery (at-least-once semantics) would throw a unique-constraint violation on `id` or `email`. The fix must use `prisma.user_User.upsert` to be idempotent.

4. **Payload shape difference**: The `UserRegistered.v1` payload uses `userId` (not `aggregateId`) as the user identifier, and nests profile fields under a `profile` object. The handler must extract these correctly.

## Correctness Properties

Property 1: Bug Condition — UserRegistered.v1 Creates User_User Record

_For any_ registration request where `isBugCondition` holds (i.e., the request enters through `POST /api/auth/register`), the fixed `AuthEventHandlers` SHALL process the `UserRegistered.v1` event and upsert a `User_User` record such that:
- `users.id` equals the `userId` from the event payload
- `users.email` equals the `email` from the event payload
- `users.publicCode` equals the `publicCode` from the event payload
- `users.role` equals the mapped `User_UserRole` derived from the `role` field in the event payload
- `users.status` equals `PENDING_VERIFICATION`
- `users.firstName`, `users.lastName`, `users.phoneNumber` are populated from `profile` when present, or `null` when absent
- `users.passwordHash` is set to an empty-string placeholder (auth-service owns the credential)
- Repeated delivery of the same event does NOT create a duplicate row or throw an error

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — Existing Auth↔User Sync Flows Unchanged

_For any_ input where `isBugCondition` does NOT hold (login events, 2FA events, internal `CreateUserUseCase` registrations), the fixed code SHALL produce exactly the same observable behavior as the original code — no changes to `lastLoginAt`, `failedLoginAttempts`, `lockoutUntil`, `twoFactorEnabled`, or `twoFactorSecret` update logic, and no interference with `CreateUserUseCase`.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `services/user-service/src/infrastructure/messaging/auth-event-handlers.ts`

**Class**: `AuthEventHandlers`

**Specific Changes**:

1. **Add `UserRegistered.v1` payload interface**: Define `AuthUserRegisteredPayload` with fields `userId`, `publicCode`, `email`, `role`, and `profile` (optional object with `firstName?`, `lastName?`, `phoneNumber?`).

2. **Add payload parser**: Add an `asUserRegistered` helper function following the same defensive-parsing pattern used by `asLoginSuccess`, `asLoginFailed`, and `asTwoFactor`.

3. **Add role mapper**: Add a `mapRole` helper (or reuse if extracted) that converts the string role from the event payload to `User_UserRole` enum values, defaulting to `User_UserRole.BUYER`.

4. **Register new subscription in `setupSubscriptions()`**: Call `eventBus.subscribe('UserRegistered.v1', async (envelope) => { … })` inside `setupSubscriptions()`, following the same inline-handler pattern used for the existing four subscriptions.

5. **Implement upsert handler**: Inside the handler, call `prisma.user_User.upsert` with:
   - `where: { id: payload.userId }` (primary key — guarantees idempotency on duplicate delivery)
   - `create`: all required fields — `id`, `email`, `publicCode`, `passwordHash: ''`, `role`, `status: User_UserStatus.PENDING_VERIFICATION`, plus optional `firstName`, `lastName`, `phoneNumber` from `profile`
   - `update`: only non-destructive fields — `publicCode`, `role`, `status` (do not overwrite `passwordHash` or security fields on re-delivery)

**File**: No other files require changes. `main.ts` already bootstraps `AuthEventHandlers` and calls `setupSubscriptions()` — the new subscription will be picked up automatically.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that publish a `UserRegistered.v1` event to the in-process `eventBus` and assert that a `User_User` upsert is called on the Prisma client. Run these tests on the UNFIXED code to observe that no upsert is triggered, confirming the missing-subscription root cause.

**Test Cases**:
1. **Basic registration sync test**: Publish `UserRegistered.v1` with a full payload and assert `prisma.user_User.upsert` is called with matching `id`, `email`, `publicCode`, `role`, and `status` (will fail on unfixed code — no handler registered)
2. **Missing profile fields test**: Publish `UserRegistered.v1` with `profile: {}` and assert the upsert is called with `firstName: null`, `lastName: null`, `phoneNumber: null` (will fail on unfixed code)
3. **Absent profile test**: Publish `UserRegistered.v1` with no `profile` key and assert no error is thrown and upsert is still called (will fail on unfixed code)
4. **Duplicate delivery test**: Publish the same `UserRegistered.v1` event twice and assert the second delivery does not throw (will fail on unfixed code — no handler, so no upsert, but verifies idempotency after fix)

**Expected Counterexamples**:
- `prisma.user_User.upsert` is never called when `UserRegistered.v1` is published
- Possible causes: no subscription registered for `UserRegistered.v1` in `AuthEventHandlers.setupSubscriptions()`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed handler produces the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := publishUserRegisteredV1(X)
  ASSERT prisma.user_User.upsert WAS CALLED
  ASSERT upsert.create.id        = X.userId
  ASSERT upsert.create.email     = X.email
  ASSERT upsert.create.publicCode = X.publicCode
  ASSERT upsert.create.role      = mapRole(X.role)
  ASSERT upsert.create.status    = PENDING_VERIFICATION
  ASSERT upsert.create.passwordHash = ''
  ASSERT upsert.create.firstName = X.profile.firstName OR null
  ASSERT upsert.create.lastName  = X.profile.lastName  OR null
  ASSERT upsert.create.phoneNumber = X.profile.phoneNumber OR null
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed `AuthEventHandlers` produces the same result as the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT AuthEventHandlers_original(X) = AuthEventHandlers_fixed(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for `AuthLoginSuccess`, `AuthLoginFailed`, `AuthTwoFactorEnabled`, and `AuthTwoFactorDisabled` events, then write property-based tests capturing that behavior and verify it is unchanged after the fix is applied.

**Test Cases**:
1. **Login success preservation**: Verify that publishing `AuthLoginSuccess` still calls `prisma.user_User.update` with `lastLoginAt` and `failedLoginAttempts: 0`
2. **Login failure preservation**: Verify that publishing `AuthLoginFailed` still calls `prisma.user_User.update` with incremented `failedLoginAttempts` and optional `lockoutUntil`
3. **2FA enabled preservation**: Verify that publishing `AuthTwoFactorEnabled` still calls `prisma.user_User.update` with `twoFactorEnabled: true`
4. **2FA disabled preservation**: Verify that publishing `AuthTwoFactorDisabled` still calls `prisma.user_User.update` with `twoFactorEnabled: false` and `twoFactorSecret: null`

### Unit Tests

- Test `UserRegistered.v1` handler with a full payload — assert correct upsert arguments
- Test `UserRegistered.v1` handler with missing `profile` — assert null fields, no throw
- Test `UserRegistered.v1` handler with missing `userId` — assert handler returns early without calling upsert
- Test duplicate delivery — assert second call does not throw (upsert semantics)
- Test role mapping for all valid role strings (`buyer`, `seller`, `supplier`, `courier`, `enabler`, `system`) and an unknown role (defaults to `BUYER`)

### Property-Based Tests

- Generate random valid `UserRegistered.v1` payloads (varying `role`, presence/absence of `profile` fields) and verify the upsert is always called with `status = PENDING_VERIFICATION` and `passwordHash = ''`
- Generate random non-`UserRegistered.v1` auth event payloads and verify the existing update handlers are called with the same arguments as before the fix (preservation property)
- Generate random duplicate event sequences and verify idempotency — no unique-constraint errors, final DB state identical to single-delivery state

### Integration Tests

- End-to-end: POST to `POST /api/auth/register`, then query `GET /api/users/:id` and assert the `User_User` record exists with matching fields
- Duplicate event delivery: Simulate the `UserRegistered.v1` event being delivered twice (at-least-once) and assert only one `users` row exists
- Existing login flow: After the fix is applied, perform a login and assert `lastLoginAt` is still updated correctly on the `User_User` record
