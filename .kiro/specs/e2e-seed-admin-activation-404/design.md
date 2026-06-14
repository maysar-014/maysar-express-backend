# E2E Seed Admin Activation 404 Bugfix Design

## Overview

Two separate but related defects prevent the E2E seed script and live test helpers from activating users against the monolith:

1. **Wrong path (primary bug):** Both `scripts/seed-e2e-users.ts` and `tests/e2e/helpers/live-api.ts` call `PATCH /api/v1/admin/users/:userId/status`. That path belongs to the standalone auth-service. The monolith strips `-service` from module names when mounting routes (e.g. `auth-service` → `/api/auth`), so the correct monolith path is `PATCH /api/auth/admin/users/:userId/status`. Both files must have their two path literals corrected.

2. **Admin bootstrap ordering (secondary bug):** Inside `main()` in `seed-e2e-users.ts`, the very first iteration processes the admin user. It calls `activateUser(await loginAdmin(), admin.id)` — but `loginAdmin()` tries to authenticate via HTTP before the admin has been activated, so the login returns a non-2xx status and no token is available to perform the activation. The admin user can never activate itself through the HTTP flow; activation must be bootstrapped via a direct Prisma write instead.

The fix is surgical: two path string literals changed, and the seed script's `main()` loop gains a special-case Prisma upsert for the admin row before the HTTP loop begins.

## Glossary

- **Bug_Condition (C)**: The condition that triggers a defect — either (a) calling the wrong URL path for `PATCH` status, or (b) attempting `loginAdmin()` before the admin account is active.
- **Property (P)**: The desired correct behavior — activation requests reach the right endpoint and succeed; the admin can log in before any non-admin is processed.
- **Preservation**: All other seed and test-helper behavior (register, login, wallet top-up, product seeding) must remain unchanged.
- **`activateUser`**: The function in `scripts/seed-e2e-users.ts` that calls `PATCH .../status` to activate a seeded user.
- **`activateUserViaAdmin`**: The function in `tests/e2e/helpers/live-api.ts` that calls `PATCH .../status` to re-activate a locked test user during E2E runs.
- **`loginAdmin`**: The function in `scripts/seed-e2e-users.ts` that logs in as `admin@maysar.co.tz` and caches the token.
- **`Auth_UserStatus`**: The Prisma enum defined in `prisma/schema.prisma`. Relevant values: `PENDING_VERIFICATION`, `ACTIVE`.
- **monolith path**: The URL at which the monolith exposes a service, derived by stripping `-service` from the module name and prepending `/api/`.

## Bug Details

### Bug Condition

**Bug A — Wrong activation path:**

The bug manifests whenever `activateUser()` (seed script) or `activateUserViaAdmin()` (live-api helper) is called against the monolith. The HTTP client sends the request to a path that the monolith has never registered, resulting in a 404.

```
FUNCTION isBugConditionA(request)
  INPUT: request — an outbound PATCH request from the seed script or live-api helper
  OUTPUT: boolean

  RETURN request.method = 'PATCH'
     AND request.path MATCHES '/api/v1/admin/users/{userId}/status'
     AND target IS monolith               // not standalone auth-service
END FUNCTION
```

**Bug B — Admin bootstrap ordering:**

```
FUNCTION isBugConditionB(seedState)
  INPUT: seedState — the state of the system at the point where the admin user is being processed
  OUTPUT: boolean

  RETURN seedState.currentUser.id = 'usr_ADMIN000000000000000000001'
     AND seedState.adminHttpStatus = PENDING_VERIFICATION   // not yet active
     AND loginAdmin() is called via HTTP before DB activation
END FUNCTION
```

### Examples

**Bug A examples:**
- `activateUser(token, 'usr_ADMIN000000000000000000001')` → `PATCH /api/v1/admin/users/usr_ADMIN000000000000000000001/status` → HTTP 404 `{"error":"Not Found"}`
- `activateUserViaAdmin(token, 'usr_01KRFXQZC36NK3CDEWJJS21RP8')` → `PATCH /api/v1/admin/users/usr_01KRFXQZC36NK3CDEWJJS21RP8/status` → HTTP 404 `{"error":"Not Found"}`

**Bug B examples:**
- Seed script iteration 1 (admin): `registerUser(admin)` succeeds → `activateUser(await loginAdmin(), admin.id)` → `loginAdmin()` calls `POST /api/auth/login` → HTTP 401 (admin is `pending_verification`) → `loginAdmin()` throws → seed exits with non-zero status

**Post-fix expected behavior:**
- `activateUser(token, 'usr_ADMIN000000000000000000001')` → `PATCH /api/auth/admin/users/usr_ADMIN000000000000000000001/status` → HTTP 200
- Admin is activated via Prisma before the HTTP loop begins, so `loginAdmin()` succeeds on first call

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- User registration via `POST /api/auth/register` must continue to work exactly as before
- User login via `POST /api/auth/login` must continue to return `accessToken` on HTTP 200
- Wallet top-up via `POST /api/wallet/wallets/:userId/credit` must continue to work
- Seller product seeding via Prisma direct writes must continue to work
- `loginAs()` in `live-api.ts` must continue to return a valid access token
- `getAdminToken()` caching behavior must remain unchanged
- The `activateUserViaAdmin` self-repair path in `loginAs()` must continue to fire for non-admin locked users

**Scope:**
All logic that does NOT involve the `PATCH .../status` path or the admin bootstrap step is completely unaffected. This includes:
- All other HTTP paths used by the seed script (`/api/auth/register`, `/api/auth/login`, `/api/wallet/...`, `/api/catalog/...`)
- All other helper functions in `live-api.ts` (`requestJson`, `authHeader`, `buildWalletMutationRequest`, `extractAccessToken`, etc.)
- Any non-admin user seeding (buyer, seller, supplier, courier, enabler)

## Hypothesized Root Cause

**Bug A — Wrong path:**

1. **Copy-paste from standalone-service context**: The path `/api/v1/admin/users/:userId/status` mirrors what the auth-service exposes when run standalone (the `admin.routes.ts` comment says `All routes are prefixed with /api/v1/admin in main.ts`). When the service was merged into the monolith, the standalone prefix was never updated in the calling code.

2. **No integration test for the activation HTTP call**: The seed script and live-api helper lacked a test that exercises the full path against the running monolith, so the mismatch was never caught.

**Bug B — Admin bootstrap:**

3. **Linear loop without special-casing the admin row**: `main()` iterates `SEED_USERS` in order. The admin is first. The loop calls `activateUser(await loginAdmin(), ...)` for every user including the admin itself. `loginAdmin()` requires a successful login, which requires `status = ACTIVE`, which requires `activateUser()` to have already run — a circular dependency. The code was likely written assuming the admin was pre-seeded as active in an earlier migration or manual step.

4. **`cachedAdminToken` is only set on success**: Because `loginAdmin()` throws on non-200, the cache is never populated and every subsequent call also fails until the admin is active.

## Correctness Properties

Property 1: Bug Condition A — Activation Requests Reach the Correct Monolith Path

_For any_ call to `activateUser(token, userId)` in `seed-e2e-users.ts` or `activateUserViaAdmin(token, userId)` in `live-api.ts`, the fixed functions SHALL send the request to `/api/auth/admin/users/${userId}/status` and receive a non-404 response from the monolith.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition B — Admin Bootstrap Succeeds Without HTTP Activation Loop

_For any_ seed run where the admin user (`usr_ADMIN000000000000000000001`) has `status = pending_verification` in the database at the start of seeding, the fixed `main()` SHALL activate the admin account via a direct Prisma upsert before any HTTP calls are made, ensuring `loginAdmin()` returns a valid token on its first invocation.

**Validates: Requirements 2.3**

Property 3: Preservation — Non-Activation Seed Behaviors Are Unchanged

_For any_ seed operation that does NOT involve the `PATCH .../status` endpoint or admin bootstrap (register, login, wallet top-up, product seed), the fixed code SHALL produce exactly the same behavior as the original code.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Fix A: Correct the path literals (two files)

**File 1:** `scripts/seed-e2e-users.ts`

**Function:** `activateUser`

**Change:**
```
// Before
const response = await requestJson(`/api/v1/admin/users/${userId}/status`, {

// After
const response = await requestJson(`/api/auth/admin/users/${userId}/status`, {
```

**File 2:** `tests/e2e/helpers/live-api.ts`

**Function:** `activateUserViaAdmin`

**Change:**
```
// Before
const response = await requestJson(`/api/v1/admin/users/${userId}/status`, {

// After
const response = await requestJson(`/api/auth/admin/users/${userId}/status`, {
```

No other changes to either function are needed.

---

### Fix B: Bootstrap admin activation via Prisma in `seed-e2e-users.ts`

**File:** `scripts/seed-e2e-users.ts`

**Function:** `main`

**Approach:** Before entering the `for` loop, call a new helper `bootstrapAdminActivation()` that directly upserts the admin user's status to `ACTIVE` via Prisma. This bypasses the HTTP circular dependency. The HTTP loop then runs as-is for all users (including admin), and `loginAdmin()` will succeed because the admin is already active by the time it is called.

**New helper (pseudocode):**
```
FUNCTION bootstrapAdminActivation()
  adminUser := SEED_USERS[0]   // usr_ADMIN000000000000000000001
  
  await prisma.user.upsert({
    where:  { id: adminUser.id },
    update: { status: 'ACTIVE' },    // Auth_UserStatus enum value
    create: {
      id:           adminUser.id,
      email:        adminUser.email,
      passwordHash: '<bcrypt of adminUser.password>',
      role:         'SYSTEM',
      status:       'ACTIVE',
      ...
    }
  })
END FUNCTION
```

**Note on `create` vs `update`:** If `registerUser(admin)` has already run and persisted the row, only the `update` branch fires. If this function is called before `registerUser` (see updated `main()` below), the `create` branch must supply all non-nullable fields. The simpler and safer approach is:

1. Call `registerUser(admin)` via HTTP first (creates the row as `PENDING_VERIFICATION`)
2. Immediately call `bootstrapAdminActivation()` via Prisma `update` (sets status to `ACTIVE`)
3. Then enter the loop for all users

This avoids needing to replicate password hashing inside the seed script.

**Updated `main()` structure:**

```
FUNCTION main()
  // Step 1: Register admin via HTTP (creates row as PENDING_VERIFICATION)
  registerUser(SEED_USERS[0])
  
  // Step 2: Activate admin directly via Prisma (breaks circular dependency)
  bootstrapAdminActivation()
  
  // Step 3: Process all users (admin first — activateUser call is now idempotent / no-op for admin)
  FOR EACH user IN SEED_USERS DO
    IF user is NOT admin THEN
      registerUser(user)
    END IF
    activateUser(await loginAdmin(), user.id)   // loginAdmin() now works; admin activation is idempotent
    token := loginUser(user)
    ...seed product, wallet, etc.
  END FOR
END FUNCTION
```

Alternative: keep the loop identical but add an early-return guard in `bootstrapAdminActivation` that runs before the loop. Either approach is acceptable; the direct-Prisma upsert is the key change.

**Specific Prisma call:**
```typescript
await prisma.user.update({
  where: { id: SEED_USERS[0].id },
  data:  { status: 'ACTIVE' },
});
```

The `Auth_UserStatus` Prisma enum value for active is `ACTIVE` (mapped to `"active"` in the DB). No migration is needed; this is a runtime data update only.

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach: first surface the failures on unfixed code (exploratory), then verify both fixes and confirm preservation.

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples demonstrating both bugs BEFORE implementing the fix.

**Bug A — Test Plan:**
Run the seed script against the monolith with the unfixed path. Observe the 404. Alternatively, write a unit test that stubs `requestJson` to capture the URL called by `activateUser` and asserts it contains `/api/v1/admin/` (will pass on unfixed code, confirming the bug).

**Test Cases:**
1. **Path assertion test (seed):** Call `activateUser('token', 'usr_ADMIN000000000000000000001')` with `requestJson` stubbed; assert captured URL contains `/api/v1/admin/` (fails on fixed code — confirms bug is present pre-fix)
2. **Path assertion test (live-api):** Call `activateUserViaAdmin('token', 'usr_ADMIN000000000000000000001')` with `requestJson` stubbed; assert captured URL contains `/api/v1/admin/` (same)
3. **Live HTTP test:** Run `ts-node scripts/seed-e2e-users.ts` against running monolith; observe `HTTP 404` error

**Bug B — Test Plan:**
Run the seed script against the monolith when the admin is `pending_verification`. Observe `Admin login failed: HTTP 401`.

**Expected Counterexamples:**
- `activateUser` / `activateUserViaAdmin` captured URL = `/api/v1/admin/users/...` instead of `/api/auth/admin/users/...`
- `main()` throws `"Admin login failed: HTTP 401"` when admin is not pre-activated

### Fix Checking

**Goal:** Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode — Bug A:**
```
FOR ALL userId IN SEED_USERS.map(u => u.id) DO
  capturedUrl := intercept(activateUser(token, userId))
  ASSERT capturedUrl = `/api/auth/admin/users/${userId}/status`
END FOR
```

**Pseudocode — Bug B:**
```
GIVEN admin.status = PENDING_VERIFICATION in DB
WHEN bootstrapAdminActivation() runs
THEN prisma.user.status for admin = ACTIVE
AND loginAdmin() returns a valid token
```

### Preservation Checking

**Goal:** Verify that for all inputs where the bug condition does NOT hold, behavior is unchanged.

**Pseudocode:**
```
FOR ALL operations WHERE NOT isBugConditionA AND NOT isBugConditionB DO
  ASSERT fixedCode(operation) = originalCode(operation)
END FOR
```

**Testing Approach:** Property-based testing is recommended for preservation because:
- It generates many random user IDs, request bodies, and sequences to verify nothing outside activation paths changed
- It catches edge cases (wallet top-up for zero-target users, idempotent registration on 409, etc.)

**Test Cases:**
1. **Register preservation:** Verify `POST /api/auth/register` still returns 201 or 409 after fix
2. **Login preservation:** Verify `POST /api/auth/login` still returns `accessToken` for active users after fix
3. **Wallet top-up preservation:** Verify `ensureWalletBalance` still calls `/api/wallet/wallets/:id/credit` correctly
4. **`loginAs()` self-repair path:** Verify `activateUserViaAdmin` is still called when login returns a locked-account message

### Unit Tests

- Test that `activateUser(token, userId)` constructs URL `/api/auth/admin/users/${userId}/status`
- Test that `activateUserViaAdmin(token, userId)` constructs URL `/api/auth/admin/users/${userId}/status`
- Test that `bootstrapAdminActivation()` calls `prisma.user.update` with `{ status: 'ACTIVE' }` for the admin ID
- Test edge cases: `activateUser` throws when response is not 2xx (unchanged behavior)

### Property-Based Tests

- Generate random `userId` strings and verify the constructed URL always contains `/api/auth/admin/users/` prefix (Fix A)
- Generate random seed states (various users active/inactive) and verify `main()` always calls `bootstrapAdminActivation()` before the loop (Fix B)
- Generate random non-activation operations and verify their outbound URLs are unchanged by the fix (Preservation)

### Integration Tests

- Run `ts-node scripts/seed-e2e-users.ts` against the full monolith; assert exit code 0 and "Seed complete." output
- Run live E2E test suite with `RUN_LIVE_E2E=true`; assert `unlockTestUsers()` completes without throwing
- Verify admin can log in immediately after seed runs (confirms Fix B)
- Verify non-admin user activation via `loginAs()` self-repair still works after Fix A
