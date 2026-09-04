# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Forgot Password Silent Skip + Reset Password Silent Discard
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples demonstrating both root causes on the UNFIXED code
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Write the following scoped property-based tests in `services/auth-service/src/application/use-cases/__tests__/bug-condition.test.ts`:
    - **Sub-test A — Bug 1: findByEmail null causes silent skip**: Construct a `ForgotPasswordInput` with a valid email. Mock `userRepository.findByEmail` → `null` and `userRepository.emailExists` → `true`. Assert that `passwordResetRepository.create` is called (expected behavior from design). On UNFIXED code this assertion FAILS because the `if (user)` guard silently skips the token block.
    - **Sub-test B — Bug 2: passwordHash omitted from save() payload**: Construct a valid `ResetPasswordInput` with a good token. Mock `passwordResetRepository.findByToken` → a valid unexpired record, `userRepository.findById` → a mock user object. Spy on `userRepository.save`. After `ResetPasswordUseCase.execute()` returns `{ success: true }`, assert that the captured `save()` argument contains a `passwordHash` property (expected behavior). On UNFIXED code this assertion FAILS because `UserServiceRepository.save()` only syncs login-tracking fields.
  - Use `fast-check` to generate random valid email strings for Sub-test A to confirm the skip is not input-specific
  - Use `fast-check` to generate random valid password strings (≥8 chars) for Sub-test B to confirm the hash is always dropped
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Both sub-tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., "`passwordResetRepository.create` call count = 0 when `findByEmail` returns null"; "`save()` argument lacks `passwordHash` key")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Bug-Condition Paths Produce Identical Responses
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for all inputs where `isBugCondition_ForgotPassword` and `isBugCondition_ResetPassword` return false
  - Write property-based preservation tests in `services/auth-service/src/application/use-cases/__tests__/preservation.test.ts`:
    - **Preservation A — Non-existent email stays silent**: For any random email string where `userRepository.findByEmail` → `null` and `userRepository.emailExists` → `false`, assert `ForgotPasswordUseCase.execute()` returns `{ success: true }` with no `passwordResetRepository.create` call and no `emailService.sendPasswordResetEmail` call. Observe UNFIXED code returns `{ success: true }` — this PASSES and sets the baseline.
    - **Preservation B — Expired token rejected**: For all valid-format tokens where `resetRecord.expiresAt < new Date()`, assert response is `{ success: false, message: "This reset token has expired" }`. Verify on UNFIXED code — this PASSES.
    - **Preservation C — Used token rejected**: For all tokens where `resetRecord.used === true`, assert response is `{ success: false, message: "This reset token has already been used" }`. Verify on UNFIXED code — this PASSES.
    - **Preservation D — Password mismatch rejected**: For any random password pair where `newPassword !== confirmPassword` and both are ≥8 chars, assert response is `{ success: false, message: "Passwords do not match" }`. Verify on UNFIXED code — this PASSES.
    - **Preservation E — Short password rejected**: For any random string with length < 8, assert response is `{ success: false, message: "Password must be at least 8 characters long" }`. Verify on UNFIXED code — this PASSES.
    - **Preservation F — save() login-event path unchanged**: For any login-event user object containing `failedLoginAttempts`, `lockoutUntil`, and `lastLoginAt` (but no `passwordHash`), spy on `userServiceClient.updateUser`. Assert the captured update payload contains only login-tracking fields and does NOT contain `passwordHash`. Verify on UNFIXED code — this PASSES (confirming the auth-path of `save()` only syncs login fields today and must remain so after the fix).
  - Use `fast-check` to generate random non-existent emails (Preservation A), random expired timestamps (Preservation B), random password pairs that don't match (Preservation D), and random short strings (Preservation E)
  - Verify ALL preservation tests PASS on UNFIXED code before proceeding
  - **EXPECTED OUTCOME**: All six preservation sub-tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix for forgot-password and reset-password silent failures

  - [x] 3.1 Verify `UserServiceClient.updatePassword` exists and routes correctly
    - File: `services/auth-service/src/infrastructure/clients/user-service.client.ts`
    - Confirm `updatePassword(userId: string, newPasswordHash: string): Promise<void>` is present (it is — already calls `updatePassword` from the user-service facade)
    - Confirm the facade's `updatePassword` delegates to `PrismaUserRepository.updatePassword`, which writes `passwordHash` and `passwordChangedAt` atomically
    - No code change required if already present; add a note confirming the path is verified
    - _Requirements: 2.3, 2.4_

  - [x] 3.2 Fix `ForgotPasswordUseCase` — surface findByEmail null for existent emails
    - File: `services/auth-service/src/application/use-cases/forgot-password.use-case.ts`
    - Replace the bare `if (user) { ... } else { logger.info(...) }` block with a two-step guard:
      1. If `user` is null, call `await this.userRepository.emailExists(normalizedEmail)`
      2. If `emailExists` returns `true` → email is registered but lookup failed → log error and throw `new Error('User lookup failed for existing account')` (PII hash miss or schema fallback failure is an infrastructure error, not a "no account" path)
      3. If `emailExists` returns `false` → genuine non-existent email → preserve the current `logger.info` and return `{ success: true, message: ... }` unchanged (security by design)
    - The `if (user)` token/email block remains completely unchanged
    - _Bug_Condition: `emailExistsInUserService(X.email) = true AND UserServiceRepository.findByEmail(X.email) = null`_
    - _Expected_Behavior: `passwordResetRepository.create()` called with correct `userId`; `emailService.sendPasswordResetEmail()` dispatched; log line `[AuthService] Password reset token generated` emitted_
    - _Preservation: Non-existent email path returns `{ success: true }` with no token or email — behavior byte-for-byte identical to current code_
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 3.3 Fix `ResetPasswordUseCase` — call `userServiceClient.updatePassword` instead of `userRepository.save`
    - File: `services/auth-service/src/application/use-cases/reset-password.use-case.ts`
    - Replace `(user as any).passwordHash = passwordHash` with `user.changePassword(passwordHash)` to use the domain method
    - Add `UserServiceClient` as a third constructor dependency: `constructor(private readonly userRepository: IUserRepository, private readonly passwordResetRepository: IPasswordResetRepository, private readonly userServiceClient: UserServiceClient) {}`
    - Replace `await this.userRepository.save(user)` with `await this.userServiceClient.updatePassword(user.id, passwordHash.toString())` — this routes directly to `PrismaUserRepository.updatePassword` which writes `passwordHash` and `passwordChangedAt`
    - Keep `await this.passwordResetRepository.markAsUsed(resetRecord.id)` unchanged
    - Keep all error-path returns (`expired`, `used`, `mismatch`, `too-short`) completely unchanged
    - _Bug_Condition: `tokenIsValid(X.token) = true AND updatePayloadSentToUserService does NOT contain 'passwordHash'`_
    - _Expected_Behavior: `userServiceClient.updatePassword(user.id, passwordHash.toString())` called with correct hash; `storedPasswordHash(userId) = hash(newPassword)`; returns `{ success: true }`_
    - _Preservation: All `{ success: false, message: "..." }` error responses remain byte-for-byte identical; `passwordResetRepository.markAsUsed()` still called on success_
    - _Requirements: 2.3, 2.4, 2.5, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.4 Wire `UserServiceClient` into `ResetPasswordUseCase` in DI root
    - File: `services/auth-service/index.ts`
    - Update the `ResetPasswordUseCase` instantiation line from:
      `new ResetPasswordUseCase(userRepository, passwordResetRepository)`
      to:
      `new ResetPasswordUseCase(userRepository, passwordResetRepository, userServiceClient)`
    - `userServiceClient` is already declared in scope (line: `const userServiceClient = getUserServiceClient()`)
    - _Requirements: 2.3, 2.4_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Forgot Password Token Dispatched + Password Hash Persisted
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms both bug conditions are resolved:
      - Sub-test A: `passwordResetRepository.create` is called when `findByEmail` returns null for a confirmed-existent email
      - Sub-test B: `userServiceClient.updatePassword` is called with the correct hash (note: the spy target changes from `userRepository.save` to `userServiceClient.updatePassword` after the fix — update the spy in Sub-test B accordingly if needed)
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Both sub-tests PASS (confirms both bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Bug-Condition Paths Produce Identical Responses
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all six preservation sub-tests from step 2
    - **EXPECTED OUTCOME**: All six preservation sub-tests PASS (confirms no regressions)
    - Pay particular attention to Preservation A (non-existent email still returns `{ success: true }`) and Preservation F (`save()` auth-state path still only syncs login fields)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full auth-service test suite targeting the new test files: `npx jest --testPathPattern="bug-condition|preservation" --passWithNoTests` from the workspace root (or equivalent `node scripts/testing/run-jest-projects.js` for the auth-service project)
  - Confirm Sub-test A and Sub-test B from task 1 both PASS
  - Confirm all six preservation sub-tests from task 2 PASS
  - Confirm no pre-existing auth-service tests have regressed (re-run `__tests__/forgot-password.use-case.test.ts` and `__tests__/reset-password.use-case.test.ts`)
  - Ensure all tests pass; ask the user if questions arise
