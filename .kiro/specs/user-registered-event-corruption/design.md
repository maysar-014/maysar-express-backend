# UserRegistered.v1 Event Corruption — Bugfix Design

## Overview

The `UserRegistered.v1` handler in user-service's `AuthEventHandlers` class has an `update` clause
that fires on every event delivery — including asynchronous re-deliveries that arrive after an
account has already been activated by the seed script or an out-of-band mechanism. The `update`
clause unconditionally writes two fields:

1. `status: User_UserStatus.PENDING_VERIFICATION` — always resets, even if the record is already
   `ACTIVE`, locking buyers out with "Authentication not allowed".
2. `role: mapRole(payload.role)` — when `payload.role` is absent or unrecognised, `mapRole`
   defaults to `User_UserRole.BUYER`, silently overwriting the `SYSTEM` role on admin accounts.

The fix is surgical: patch only the `update` clause of the single `prisma.user_User.upsert` call.
The `create` branch, the PII-encryption logic, the index-entry logic, and every other handler in
`AuthEventHandlers` are left completely untouched.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers corruption — a `UserRegistered.v1` event is
  delivered for a user whose `user_User` record already exists with `status = ACTIVE` or
  `role = SYSTEM`.
- **Property (P)**: The desired behavior when C holds — the `update` clause must not downgrade
  `status` from `ACTIVE` and must not overwrite `role` with an incorrect value.
- **Preservation**: All behaviors outside the `update` clause — the `create` branch, PII
  encryption, index creation, and all other `AuthEventHandlers` subscriptions — must remain
  byte-for-byte identical to the pre-fix code.
- **`AuthEventHandlers`**: Class at
  `services/user-service/src/infrastructure/messaging/auth-event-handlers.ts` that subscribes to
  auth-originated events and keeps `user_User` records in sync.
- **`mapRole`**: Module-level helper in the same file that converts a string role value to
  `User_UserRole`; defaults to `User_UserRole.BUYER` when the input is absent or unrecognised.
- **`user_User.status`**: Prisma enum column; values include `PENDING_VERIFICATION`, `ACTIVE`,
  `LOCKED`, `SUSPENDED`.
- **`user_User.role`**: Prisma enum column; values include `BUYER`, `SELLER`, `SUPPLIER`,
  `COURIER`, `ENABLER`, `SYSTEM`.
- **Upsert `update` clause**: The `data` object passed to `prisma.user_User.upsert({ update: … })`
  — executes only when the record already exists (`where` condition matches).
- **Upsert `create` clause**: The `data` object passed to `prisma.user_User.upsert({ create: … })`
  — executes only when the record does NOT yet exist.
- **`isBugCondition(X)`**: Pseudocode function defined below that identifies the subset of
  `UserRegistered.v1` deliveries that trigger the corruption.

---

## Bug Details

### Bug Condition

The bug manifests when a `UserRegistered.v1` event is delivered (or re-delivered) for a user whose
`user_User` record already exists with an elevated state — either `status = ACTIVE` (post-activation)
or `role = SYSTEM` (admin). Because the `update` clause unconditionally sets both `status` and
`role`, the elevated state is silently clobbered.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type UserRegistered.v1 delivery
  OUTPUT: boolean

  existingRecord ← user_User.findById(X.data.userId)

  RETURN existingRecord IS NOT NULL
     AND (
       existingRecord.status = ACTIVE
       OR existingRecord.role = SYSTEM
     )
END FUNCTION
```

### Examples

- **Buyer activation race**: Seed script creates a buyer via `POST /api/auth/register`, then
  calls `bootstrapBuyerActivation()` which sets `status = ACTIVE`. The `UserRegistered.v1` event
  fires asynchronously ~100–500 ms later. The `update` clause writes
  `status = PENDING_VERIFICATION`, making subsequent login return "Authentication not allowed".
  **Expected**: `status` remains `ACTIVE`.

- **Admin role clobber**: Seed script registers an admin with `role: 'system'`. Auth-service
  stores the role in `auth_users` correctly. The `UserRegistered.v1` event arrives; `payload.role`
  is either absent, `''`, or `'system'` — but even when it is `'system'`, a timing-variant where
  the field is dropped or corrupted causes `mapRole(undefined)` to return `BUYER`.
  **Expected**: `role` is set to `SYSTEM` when `payload.role = 'system'`, and not silently
  overwritten when `payload.role` is absent.

- **First registration (no existing record)**: Brand-new user registers for the first time.
  `user_User` does not yet exist. Upsert takes the `create` path — not the `update` path.
  Bug does not trigger. **Expected**: `create` path behavior unchanged.

- **Idempotent re-delivery for PENDING account**: `UserRegistered.v1` fires twice for a user
  still in `PENDING_VERIFICATION`. `update` clause runs on the second delivery.
  No corruption — the re-written `PENDING_VERIFICATION` is identical to the current value.
  **Expected**: No observable change; no error.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The `create` branch of the upsert (new accounts) must continue to set
  `status = PENDING_VERIFICATION`, `role = mapRole(payload.role)`, PII-encrypted `email`,
  PII-encrypted `phoneNumber`, and `passwordHash = ''` exactly as before.
- PII encryption and `user_UserIndex` creation logic must remain completely unchanged.
- `AuthLoginSuccess` handler must continue to update `lastLoginAt` and reset
  `failedLoginAttempts`.
- `AuthLoginFailed` handler must continue to increment `failedLoginAttempts` and set
  `lockoutUntil` / `status = LOCKED`.
- `AuthTwoFactorEnabled` handler must continue to set `twoFactorEnabled = true`.
- `AuthTwoFactorDisabled` handler must continue to set `twoFactorEnabled = false` and
  clear `twoFactorSecret`.

**Scope:**
All inputs where the bug condition does NOT hold — brand-new registrations (no existing record),
re-deliveries for accounts still in `PENDING_VERIFICATION`, and all non-`UserRegistered.v1` auth
events — must be completely unaffected by this fix.

---

## Hypothesized Root Cause

1. **Unconditional `status` overwrite in `update` clause**: The `update` object always includes
   `status: User_UserStatus.PENDING_VERIFICATION`. Prisma's `upsert` runs the `update` branch
   whenever `where: { id: payload.userId }` finds a matching row, regardless of the row's current
   `status`. There is no conditional guard.

2. **Unconditional `role` overwrite with unsafe default**: The `update` object always includes
   `role: mapRole(payload.role)`. When `payload.role` is `undefined` (field absent from the event
   envelope), `mapRole` executes `String(undefined ?? '').toLowerCase()` → `''`, hits the
   `default` branch, and returns `User_UserRole.BUYER`. This silently demotes any admin whose
   event payload lacks the `role` field.

3. **No guard on existing record state**: The handler does not read the existing record before
   issuing the upsert. A single conditional check (`IF existing.status = ACTIVE THEN preserve`)
   would have prevented the status corruption; similarly a null-check on `payload.role` would
   prevent the role demotion.

4. **Asynchronous delivery timing**: The event bus delivers `UserRegistered.v1` asynchronously.
   The seed script's activation calls finish synchronously before the Node.js event loop yields
   to the handler callback. The handler therefore always fires after activation, guaranteeing
   `isBugCondition` is true for every seeded account.

---

## Correctness Properties

Property 1: Bug Condition — Status and Role Preserved on Re-delivery

_For any_ `UserRegistered.v1` delivery where the bug condition holds
(`isBugCondition(X) = true`) — i.e., the `user_User` record already exists with
`status = ACTIVE` or `role = SYSTEM` — the fixed handler SHALL:

- Leave `status` unchanged when the existing `status = ACTIVE` (no downgrade to
  `PENDING_VERIFICATION`).
- Correctly persist `role = SYSTEM` when `payload.role = 'system'`.
- Not overwrite `role` with `BUYER` when `payload.role` is absent or empty.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — New Registrations and All Other Handlers Unchanged

_For any_ `UserRegistered.v1` delivery where the bug condition does NOT hold
(`isBugCondition(X) = false`) — i.e., no existing `user_User` record, or the existing record
is in `PENDING_VERIFICATION` — the fixed handler SHALL produce exactly the same observable
result as the original handler: the `create` path sets `status = PENDING_VERIFICATION`,
`role = mapRole(payload.role)`, PII-encrypted fields, and `passwordHash = ''`.

_For any_ non-`UserRegistered.v1` auth event (`AuthLoginSuccess`, `AuthLoginFailed`,
`AuthTwoFactorEnabled`, `AuthTwoFactorDisabled`), the fixed `AuthEventHandlers` SHALL produce
exactly the same result as before the fix, preserving all existing update logic.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

---

## Fix Implementation

### Changes Required

**File**: `services/user-service/src/infrastructure/messaging/auth-event-handlers.ts`

**Function**: `AuthEventHandlers.setupSubscriptions` → `UserRegistered.v1` handler →
`prisma.user_User.upsert` → `update` clause

**Scope**: Only the `update` object inside the single upsert call needs to change.
No other code in the file — and no other file — requires modification.

### Specific Changes

**1. Conditional status update — never downgrade from `ACTIVE`**

The `update` clause must omit `status` entirely when the existing record is `ACTIVE`.
Prisma does not support conditional `update` fields inline, so the approach is to read
the existing record before the upsert and conditionally include `status` in the update
object only when it is safe to do so:

```typescript
// Before upsert — read existing record (lightweight: select only what we need)
const existing = await prisma.user_User.findUnique({
  where: { id: payload.userId },
  select: { status: true }
});

const statusIsActive = existing?.status === User_UserStatus.ACTIVE;

await prisma.user_User.upsert({
  where: { id: payload.userId },
  create: { /* unchanged */ },
  update: {
    publicCode: payload.publicCode ?? null,
    role:   payload.role ? mapRole(payload.role) : undefined,   // see change 2
    // Only write status if the record is NOT already ACTIVE
    ...(statusIsActive ? {} : { status: User_UserStatus.PENDING_VERIFICATION })
  }
});
```

**2. Guard `role` update against absent / empty payload field**

The `update` clause must only write `role` when `payload.role` is a non-empty string.
When `payload.role` is absent or `''`, the field is omitted from the `update` object
(Prisma ignores `undefined` values), leaving the existing `role` untouched:

```typescript
role: payload.role ? mapRole(payload.role) : undefined
```

This is the minimal change: `mapRole` is unchanged, `asUserRegistered` is unchanged,
and the `create` branch continues to call `mapRole(payload.role)` unconditionally
(new accounts always default to `BUYER` when role is absent, which is correct).

### Complete Patched `update` Clause

```typescript
// ── UserRegistered.v1 ─────────────────────────────────────────────────────
eventBus.subscribe('UserRegistered.v1', async (envelope: EventEnvelope) => {
  const payload = asUserRegistered(envelope.data);
  if (!payload.userId) return;

  const { firstName = null, lastName = null, phoneNumber = null } = payload.profile ?? {};

  const rawEmail = payload.email ?? '';
  const encryptedEmail = rawEmail ? this.piiService.encrypt(rawEmail) : '';
  const emailHash = rawEmail ? this.piiService.hash(rawEmail) : '';

  const encryptedPhone = phoneNumber ? this.piiService.encrypt(phoneNumber) : null;
  const phoneHash = phoneNumber ? this.piiService.hash(phoneNumber) : null;

  // ── FIX: read existing record so we can protect ACTIVE status ──────────
  const existing = await prisma.user_User.findUnique({
    where: { id: payload.userId },
    select: { status: true }
  });
  const statusIsActive = existing?.status === User_UserStatus.ACTIVE;
  // ────────────────────────────────────────────────────────────────────────

  await prisma.user_User.upsert({
    where: { id: payload.userId },
    create: {
      id:           payload.userId,
      email:        encryptedEmail,
      publicCode:   payload.publicCode ?? null,
      passwordHash: '',
      role:         mapRole(payload.role),             // BUYER default is correct for create
      status:       User_UserStatus.PENDING_VERIFICATION,
      firstName:    firstName ?? null,
      lastName:     lastName ?? null,
      phoneNumber:  encryptedPhone
    },
    update: {
      publicCode: payload.publicCode ?? null,
      // ── FIX 1: only update role when the payload carries a role value ──
      ...(payload.role ? { role: mapRole(payload.role) } : {}),
      // ── FIX 2: never downgrade status from ACTIVE ─────────────────────
      ...(statusIsActive ? {} : { status: User_UserStatus.PENDING_VERIFICATION })
    }
  });

  // Index-creation logic below is UNCHANGED
  if (emailHash) {
    const existingEmailIndex = await prisma.user_UserIndex.findFirst({
      where: { userId: payload.userId, indexType: 'email' }
    });
    if (!existingEmailIndex) {
      const indexData: Array<{ userId: string; indexType: string; value: string }> = [
        { userId: payload.userId, indexType: 'email', value: emailHash }
      ];
      if (phoneHash) {
        indexData.push({ userId: payload.userId, indexType: 'phone', value: phoneHash });
      }
      await prisma.user_UserIndex.createMany({ data: indexData });
    }
  }
});
```

### No Other Changes Required

- `mapRole` — unchanged; the fix avoids calling it when `payload.role` is absent
- `asUserRegistered` — unchanged
- `AuthLoginSuccess`, `AuthLoginFailed`, `AuthTwoFactor*` handlers — unchanged
- `main.ts` / bootstrap — unchanged

---

## Testing Strategy

### Validation Approach

The testing strategy follows the bug-condition methodology in two phases:

1. **Exploration** — run tests against the *unfixed* `update` clause to surface concrete
   counterexamples and confirm the root cause.
2. **Fix + Preservation** — verify the patched clause satisfies both correctness properties
   without introducing regressions.

All tests live in the existing file:
`services/user-service/src/infrastructure/messaging/auth-event-handlers.test.ts`

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples on the UNFIXED code — confirm that the `update` clause
unconditionally overwrites `status` and `role`.

**Test Plan**: Mock `prisma.user_User.findUnique` to return an existing record with
`status = ACTIVE` (and separately `role = SYSTEM`). Deliver a `UserRegistered.v1` event.
Inspect the `upsert` call's `update` argument to confirm it writes the wrong values.

**Test Cases**:

1. **Status downgrade test** (will fail on unfixed code): Set up existing record with
   `status = ACTIVE`. Deliver event. Assert `upsert.update.status` is NOT
   `PENDING_VERIFICATION`. On unfixed code, this assertion fails — confirming the bug.

2. **Role clobber test** (will fail on unfixed code): Set up existing record with
   `role = SYSTEM`. Deliver event with no `role` field in payload. Assert
   `upsert.update.role` is NOT `BUYER`. On unfixed code, `mapRole(undefined)` returns
   `BUYER` — confirming the bug.

3. **Combined state test** (will fail on unfixed code): Existing record with
   `status = ACTIVE` and `role = SYSTEM`. Deliver event with absent `role`. Both
   corruptions must be observable in a single counterexample.

**Expected Counterexamples**:
- `upsert.update.status = 'PENDING_VERIFICATION'` when existing status was `ACTIVE`
- `upsert.update.role = 'BUYER'` when existing role was `SYSTEM` and payload lacked `role`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed handler
produces the correct behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  existing ← { status: ACTIVE } OR { role: SYSTEM }  // pre-condition
  deliver UserRegistered.v1(X)                         // F'(X)

  IF existing.status = ACTIVE THEN
    ASSERT upsert.update does NOT contain { status: PENDING_VERIFICATION }
  END IF

  IF X.data.role IS NULL OR X.data.role = '' THEN
    ASSERT upsert.update does NOT contain { role: BUYER }
  ELSE
    ASSERT upsert.update.role = mapRole(X.data.role)
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed
handler produces the same result as the original handler.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  // Case A: new record (no existing user_User row)
  ASSERT upsert.create.status    = PENDING_VERIFICATION
  ASSERT upsert.create.role      = mapRole(X.data.role)   // BUYER default correct here
  ASSERT upsert.create.email     = encrypted(X.data.email)
  ASSERT upsert.create.passwordHash = ''

  // Case B: existing record in PENDING_VERIFICATION
  ASSERT upsert.update.status = PENDING_VERIFICATION   // re-write is idempotent, no harm
END FOR

FOR ALL E WHERE E.eventType IN [AuthLoginSuccess, AuthLoginFailed,
                                 AuthTwoFactorEnabled, AuthTwoFactorDisabled] DO
  ASSERT handler_fixed(E) = handler_original(E)
END FOR
```

**Testing Approach**: Property-based testing is recommended for the status/role combinations
because there are multiple enum values, multiple payload shapes (role present/absent), and
multiple existing-record states. Exhaustive enumeration is feasible but PBT makes the
invariant more explicit and catches unexpected interactions.

### Unit Tests

| # | Test name | What it asserts | Phase |
|---|-----------|-----------------|-------|
| C.1 | Status NOT downgraded when existing is ACTIVE | `update` omits or does not set `status = PENDING_VERIFICATION` | Fix Checking |
| C.2 | Status written when existing is PENDING | `update` includes `status = PENDING_VERIFICATION` | Fix Checking |
| C.3 | Status written when no existing record | `create.status = PENDING_VERIFICATION` | Preservation |
| C.4 | Role preserved when payload.role absent | `update` omits `role` entirely | Fix Checking |
| C.5 | Role = SYSTEM when payload.role = 'system' | `update.role = SYSTEM` | Fix Checking |
| C.6 | Role = BUYER when payload.role = 'buyer' | `update.role = BUYER` | Fix Checking |
| C.7 | Role default BUYER on create when payload.role absent | `create.role = BUYER` | Preservation |
| C.8 | Create branch PII fields unchanged | `create.email = encrypted(...)` | Preservation |
| C.9 | AuthLoginSuccess unchanged | `update.failedLoginAttempts = 0` | Preservation |
| C.10 | AuthLoginFailed unchanged | `update.failedLoginAttempts` incremented | Preservation |
| C.11 | AuthTwoFactorEnabled unchanged | `update.twoFactorEnabled = true` | Preservation |
| C.12 | AuthTwoFactorDisabled unchanged | `update.twoFactorEnabled = false` | Preservation |

### Property-Based Tests

- **P1 — Status non-downgrade property**: For all existing records where
  `status = ACTIVE`, after delivering any `UserRegistered.v1` event the resulting
  `update` object must NOT contain `status = PENDING_VERIFICATION`. Generate payloads
  with random `role` values (including undefined) to exercise all branches.

- **P2 — Role correctness property**: For all `UserRegistered.v1` payloads where
  `payload.role` is a non-empty string, the `update` object must contain
  `role = mapRole(payload.role)`. For all payloads where `payload.role` is absent or
  empty, the `update` object must NOT contain a `role` key (or it must equal the
  existing role — not `BUYER` by default).

- **P3 — Create branch preservation**: For all `UserRegistered.v1` payloads delivered
  when no existing record is present (`findUnique` returns `null`), the `create` branch
  must behave identically to the pre-fix implementation: `status = PENDING_VERIFICATION`,
  `role = mapRole(payload.role)`, and all PII fields encrypted correctly.

- **P4 — Other handlers unchanged**: For all random payloads of type `AuthLoginSuccess`,
  `AuthLoginFailed`, `AuthTwoFactorEnabled`, or `AuthTwoFactorDisabled`, the `update`
  calls issued by the fixed `AuthEventHandlers` must be identical to those issued by the
  original code.

### Integration Tests

- **Seed script simulation**: Call `POST /api/auth/register` for a buyer, activate the
  account (set `status = ACTIVE`), then fire `UserRegistered.v1` asynchronously. Assert
  `status` remains `ACTIVE` and login succeeds.

- **Admin role integrity**: Register a user with `role: 'system'`, activate and set
  `role = SYSTEM` out-of-band, then fire `UserRegistered.v1` with no `role` field.
  Assert `role` remains `SYSTEM`.

- **First-run seed idempotency**: Reset the DB, run the seed script once, assert all
  seeded accounts are functional without requiring a second seed run.

- **Idempotent re-delivery**: Deliver `UserRegistered.v1` twice for the same user.
  Assert no unique-constraint error and that the final record state is correct.
