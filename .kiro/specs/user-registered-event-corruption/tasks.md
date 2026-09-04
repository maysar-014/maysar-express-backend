# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Status and Role Corruption on Re-delivery
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the `update` clause unconditionally overwrites `status` and `role`
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to concrete failing cases
  - Add `findUnique` mock to `prisma.user_User` in the Jest mock at the top of the test file:
    - `findUnique: jest.fn()` alongside the existing `update` and `upsert` mocks
  - Also add `(prisma.user_User.findUnique as jest.Mock).mockResolvedValue(null)` to the `beforeEach` default setup
  - Write exploration test cases in `auth-event-handlers.test.ts` under a describe block `'Bug Condition Exploration (Property 1)'`:
    - **Case A — Status downgrade**: mock `findUnique` to return `{ status: 'ACTIVE' }`; deliver `UserRegistered.v1` with a valid payload; capture `upsert.mock.calls[0][0].update`; assert `update.status` is NOT `'PENDING_VERIFICATION'` — on unfixed code this will FAIL because the `update` clause always sets `status: PENDING_VERIFICATION`
    - **Case B — Role clobber (absent role)**: mock `findUnique` to return `{ status: 'ACTIVE', role: 'SYSTEM' }`; deliver event with no `role` field; assert `update.role` is NOT `'BUYER'` — on unfixed code `mapRole(undefined)` returns `BUYER`, confirming the bug
    - **Case C — Combined state**: existing record has `status: 'ACTIVE'` and `role: 'SYSTEM'`; event payload has no `role`; assert both `update.status !== 'PENDING_VERIFICATION'` AND `update.role !== 'BUYER'` in a single counterexample
  - Run test on UNFIXED code: `npx jest auth-event-handlers --no-coverage --testPathPattern="auth-event-handlers" --run 2>&1`
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves both corruption bugs exist)
  - Document counterexamples found, e.g.:
    - `update.status = 'PENDING_VERIFICATION'` when existing status was `ACTIVE`
    - `update.role = 'BUYER'` when existing role was `SYSTEM` and payload lacked `role`
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - New Registrations and Other Handlers Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe behavior on UNFIXED code for non-buggy inputs
  - Add `findUnique` mock support to `prisma.user_User` if not already done in task 1
  - Write preservation test cases in `auth-event-handlers.test.ts` under a describe block `'Preservation (Property 2)'`:
    - **C.3 — Status on new record (create branch)**: mock `findUnique` returning `null` (no existing record); deliver `UserRegistered.v1`; assert `upsert.create.status = 'PENDING_VERIFICATION'`
    - **C.7 — Role default BUYER on create when payload.role absent**: mock `findUnique` returning `null`; deliver event with no `role`; assert `upsert.create.role = 'BUYER'`
    - **C.8 — Create branch PII fields**: mock `findUnique` returning `null`; deliver event with `email: 'test@example.com'`; assert `upsert.create.email = 'encrypted:test@example.com'` and `upsert.create.passwordHash = ''`
    - **C.9 — AuthLoginSuccess unchanged**: deliver `AuthLoginSuccess`; assert `user_User.update` called with `failedLoginAttempts: 0` and `lockoutUntil: null`
    - **C.10 — AuthLoginFailed unchanged**: deliver `AuthLoginFailed` with `failedLoginAttempts: 3`; assert `user_User.update` called with `failedLoginAttempts: 3`
    - **C.11 — AuthTwoFactorEnabled unchanged**: deliver `AuthTwoFactorEnabled`; assert `user_User.update` called with `twoFactorEnabled: true`
    - **C.12 — AuthTwoFactorDisabled unchanged**: deliver `AuthTwoFactorDisabled`; assert `user_User.update` called with `twoFactorEnabled: false, twoFactorSecret: null`
  - Observe behavior on unfixed code: mock `findUnique` returning `null` for new-record tests (the `create` path is unaffected by the bug)
  - Run tests on UNFIXED code to verify they all PASS (confirms baseline behavior to preserve)
  - **EXPECTED OUTCOME**: All preservation tests PASS on unfixed code
  - Mark task complete when tests are written, run, and all pass on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for UserRegistered.v1 update clause corruption

  - [x] 3.1 Implement the fix in `auth-event-handlers.ts`
    - Add `findUnique: jest.fn()` to the `user_User` section of the Prisma mock in the test file (if not already added in task 1 or 2)
    - In `auth-event-handlers.ts`, inside the `UserRegistered.v1` subscriber, add a pre-read before the upsert:
      ```typescript
      const existing = await prisma.user_User.findUnique({
        where: { id: payload.userId },
        select: { status: true }
      });
      const statusIsActive = existing?.status === User_UserStatus.ACTIVE;
      ```
    - Replace the existing `update` clause with the guarded version:
      ```typescript
      update: {
        publicCode: payload.publicCode ?? null,
        ...(payload.role ? { role: mapRole(payload.role) } : {}),
        ...(statusIsActive ? {} : { status: User_UserStatus.PENDING_VERIFICATION })
      }
      ```
    - The `create` clause and all other handlers remain completely unchanged
    - Add `'ACTIVE': 'ACTIVE'` to the `User_UserStatus` mock in the test file so `statusIsActive` evaluates correctly
    - _Bug_Condition: isBugCondition(X) where existing record has `status = ACTIVE` OR `role = SYSTEM`_
    - _Expected_Behavior: `update` omits `status` when existing is `ACTIVE`; omits `role` when `payload.role` is absent or empty_
    - _Preservation: `create` branch, PII logic, index creation, and all other handlers unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Add fix-checking unit tests (C.1, C.2, C.4, C.5, C.6) and verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Status and Role Preserved on Re-delivery
    - **IMPORTANT**: Re-run the SAME exploration tests from task 1 — do NOT write new tests
    - Also add fix-checking unit tests in a describe block `'Fix Checking (C.1–C.6)'`:
      - **C.1 — Status NOT downgraded when existing is ACTIVE**: mock `findUnique` returning `{ status: 'ACTIVE' }`; deliver event; assert `upsert.update` does NOT contain `status: 'PENDING_VERIFICATION'`
      - **C.2 — Status written when existing is PENDING**: mock `findUnique` returning `{ status: 'PENDING_VERIFICATION' }`; deliver event; assert `upsert.update.status = 'PENDING_VERIFICATION'`
      - **C.4 — Role preserved when payload.role absent**: mock `findUnique` returning `{ status: 'ACTIVE' }`; deliver event without `role`; assert the `update` argument does NOT contain a `role` key
      - **C.5 — Role = SYSTEM when payload.role = 'system'**: mock `findUnique` returning `{ status: 'ACTIVE' }`; deliver event with `role: 'system'`; assert `upsert.update.role = 'SYSTEM'`
      - **C.6 — Role = BUYER when payload.role = 'buyer'**: mock `findUnique` returning `{ status: 'ACTIVE' }`; deliver event with `role: 'buyer'`; assert `upsert.update.role = 'BUYER'`
    - Run all tests: `npx jest auth-event-handlers --no-coverage --run 2>&1`
    - **EXPECTED OUTCOME**: Exploration tests from task 1 now PASS (confirms bug is fixed); fix-checking tests PASS
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - New Registrations and Other Handlers Unchanged
    - **IMPORTANT**: Re-run the SAME preservation tests from task 2 — do NOT write new tests
    - Run the full test suite for the file: `npx jest auth-event-handlers --no-coverage --run 2>&1`
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - Confirm C.3, C.7, C.8, C.9, C.10, C.11, C.12 all still pass after the fix

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the complete test suite: `npx jest auth-event-handlers --no-coverage --run 2>&1`
  - All tests must pass: exploration (Property 1), preservation (Property 2), fix-checking (C.1–C.6), and pre-existing tests (5.1–5.5)
  - Verify no TypeScript errors: `npx tsc --noEmit -p services/user-service/tsconfig.json 2>&1`
  - Ensure all tests pass; ask the user if questions arise.
