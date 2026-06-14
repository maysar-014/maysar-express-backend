# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Wrong Activation Path (A) + Admin Bootstrap Deadlock (B)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist
  - **Scoped PBT Approach**: For Bug A, scope the property to the concrete failing case — intercept the URL built by `activateUser` / `activateUserViaAdmin` and assert it contains `/api/v1/admin/`; this passes on unfixed code, confirming the wrong path is present. For Bug B, assert that `main()` never calls `loginAdmin()` before the admin row is active.
  - **Bug A test (seed script):** Stub `requestJson` in `scripts/seed-e2e-users.ts`; call `activateUser('token', 'usr_ADMIN000000000000000000001')`; assert captured URL equals `/api/v1/admin/users/usr_ADMIN000000000000000000001/status` — this assertion PASSES on unfixed code (confirming the bug path is present)
  - **Bug A test (live-api):** Stub `requestJson` in `tests/e2e/helpers/live-api.ts`; call `activateUserViaAdmin('token', 'usr_ADMIN000000000000000000001')`; assert captured URL equals `/api/v1/admin/users/usr_ADMIN000000000000000000001/status` — same
  - **Bug B test:** Verify that in the unfixed `main()`, `loginAdmin()` is invoked inside the loop for the admin user before any Prisma direct-write activates the admin — confirm circular dependency exists by tracing call order
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Bug A path assertions PASS (path is wrong), Bug B order check confirms circular dependency — both confirm bugs exist before fix
  - Document counterexamples: e.g. `activateUser` builds `/api/v1/admin/users/...` instead of `/api/auth/admin/users/...`; `loginAdmin()` is called while admin `status = PENDING_VERIFICATION`
  - Mark task complete when tests are written, run, and failures/confirmations are documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Activation Seed Behaviors Are Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run unfixed code with non-buggy inputs and record actual behavior
  - **Observe on unfixed code (non-activation paths):**
    - `registerUser(user)` → `POST /api/auth/register` returns 201 or 409
    - `loginUser(activeUser)` → `POST /api/auth/login` returns 200 with `accessToken`
    - `ensureWalletBalance(adminToken, userId, target)` → `GET /api/wallet/wallets/:id/balance` then `POST /api/wallet/wallets/:id/credit`
    - `loginAs(nonAdminUser)` returns a valid access token for an already-active user
    - `getAdminToken()` caches after first call — second call returns same token without re-requesting
  - **Write property-based tests capturing observed behavior:**
    - For all SEED_USERS: `registerUser(user)` constructed URL always equals `/api/auth/register` (never altered by fix)
    - For all SEED_USERS with role != 'system': `loginUser` sends to `/api/auth/login` (path unchanged)
    - For all users with `walletTarget > 0`: `ensureWalletBalance` sends credit to `/api/wallet/wallets/${userId}/credit`
    - `loginAs()` self-repair path (locked non-admin): `activateUserViaAdmin` is still invoked (though URL will change after fix — test this path exists, not the URL)
  - Verify all preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behaviors to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for wrong activation path and admin bootstrap ordering

  - [x] 3.1 Correct activation path in `scripts/seed-e2e-users.ts` — `activateUser()`
    - In `activateUser()`, change the request path from `/api/v1/admin/users/${userId}/status` to `/api/auth/admin/users/${userId}/status`
    - No other changes to `activateUser` are needed
    - _Bug_Condition: isBugConditionA — request.method = 'PATCH' AND request.path matches `/api/v1/admin/users/{userId}/status` AND target is monolith_
    - _Expected_Behavior: activateUser sends PATCH to `/api/auth/admin/users/${userId}/status` and receives HTTP 2xx_
    - _Preservation: All other requestJson calls in seed-e2e-users.ts (/api/auth/register, /api/auth/login, /api/wallet/...) are unaffected_
    - _Requirements: 2.1_

  - [x] 3.2 Correct activation path in `tests/e2e/helpers/live-api.ts` — `activateUserViaAdmin()`
    - In `activateUserViaAdmin()`, change the request path from `/api/v1/admin/users/${userId}/status` to `/api/auth/admin/users/${userId}/status`
    - No other changes to `activateUserViaAdmin` are needed
    - _Bug_Condition: isBugConditionA — same path mismatch as 3.1 but in the live-api helper_
    - _Expected_Behavior: activateUserViaAdmin sends PATCH to `/api/auth/admin/users/${userId}/status` and receives HTTP 2xx_
    - _Preservation: loginAs(), getAdminToken(), requestJson, authHeader, buildWalletMutationRequest and all other helpers in live-api.ts remain unchanged_
    - _Requirements: 2.2_

  - [x] 3.3 Add `bootstrapAdminActivation()` helper and call it in `main()` — `scripts/seed-e2e-users.ts`
    - Add a new `bootstrapAdminActivation()` async function that calls `prisma.auth_User.update({ where: { id: SEED_USERS[0].id }, data: { status: 'ACTIVE' } })` — uses `Auth_UserStatus` enum value `'ACTIVE'`
    - In `main()`: call `await registerUser(SEED_USERS[0])` first, then immediately call `await bootstrapAdminActivation()` before the loop begins
    - The existing loop remains unchanged — the `activateUser(await loginAdmin(), user.id)` call for the admin inside the loop becomes an idempotent no-op once the admin is already active
    - Verify `SEED_USERS[0].id` is `'usr_ADMIN000000000000000000001'` (the system/admin user)
    - _Bug_Condition: isBugConditionB — seedState.currentUser.id = admin AND admin.status = PENDING_VERIFICATION AND loginAdmin() called via HTTP before DB activation_
    - _Expected_Behavior: bootstrapAdminActivation() sets admin status = ACTIVE via direct Prisma write before any HTTP calls to loginAdmin(); loginAdmin() returns valid token on first call_
    - _Preservation: All non-admin user seeding (buyer, seller, supplier, courier, enabler) flows through the loop unchanged_
    - _Requirements: 2.3_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Activation Requests Use Correct Monolith Path
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior: Bug A path assertions should now FAIL (the wrong path `/api/v1/admin/` is gone); invert the assertion to confirm the fix
    - **EXPECTED OUTCOME**: `activateUser` and `activateUserViaAdmin` now build `/api/auth/admin/users/${userId}/status`; Bug B order check confirms `bootstrapAdminActivation()` runs before the loop
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Activation Seed Behaviors Are Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - **EXPECTED OUTCOME**: All preservation tests PASS — register, login, wallet, product seed, loginAs, getAdminToken paths all unchanged
    - Confirm no regressions in any non-activation behavior

- [x] 4. Verify seed script exits cleanly
  - Run `ts-node scripts/seed-e2e-users.ts` (or `npx ts-node scripts/seed-e2e-users.ts`) against the running monolith with `E2E_BASE_URL` pointing to the local or staging instance
  - **EXPECTED OUTCOME**: Script prints "Seed complete." and exits with status code 0 — no `HTTP 404` errors, no "Admin login failed" errors
  - Verify each user line prints `✓ registered and logged in <role>: <email>` without exceptions
  - Confirm admin user is the first line logged and that subsequent users (buyer, seller, etc.) are activated successfully using the admin token obtained after the Prisma bootstrap
  - _Requirements: 2.3_

- [x] 5. Checkpoint — Ensure all tests pass
  - Re-run the full unit test suite covering `seed-e2e-users.ts` and `live-api.ts` — confirm all pass
  - Re-run preservation property tests — confirm no regressions
  - Confirm seed script exits with code 0 (task 4 outcome)
  - Ask the user if any questions arise before closing the spec
