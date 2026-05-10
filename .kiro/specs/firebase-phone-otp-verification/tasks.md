# Implementation Plan: Firebase Phone OTP Verification

## Overview

Implement phone number verification via Firebase Phone Authentication within the `auth-service`. The frontend handles OTP delivery and collection using the Firebase Client SDK; the backend validates the resulting Firebase ID token, cross-checks the phone number claim, and updates `Auth_User.isPhoneVerified`. A reusable `requirePhoneVerified` middleware gates high-trust actions such as COD orders.

The implementation follows the existing layered architecture: domain errors → infrastructure service → application use cases → API controller → routes → wired into the auth-service index.

## Tasks

- [x] 1. Add `phoneNumber` and `isPhoneVerified` fields to the `Auth_User` Prisma model and run migration
  - In `prisma/schema.prisma`, add `phoneNumber String?` and `isPhoneVerified Boolean @default(false)` to the `Auth_User` model (the `auth_user_sync` table)
  - Note: these fields already exist on the `User` model (`auth_users` table); this task adds them to `Auth_User` (`auth_user_sync` table) which is currently missing them
  - Run `npx prisma migrate dev --name add-phone-verification-to-auth-user-sync` to generate and apply the migration
  - Run `npx prisma generate` to regenerate the Prisma client
  - _Requirements: 1.3, 2.7, 3.1_

- [x] 2. Create domain error types for phone verification
  - Create `services/auth-service/src/domain/errors/phone-verification.errors.ts`
  - Define and export the following typed error classes, each extending `Error` with a `name` property set to the class name:
    - `InvalidPhoneNumberError(phone: string)` — for E.164 format violations
    - `InvalidFirebaseTokenError(reason: string)` — for expired, malformed, or revoked Firebase tokens
    - `TokenMissingPhoneClaimError()` — for decoded tokens that lack a `phone_number` claim
    - `PhoneNumberMismatchError()` — for tokens whose `phone_number` claim does not match the stored value
    - `MissingFirebaseTokenError()` — for requests missing the `firebaseIdToken` body field
  - _Requirements: 1.2, 2.2, 2.4, 2.6, 2.9, 7.3_

- [x] 3. Implement `FirebaseAdminService` singleton
  - Create `services/auth-service/src/infrastructure/services/firebase-admin.service.ts`
  - Define `IFirebaseAdminService` interface with `verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken>`
  - Implement `FirebaseAdminService` as a singleton (static `getInstance()` method) that initializes `firebase-admin` once using `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_CLIENT_EMAIL` environment variables
  - Guard against double-initialization by checking `admin.apps.length === 0` before calling `admin.initializeApp()`
  - Expose `verifyIdToken` that delegates to `admin.auth(this.app).verifyIdToken(idToken)`
  - _Requirements: 2.1, 5.1_

- [x] 4. Implement `InitiatePhoneVerificationUseCase`
  - Create `services/auth-service/src/application/use-cases/initiate-phone-verification.use-case.ts`
  - Define `InitiatePhoneVerificationInput { userId: string; phoneNumber: string }` and `InitiatePhoneVerificationResult { success: boolean; message: string }`
  - Constructor accepts `userRepository: IUserRepository` and `logger: Logger`
  - Implement `execute()` with the following steps:
    1. Validate `phoneNumber` against E.164 regex `/^\+[1-9]\d{6,14}$/`; throw `InvalidPhoneNumberError` on failure
    2. Find `Auth_User` by `userId` via `userRepository.findById()`; throw `UserNotFoundError` if absent
    3. Update `Auth_User.phoneNumber = input.phoneNumber` and `Auth_User.isPhoneVerified = false`
    4. Persist via `userRepository.save()`
    5. Emit audit log: `{ action: 'PHONE_OTP_INITIATED', userId, phoneNumber: maskPhone(phoneNumber), timestamp: new Date().toISOString() }`
    6. Return `{ success: true, message: "Phone number registered. Complete OTP verification via the Firebase client SDK." }`
  - Implement `maskPhone(phone: string): string` helper that returns `****` + last 4 digits of the numeric portion
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 7.4_

  - [ ]* 4.1 Write property test for E.164 validation (Property 1)
    - Install `fast-check` as a dev dependency: `npm install --save-dev fast-check`
    - Create `services/auth-service/src/application/use-cases/__tests__/phone-verification.property.test.ts`
    - **Property 1: E.164 Validation Accepts Only Well-Formed Phone Numbers**
    - Generate arbitrary strings with `fc.string()` and verify the validator rejects them unless they match `/^\+[1-9]\d{6,14}$/`
    - Generate valid E.164 strings using `fc.stringMatching(/^\+[1-9]\d{6,14}$/)` and verify the validator accepts all of them
    - Run at minimum 100 iterations per direction
    - Tag: `// Feature: firebase-phone-otp-verification, Property 1: E.164 Validation Accepts Only Well-Formed Phone Numbers`
    - **Validates: Requirements 1.1, 1.2**

  - [ ]* 4.2 Write property test for initiation always resetting isPhoneVerified (Property 2)
    - In the same property test file
    - **Property 2: Initiating Verification Always Resets isPhoneVerified to False**
    - Use `fc.boolean()` to generate prior `isPhoneVerified` values and `fc.stringMatching(/^\+[1-9]\d{6,14}$/)` for phone numbers
    - Mock `userRepository.findById` to return a user with the generated prior `isPhoneVerified` value
    - Assert that after `execute()`, the value passed to `userRepository.save()` always has `isPhoneVerified === false`
    - Tag: `// Feature: firebase-phone-otp-verification, Property 2: Initiating Verification Always Resets isPhoneVerified to False`
    - **Validates: Requirements 1.3, 6.1, 8.2**

  - [ ]* 4.3 Write property test for phone number round-trip storage fidelity (Property 3)
    - In the same property test file
    - **Property 3: Phone Number Round-Trip Storage Fidelity**
    - Use `fc.stringMatching(/^\+[1-9]\d{6,14}$/)` to generate valid E.164 phone numbers
    - Mock `userRepository.save` to capture the saved entity
    - Assert that the `phoneNumber` field in the saved entity is byte-for-byte identical to the input
    - Tag: `// Feature: firebase-phone-otp-verification, Property 3: Phone Number Round-Trip Storage Fidelity`
    - **Validates: Requirements 1.3, 3.1, 8.3**

  - [ ]* 4.4 Write unit tests for `InitiatePhoneVerificationUseCase`
    - Create `services/auth-service/src/application/use-cases/__tests__/initiate-phone-verification.use-case.test.ts`
    - Test cases:
      - Accepts a valid E.164 phone number and returns `{ success: true, message: "..." }`
      - Rejects a phone number missing the `+` prefix with `InvalidPhoneNumberError`
      - Rejects a phone number with fewer than 7 digits after `+` with `InvalidPhoneNumberError`
      - Rejects a phone number with more than 15 digits after `+` with `InvalidPhoneNumberError`
      - Returns `UserNotFoundError` when the user does not exist
      - Sets `isPhoneVerified = false` even when it was previously `true`
      - Emits an audit log entry with masked phone number (only last 4 digits visible)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.4_

- [x] 5. Implement `VerifyPhoneOtpUseCase`
  - Create `services/auth-service/src/application/use-cases/verify-phone-otp.use-case.ts`
  - Define `VerifyPhoneOtpInput { userId: string; firebaseIdToken: string }` and `VerifyPhoneOtpResult { success: boolean; phoneVerified: boolean }`
  - Constructor accepts `userRepository: IUserRepository`, `firebaseAdminService: IFirebaseAdminService`, and `logger: Logger`
  - Implement `execute()` with the following steps:
    1. Call `firebaseAdminService.verifyIdToken(firebaseIdToken)`; catch all errors — if the error has a Firebase `auth/` code, throw `InvalidFirebaseTokenError`; otherwise log with severity `ERROR` (including `userId` and sanitized message) and throw a generic error for HTTP 500
    2. Extract `decodedToken.phone_number`; throw `TokenMissingPhoneClaimError` if absent
    3. Find `Auth_User` by `userId`; throw `UserNotFoundError` if absent
    4. Compare `decodedToken.phone_number` vs `Auth_User.phoneNumber`; throw `PhoneNumberMismatchError` if not equal
    5. Set `Auth_User.isPhoneVerified = true`, persist via `userRepository.save()`
    6. Emit audit log: `{ action: 'PHONE_OTP_VERIFIED', userId, phoneNumber: maskPhone(phoneNumber), timestamp }`
    7. Return `{ success: true, phoneVerified: true }`
  - On any failure after step 1, emit audit log with `action: 'PHONE_OTP_FAILED'` before re-throwing
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 7.1, 7.4_

  - [ ]* 5.1 Write property test for successful verification always setting isPhoneVerified to true (Property 4)
    - In `services/auth-service/src/application/use-cases/__tests__/phone-verification.property.test.ts`
    - **Property 4: Successful Verification Always Sets isPhoneVerified to True**
    - Use `fc.boolean()` for prior `isPhoneVerified` and `fc.stringMatching(/^\+[1-9]\d{6,14}$/)` for phone numbers
    - Mock `firebaseAdminService.verifyIdToken` to return a decoded token with `phone_number` matching the stored phone
    - Assert that after `execute()`, the saved entity always has `isPhoneVerified === true`
    - Tag: `// Feature: firebase-phone-otp-verification, Property 4: Successful Verification Always Sets isPhoneVerified to True`
    - **Validates: Requirements 2.7, 8.1**

  - [ ]* 5.2 Write property test for mismatched token leaving isPhoneVerified unchanged (Property 5)
    - In the same property test file
    - **Property 5: Mismatched Token Leaves isPhoneVerified Unchanged**
    - Use `fc.tuple(fc.stringMatching(/^\+[1-9]\d{6,14}$/), fc.stringMatching(/^\+[1-9]\d{6,14}$/)).filter(([a, b]) => a !== b)` to generate distinct stored vs. token phone pairs
    - Use `fc.boolean()` for prior `isPhoneVerified`
    - Assert that `userRepository.save` is never called (no mutation occurs) when a `PhoneNumberMismatchError` is thrown
    - Tag: `// Feature: firebase-phone-otp-verification, Property 5: Mismatched Token Leaves isPhoneVerified Unchanged`
    - **Validates: Requirements 2.6, 8.4**

  - [ ]* 5.3 Write property test for audit log entries always containing required fields with masked phone (Property 8)
    - In the same property test file
    - **Property 8: Audit Log Entries Always Contain Required Fields with Masked Phone**
    - Use `fc.string({ minLength: 1 })` for `userId` and `fc.stringMatching(/^\+[1-9]\d{6,14}$/)` for phone numbers
    - Trigger each audit action (`PHONE_OTP_INITIATED`, `PHONE_OTP_VERIFIED`, `PHONE_OTP_FAILED`) and capture logger call arguments
    - Assert each entry contains `userId`, `action`, `timestamp`, and a `phoneNumber` field matching `/^\*{4}\d{4}$/`
    - Tag: `// Feature: firebase-phone-otp-verification, Property 8: Audit Log Entries Always Contain Required Fields with Masked Phone`
    - **Validates: Requirements 7.4**

  - [ ]* 5.4 Write unit tests for `VerifyPhoneOtpUseCase`
    - Create `services/auth-service/src/application/use-cases/__tests__/verify-phone-otp.use-case.test.ts`
    - Test cases:
      - Returns `{ success: true, phoneVerified: true }` when token is valid and phone numbers match
      - Throws `InvalidFirebaseTokenError` (HTTP 401) when `verifyIdToken` throws a Firebase `auth/` error
      - Throws `TokenMissingPhoneClaimError` (HTTP 422) when the decoded token has no `phone_number` claim
      - Throws `PhoneNumberMismatchError` (HTTP 409) when the token phone number does not match the stored phone number
      - Logs with severity `ERROR` and throws a generic error (HTTP 500) when `verifyIdToken` throws an unexpected non-Firebase error
      - Does NOT call `userRepository.save()` on mismatch (isPhoneVerified is not mutated)
      - Emits `PHONE_OTP_VERIFIED` audit log on success with masked phone
      - Emits `PHONE_OTP_FAILED` audit log on mismatch or token error with masked phone
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 7.1, 7.4_

- [x] 6. Implement `PhoneVerificationController`
  - Create `services/auth-service/src/api/controllers/phone-verification.controller.ts`
  - Constructor accepts `initiatePhoneVerificationUseCase: InitiatePhoneVerificationUseCase` and `verifyPhoneOtpUseCase: VerifyPhoneOtpUseCase`
  - Implement `sendOtp(req: Request, res: Response): Promise<void>`:
    - Read `userId` from `(req as any).user.userId` (set by `requireAuth`)
    - Read `phoneNumber` from `req.body.phoneNumber`; return HTTP 400 `INVALID_PHONE_NUMBER` if absent
    - Delegate to `initiatePhoneVerificationUseCase.execute()`
    - On success: return HTTP 200 `{ success: true, message: "..." }`
    - Map domain errors to HTTP responses per the error mapping table in the design
  - Implement `verifyOtp(req: Request, res: Response): Promise<void>`:
    - Read `userId` from `(req as any).user.userId`
    - Read `firebaseIdToken` from `req.body.firebaseIdToken`; return HTTP 400 `MISSING_FIREBASE_TOKEN` if absent
    - Delegate to `verifyPhoneOtpUseCase.execute()`
    - On success: return HTTP 200 `{ success: true, phoneVerified: true }`
    - Map domain errors to HTTP responses per the error mapping table in the design
  - All error responses must conform to `{ success: false, error: { code: string, message: string } }`
  - Never forward raw Firebase errors, stack traces, or token values to the client
  - _Requirements: 1.2, 1.4, 1.5, 2.2, 2.4, 2.6, 2.8, 2.9, 7.2, 7.3_

  - [ ]* 6.1 Write unit tests for `PhoneVerificationController`
    - Create `services/auth-service/src/api/controllers/__tests__/phone-verification.controller.test.ts`
    - Test cases:
      - `sendOtp` returns HTTP 200 with correct body on success
      - `sendOtp` maps `InvalidPhoneNumberError` → HTTP 400 `INVALID_PHONE_NUMBER`
      - `sendOtp` maps `UserNotFoundError` → HTTP 404 `USER_NOT_FOUND`
      - `verifyOtp` returns HTTP 200 `{ success: true, phoneVerified: true }` on success
      - `verifyOtp` maps `InvalidFirebaseTokenError` → HTTP 401 `INVALID_FIREBASE_TOKEN`
      - `verifyOtp` maps `TokenMissingPhoneClaimError` → HTTP 422 `TOKEN_MISSING_PHONE_CLAIM`
      - `verifyOtp` maps `PhoneNumberMismatchError` → HTTP 409 `PHONE_NUMBER_MISMATCH`
      - `verifyOtp` maps unexpected errors → HTTP 500 `INTERNAL_SERVER_ERROR`
      - `verifyOtp` returns HTTP 400 `MISSING_FIREBASE_TOKEN` when `firebaseIdToken` is absent from body
    - _Requirements: 1.2, 1.4, 2.2, 2.4, 2.6, 2.8, 2.9, 7.2, 7.3_

- [x] 7. Create `phone.routes.ts` and mount at `/api/v1/phone`
  - Create `services/auth-service/src/api/routes/phone.routes.ts`
  - Export `createPhoneRoutes(controller: PhoneVerificationController): Router`
  - Wire `POST /send-otp` with middleware chain: `requireAuth` → `rateLimit({ windowMs: 15 * 60 * 1000, max: 5, prefix: 'rl:phone-send-otp:' })` → `csrfValidationMiddleware` → `asyncHandler(controller.sendOtp.bind(controller))`
  - Wire `POST /verify-otp` with middleware chain: `requireAuth` → `rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'rl:phone-verify-otp:' })` → `csrfValidationMiddleware` → `asyncHandler(controller.verifyOtp.bind(controller))`
  - Follow the same import and factory-function pattern used in `auth.routes.ts` and `google-oauth.routes.ts`
  - _Requirements: 1.6, 2.10, 5.1, 5.2, 5.3_

- [x] 8. Implement `requirePhoneVerified` middleware
  - Create `services/auth-service/src/api/middleware/require-phone-verified.middleware.ts`
  - Export `requirePhoneVerified(userRepository: IUserRepository)` as a factory that returns an Express `RequestHandler`
  - The returned handler must:
    1. Read `userId` from `(req as any).user?.userId`; return HTTP 401 `UNAUTHORIZED` if absent
    2. Call `userRepository.findById(userId)` to fetch the current DB record
    3. If the user is not found or `user.isPhoneVerified` is `false`, return HTTP 403 `{ success: false, error: { code: 'PHONE_VERIFICATION_REQUIRED', message: 'Phone verification is required to perform this action. Please verify your phone number.' } }`
    4. Call `next()` only when `isPhoneVerified` is `true`
  - The middleware reads from the database on every call — never from the JWT — to ensure the check reflects the current persisted state
  - Export the middleware from `services/auth-service/src/api/middleware/index.ts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 8.1 Write property test for enforcement invariant (Property 6)
    - In `services/auth-service/src/api/middleware/__tests__/require-phone-verified.property.test.ts`
    - **Property 6: Enforcement Invariant — Unverified Users Are Always Blocked**
    - Use `fc.string({ minLength: 1 })` for `userId` values
    - Mock `userRepository.findById` to always return a user with `isPhoneVerified = false`
    - Apply the middleware to a mock request/response pair
    - Assert the response is always HTTP 403 with error code `PHONE_VERIFICATION_REQUIRED`, regardless of `userId` value
    - Tag: `// Feature: firebase-phone-otp-verification, Property 6: Enforcement Invariant — Unverified Users Are Always Blocked`
    - **Validates: Requirements 4.1, 4.2, 8.5**

  - [ ]* 8.2 Write property test for error responses never leaking sensitive data (Property 7)
    - In the same property test file
    - **Property 7: Error Responses Never Leak Sensitive Data**
    - Generate various error conditions (invalid token, mismatch, missing claim, unexpected error) and capture the HTTP response body JSON
    - Assert no response body string contains `FIREBASE_PRIVATE_KEY`, `firebaseIdToken`, `stack`, or any pattern matching Firebase internal identifiers (e.g., `auth/`)
    - Assert all error responses conform to `{ success: false, error: { code: string, message: string } }`
    - Tag: `// Feature: firebase-phone-otp-verification, Property 7: Error Responses Never Leak Sensitive Data`
    - **Validates: Requirements 7.2, 7.3**

  - [ ]* 8.3 Write unit tests for `requirePhoneVerified` middleware
    - Create `services/auth-service/src/api/middleware/__tests__/require-phone-verified.middleware.test.ts`
    - Test cases:
      - Calls `next()` when `isPhoneVerified` is `true` in the DB
      - Returns HTTP 403 `PHONE_VERIFICATION_REQUIRED` when `isPhoneVerified` is `false` in the DB
      - Returns HTTP 403 even when the JWT was issued before the phone number was updated (DB is authoritative — mock DB to return `isPhoneVerified: false` regardless of JWT content)
      - Returns HTTP 401 `UNAUTHORIZED` when no `userId` is present on the request
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Checkpoint — Ensure all tests pass
  - Run `jest --selectProjects=auth-service` and confirm all new tests pass
  - Verify no TypeScript compilation errors with `tsc --noEmit`
  - Ensure all property tests run at minimum 100 iterations without failures
  - Ask the user if any questions arise before proceeding to wiring

- [x] 10. Wire phone verification into the auth-service index
  - In `services/auth-service/index.ts`, inside the `AuthModule.initialize` function:
    - Import `FirebaseAdminService` from `./src/infrastructure/services/firebase-admin.service`
    - Import `InitiatePhoneVerificationUseCase` from `./src/application/use-cases/initiate-phone-verification.use-case`
    - Import `VerifyPhoneOtpUseCase` from `./src/application/use-cases/verify-phone-otp.use-case`
    - Import `PhoneVerificationController` from `./src/api/controllers/phone-verification.controller`
    - Import `createPhoneRoutes` from `./src/api/routes/phone.routes`
    - Instantiate the dependency graph:
      ```
      const firebaseAdminService = FirebaseAdminService.getInstance();
      const initiatePhoneVerificationUseCase = new InitiatePhoneVerificationUseCase(userRepository, logger);
      const verifyPhoneOtpUseCase = new VerifyPhoneOtpUseCase(userRepository, firebaseAdminService, logger);
      const phoneVerificationController = new PhoneVerificationController(initiatePhoneVerificationUseCase, verifyPhoneOtpUseCase);
      ```
    - Mount the phone routes on the main router: `mainRouter.use('/phone', createPhoneRoutes(phoneVerificationController))`
    - The routes will be accessible at `/api/v1/phone/send-otp` and `/api/v1/phone/verify-otp`
  - _Requirements: 1.1, 2.1, 5.1_

- [x] 11. Final checkpoint — Ensure all tests pass and feature is fully wired
  - Run `jest --selectProjects=auth-service` and confirm all tests pass (unit, property-based)
  - Verify TypeScript compiles cleanly with `tsc --noEmit`
  - Confirm the Prisma migration was applied and `npx prisma generate` was run
  - Confirm `fast-check` is listed in `devDependencies` in `package.json`
  - Ensure all 8 property tests are present and tagged with the correct feature and property number comments
  - Ask the user if any questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `fast-check` must be installed before writing property tests: `npm install --save-dev fast-check`
- The `Auth_User` model (`auth_user_sync` table) is missing `phoneNumber` and `isPhoneVerified` — Task 1 adds these fields; the `User` model (`auth_users` table) already has them
- `firebase-admin` is already in `dependencies` — no additional installation needed
- All 8 correctness properties from the design document are covered by property tests in Tasks 4.1–4.3, 5.1–5.3, 8.1–8.2
- The `requirePhoneVerified` middleware reads from the DB on every call, not from the JWT, to ensure the check reflects the current persisted state (design decision 3)
- Phone numbers in audit logs are always masked to last 4 digits — never store or log full phone numbers
- Raw Firebase errors, stack traces, and token values must never appear in HTTP responses
