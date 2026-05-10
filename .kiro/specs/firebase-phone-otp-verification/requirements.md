# Requirements Document

## Introduction

This document defines the requirements for Firebase Phone OTP Verification on the Maysar marketplace backend. The feature enables users to verify their phone number using Firebase Phone Authentication. The frontend uses the Firebase Client SDK to trigger phone auth and obtain a Firebase ID token; the backend uses the Firebase Admin SDK to verify that token and update the user's `isPhoneVerified` flag. Phone verification is a prerequisite for certain marketplace actions such as placing orders with Cash on Delivery.

---

## Glossary

- **Phone_Verification_Service**: The backend subsystem responsible for accepting Firebase ID tokens, verifying them via the Firebase Admin SDK, and updating the user's phone verification status.
- **Firebase_Admin_SDK**: The server-side Firebase library (`firebase-admin`) used to call `verifyIdToken` and validate tokens issued by Firebase Phone Authentication.
- **Firebase_ID_Token**: A short-lived JWT issued by the Firebase Client SDK after the user completes phone OTP verification on the frontend.
- **Auth_User**: The user record in the `auth_users` database table, which contains `phoneNumber`, `isPhoneVerified`, and related fields.
- **Authenticated_User**: A user who has presented a valid Maysar JWT in the `Authorization` header, identifying them by `userId`.
- **Phone_Number**: An E.164-formatted string (e.g., `+255712345678`) stored in `Auth_User.phoneNumber`.
- **OTP**: A one-time passcode delivered to the user's phone by Firebase; handled entirely by Firebase and the frontend — the backend never receives or stores raw OTP codes.
- **Rate_Limiter**: The existing Express middleware that restricts the number of requests per IP or user within a time window.
- **CSRF_Middleware**: The existing `csrfValidationMiddleware` used on state-mutating authenticated endpoints.

---

## Requirements

### Requirement 1: Initiate Phone Verification

**User Story:** As an authenticated user, I want to trigger phone verification for my account, so that the backend records which phone number I intend to verify before I complete the Firebase OTP flow on the frontend.

#### Acceptance Criteria

1. WHEN an authenticated user sends a `POST /api/auth/phone/send-otp` request with a valid `phoneNumber`, THE Phone_Verification_Service SHALL validate that the `phoneNumber` conforms to E.164 format (starts with `+`, followed by 7–15 digits).
2. IF the `phoneNumber` field is absent or does not conform to E.164 format, THEN THE Phone_Verification_Service SHALL return HTTP 400 with error code `INVALID_PHONE_NUMBER` and a descriptive message.
3. WHEN the `phoneNumber` passes validation, THE Phone_Verification_Service SHALL store or update the `phoneNumber` on the `Auth_User` record and set `isPhoneVerified` to `false`.
4. WHEN the phone number is stored, THE Phone_Verification_Service SHALL return HTTP 200 with a response body containing `{ "success": true, "message": "Phone number registered. Complete OTP verification via the Firebase client SDK." }`.
5. IF the authenticated user's account does not exist in the database, THEN THE Phone_Verification_Service SHALL return HTTP 404 with error code `USER_NOT_FOUND`.
6. THE Phone_Verification_Service SHALL apply rate limiting of at most 5 requests per phone number per 15-minute window to the `POST /api/auth/phone/send-otp` endpoint.

---

### Requirement 2: Verify Firebase Phone ID Token

**User Story:** As an authenticated user, I want to submit the Firebase ID token I received after completing OTP verification, so that the backend can confirm my phone number is genuine and mark it as verified.

#### Acceptance Criteria

1. WHEN an authenticated user sends a `POST /api/auth/phone/verify-otp` request with a `firebaseIdToken`, THE Phone_Verification_Service SHALL call `Firebase_Admin_SDK.verifyIdToken(firebaseIdToken)` to validate the token.
2. IF `verifyIdToken` throws an error (expired, malformed, or revoked token), THEN THE Phone_Verification_Service SHALL return HTTP 401 with error code `INVALID_FIREBASE_TOKEN` and a descriptive message.
3. WHEN `verifyIdToken` succeeds, THE Phone_Verification_Service SHALL extract the `phone_number` claim from the decoded token payload.
4. IF the `phone_number` claim is absent from the decoded token, THEN THE Phone_Verification_Service SHALL return HTTP 422 with error code `TOKEN_MISSING_PHONE_CLAIM`.
5. WHEN the `phone_number` claim is present, THE Phone_Verification_Service SHALL compare it against the `Auth_User.phoneNumber` stored for the authenticated user.
6. IF the `phone_number` claim does not match `Auth_User.phoneNumber`, THEN THE Phone_Verification_Service SHALL return HTTP 409 with error code `PHONE_NUMBER_MISMATCH` and a message indicating the token phone number does not match the registered phone number.
7. WHEN the `phone_number` claim matches `Auth_User.phoneNumber`, THE Phone_Verification_Service SHALL set `Auth_User.isPhoneVerified` to `true` and persist the change.
8. WHEN `isPhoneVerified` is set to `true`, THE Phone_Verification_Service SHALL return HTTP 200 with `{ "success": true, "phoneVerified": true }`.
9. IF the `firebaseIdToken` field is absent from the request body, THEN THE Phone_Verification_Service SHALL return HTTP 400 with error code `MISSING_FIREBASE_TOKEN`.
10. THE Phone_Verification_Service SHALL apply rate limiting of at most 10 requests per user per 15-minute window to the `POST /api/auth/phone/verify-otp` endpoint.

---

### Requirement 3: Phone Verification Status on User Profile

**User Story:** As an authenticated user, I want my phone verification status to be visible on my profile, so that I and the system can determine whether I have completed phone verification.

#### Acceptance Criteria

1. WHEN the authenticated user's profile is returned by any profile endpoint, THE Phone_Verification_Service SHALL include an `isPhoneVerified` boolean field reflecting the current value of `Auth_User.isPhoneVerified`.
2. WHEN a user has not yet completed phone verification, THE Phone_Verification_Service SHALL return `isPhoneVerified: false`.
3. WHEN a user has completed phone verification, THE Phone_Verification_Service SHALL return `isPhoneVerified: true`.
4. THE Phone_Verification_Service SHALL never expose the raw Firebase ID token or any Firebase internal identifiers in the profile response.

---

### Requirement 4: Phone Verification Enforcement for Restricted Actions

**User Story:** As a platform operator, I want certain marketplace actions to require a verified phone number, so that only users with confirmed identities can perform high-trust operations.

#### Acceptance Criteria

1. WHEN a user attempts to place an order with Cash on Delivery (COD) payment method, THE Phone_Verification_Service SHALL verify that `Auth_User.isPhoneVerified` is `true` before allowing the action to proceed.
2. IF `Auth_User.isPhoneVerified` is `false` and the user attempts a phone-verification-required action, THEN THE Phone_Verification_Service SHALL return HTTP 403 with error code `PHONE_VERIFICATION_REQUIRED` and a message directing the user to complete phone verification.
3. THE Phone_Verification_Service SHALL expose a reusable middleware function `requirePhoneVerified` that downstream route handlers can apply to enforce this check.
4. WHEN `requirePhoneVerified` middleware is applied to a route, THE Phone_Verification_Service SHALL read `isPhoneVerified` from the authenticated user's database record, not from the JWT payload, to ensure the check reflects the current persisted state.

---

### Requirement 5: Authentication and Authorization

**User Story:** As a platform operator, I want phone verification endpoints to require a valid Maysar session, so that unauthenticated callers cannot trigger or claim phone verifications.

#### Acceptance Criteria

1. THE Phone_Verification_Service SHALL require a valid Maysar JWT in the `Authorization: Bearer <token>` header for both `POST /api/auth/phone/send-otp` and `POST /api/auth/phone/verify-otp`.
2. IF the `Authorization` header is absent or the JWT is invalid or expired, THEN THE Phone_Verification_Service SHALL return HTTP 401 with error code `UNAUTHORIZED` before processing the request body.
3. THE Phone_Verification_Service SHALL apply `csrfValidationMiddleware` to both phone verification endpoints, consistent with other state-mutating authenticated endpoints in the auth service.

---

### Requirement 6: Phone Number Update and Re-verification

**User Story:** As an authenticated user, I want to update my phone number and re-verify it, so that my account always reflects my current phone number.

#### Acceptance Criteria

1. WHEN an authenticated user calls `POST /api/auth/phone/send-otp` with a `phoneNumber` that differs from the currently stored `Auth_User.phoneNumber`, THE Phone_Verification_Service SHALL update `Auth_User.phoneNumber` to the new value and set `Auth_User.isPhoneVerified` to `false`.
2. WHEN `Auth_User.isPhoneVerified` is reset to `false` due to a phone number update, THE Phone_Verification_Service SHALL return HTTP 200 with `{ "success": true, "message": "Phone number updated. Complete OTP verification via the Firebase client SDK." }`.
3. IF a user's `isPhoneVerified` was `true` and the phone number is updated, THE Phone_Verification_Service SHALL enforce phone-verification-required actions as blocked until the new number is verified.

---

### Requirement 7: Error Handling and Observability

**User Story:** As a developer, I want all phone verification errors to be logged and return structured error responses, so that issues can be diagnosed quickly without exposing internal details to clients.

#### Acceptance Criteria

1. WHEN `Firebase_Admin_SDK.verifyIdToken` throws an unexpected error (not an auth error), THE Phone_Verification_Service SHALL log the error with severity `ERROR`, including the `userId` and a sanitized error message, and return HTTP 500 with error code `INTERNAL_SERVER_ERROR`.
2. THE Phone_Verification_Service SHALL never include Firebase private key material, raw token values, or stack traces in HTTP error responses.
3. WHEN any phone verification endpoint returns an error, THE Phone_Verification_Service SHALL return a JSON body conforming to the structure `{ "success": false, "error": { "code": "<ERROR_CODE>", "message": "<human-readable message>" } }`, consistent with the existing auth service error format.
4. WHEN a phone verification action succeeds or fails, THE Phone_Verification_Service SHALL emit a structured audit log entry containing `userId`, `action` (`PHONE_OTP_INITIATED` or `PHONE_OTP_VERIFIED` or `PHONE_OTP_FAILED`), `phoneNumber` (last 4 digits only), and `timestamp`.

---

### Requirement 8: Property-Based Correctness Properties

**User Story:** As a developer, I want the phone verification logic to satisfy formal correctness properties, so that edge cases in token validation and state transitions are continuously verified.

#### Acceptance Criteria

1. FOR ALL valid Firebase ID tokens containing a `phone_number` claim that matches `Auth_User.phoneNumber`, THE Phone_Verification_Service SHALL transition `isPhoneVerified` from any prior state to `true` (verification idempotence: verifying an already-verified number leaves it verified).
2. FOR ALL calls to `POST /api/auth/phone/send-otp` with a new phone number, THE Phone_Verification_Service SHALL set `isPhoneVerified` to `false` regardless of the prior value (re-verification invariant).
3. FOR ALL phone number strings accepted by the `send-otp` endpoint, THE Phone_Verification_Service SHALL store the phone number exactly as provided without transformation, and the stored value SHALL match the value returned in the profile response (round-trip storage property).
4. FOR ALL Firebase ID tokens where the `phone_number` claim does not match `Auth_User.phoneNumber`, THE Phone_Verification_Service SHALL leave `isPhoneVerified` unchanged (no partial state mutation on mismatch).
5. FOR ALL requests to phone-verification-required actions where `isPhoneVerified` is `false`, THE Phone_Verification_Service SHALL return HTTP 403 with error code `PHONE_VERIFICATION_REQUIRED` (enforcement invariant).
