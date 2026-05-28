# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - UserRegistered.v1 Not Handled
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — publish `UserRegistered.v1` with a full payload and assert `prisma.user_User.upsert` is called
  - Test that publishing `UserRegistered.v1` triggers `prisma.user_User.upsert` with `id = payload.userId`, `email = payload.email`, `status = PENDING_VERIFICATION`, `passwordHash = ''`
  - Run test on UNFIXED code — `prisma.user_User.upsert` is never called because no subscription for `UserRegistered.v1` exists in `AuthEventHandlers.setupSubscriptions()`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Document counterexamples found: `prisma.user_User.upsert` not called when `UserRegistered.v1` is published
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Auth↔User Sync Flows Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `AuthLoginSuccess` calls `prisma.user_User.update` with `lastLoginAt` and `failedLoginAttempts: 0` on unfixed code
  - Observe: `AuthLoginFailed` calls `prisma.user_User.update` with incremented `failedLoginAttempts` on unfixed code
  - Observe: `AuthTwoFactorEnabled` calls `prisma.user_User.update` with `twoFactorEnabled: true` on unfixed code
  - Observe: `AuthTwoFactorDisabled` calls `prisma.user_User.update` with `twoFactorEnabled: false, twoFactorSecret: null` on unfixed code
  - Write property-based tests: for all non-`UserRegistered.v1` auth events, the existing update handlers produce the same results as before the fix
  - Verify tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 3. Fix for missing UserRegistered.v1 handler in AuthEventHandlers

  - [x] 3.1 Implement the fix
    - Add `AuthUserRegisteredPayload` interface with `userId?`, `publicCode?`, `email?`, `role?`, `profile?: { firstName?, lastName?, phoneNumber? }`
    - Add `asUserRegistered` parser following the same defensive pattern as `asLoginSuccess`, `asLoginFailed`, `asTwoFactor`
    - Add `mapRole` helper that maps string role to `User_UserRole` enum (defaults to `User_UserRole.BUYER` for unknown roles)
    - Add `eventBus.subscribe('UserRegistered.v1', ...)` in `setupSubscriptions()` with early return guard if `!payload.userId`
    - Implement `prisma.user_User.upsert` with `where: { id: payload.userId }`, `create` including all fields, `update` with only non-destructive fields (never overwrite `passwordHash`)
    - _Bug_Condition: isBugCondition(X) where X.entryPoint = "POST /api/auth/register" AND eventBus.getSubscriberCount("UserRegistered.v1") = 0_
    - _Expected_Behavior: prisma.user_User.upsert called with id=userId, email, publicCode, passwordHash='', role=mapRole(role), status=PENDING_VERIFICATION, firstName/lastName/phoneNumber from profile or null_
    - _Preservation: AuthLoginSuccess, AuthLoginFailed, AuthTwoFactorEnabled, AuthTwoFactorDisabled handlers remain completely unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - UserRegistered.v1 Creates User_User Record
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Auth↔User Sync Flows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
