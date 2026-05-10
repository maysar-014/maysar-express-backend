# Design Document: Firebase Phone OTP Verification

## Overview

This document describes the technical design for the Firebase Phone OTP Verification feature on the Maysar marketplace backend. The feature allows authenticated users to verify their phone number using Firebase Phone Authentication. The frontend handles the OTP delivery and collection via the Firebase Client SDK; the backend's responsibility is to accept the resulting Firebase ID token, validate it via the Firebase Admin SDK, cross-check the phone number claim against the stored record, and update the `isPhoneVerified` flag on the `Auth_User` record.

Phone verification is a prerequisite for high-trust marketplace actions such as placing orders with Cash on Delivery (COD). A reusable `requirePhoneVerified` middleware enforces this gate on any route that needs it.

### Key Design Decisions

1. **Firebase Admin SDK as the sole verification authority** — The backend never receives or stores raw OTP codes. All OTP delivery and collection is delegated to Firebase. The backend only calls `verifyIdToken()` on the resulting Firebase ID token.
2. **Singleton `FirebaseAdminService`** — Firebase Admin must be initialized once per process. A singleton service wraps initialization and exposes `verifyIdToken`.
3. **DB-authoritative phone verification status** — `requirePhoneVerified` reads `isPhoneVerified` from the database, not from the JWT, to ensure the check always reflects the current persisted state.
4. **Phone number stored exactly as provided** — No normalization or transformation is applied to the E.164 phone number. The value stored in the DB is the value the user submitted and the value returned in the profile.
5. **Audit logging with masked phone** — All phone verification events are logged with only the last 4 digits of the phone number to avoid storing PII in logs.

---

## Architecture

The feature is implemented entirely within the `auth-service`. It follows the same layered architecture used by the existing 2FA and session features:

```
┌─────────────────────────────────────────────────────────────────┐
│                         auth-service                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Layer                                               │   │
│  │  PhoneVerificationController                             │   │
│  │  phone.routes.ts  (POST /v1/phone/send-otp,              │   │
│  │                    POST /v1/phone/verify-otp)            │   │
│  │  requirePhoneVerified middleware                         │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  Application Layer (Use Cases)                           │   │
│  │  InitiatePhoneVerificationUseCase                        │   │
│  │  VerifyPhoneOtpUseCase                                   │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  Infrastructure Layer                                    │   │
│  │  FirebaseAdminService (singleton)                        │   │
│  │  PrismaUserRepository (existing)                         │   │
│  │  logger (existing)                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow: Send OTP

```
Client
  │  POST /api/v1/phone/send-otp
  │  Authorization: Bearer <maysar-jwt>
  │  Body: { phoneNumber: "+255712345678" }
  ▼
requireAuth → csrfValidationMiddleware → rateLimit(5/15min)
  ▼
PhoneVerificationController.sendOtp()
  ▼
InitiatePhoneVerificationUseCase.execute()
  │  1. Validate E.164 format
  │  2. Find Auth_User by userId
  │  3. Update phoneNumber, set isPhoneVerified=false
  │  4. Emit audit log: PHONE_OTP_INITIATED
  ▼
HTTP 200 { success: true, message: "..." }
```

### Request Flow: Verify OTP

```
Client
  │  POST /api/v1/phone/verify-otp
  │  Authorization: Bearer <maysar-jwt>
  │  Body: { firebaseIdToken: "<firebase-jwt>" }
  ▼
requireAuth → csrfValidationMiddleware → rateLimit(10/15min)
  ▼
PhoneVerificationController.verifyOtp()
  ▼
VerifyPhoneOtpUseCase.execute()
  │  1. Call FirebaseAdminService.verifyIdToken(firebaseIdToken)
  │  2. Extract phone_number claim
  │  3. Find Auth_User by userId
  │  4. Compare phone_number claim vs Auth_User.phoneNumber
  │  5. If match: set isPhoneVerified=true, persist
  │  6. Emit audit log: PHONE_OTP_VERIFIED or PHONE_OTP_FAILED
  ▼
HTTP 200 { success: true, phoneVerified: true }
```

---

## Components and Interfaces

### 1. FirebaseAdminService

**Path:** `services/auth-service/src/infrastructure/services/firebase-admin.service.ts`

Singleton service that initializes the Firebase Admin SDK once and exposes `verifyIdToken`. Initialization uses `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_CLIENT_EMAIL` from the environment.

```typescript
import * as admin from 'firebase-admin';

export interface IFirebaseAdminService {
  verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken>;
}

export class FirebaseAdminService implements IFirebaseAdminService {
  private static instance: FirebaseAdminService;
  private app: admin.app.App;

  private constructor() {
    if (admin.apps.length === 0) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    } else {
      this.app = admin.apps[0]!;
    }
  }

  static getInstance(): FirebaseAdminService {
    if (!FirebaseAdminService.instance) {
      FirebaseAdminService.instance = new FirebaseAdminService();
    }
    return FirebaseAdminService.instance;
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    return admin.auth(this.app).verifyIdToken(idToken);
  }
}
```

### 2. InitiatePhoneVerificationUseCase

**Path:** `services/auth-service/src/application/use-cases/initiate-phone-verification.use-case.ts`

Validates the phone number, updates the `Auth_User` record, and emits an audit log entry.

```typescript
interface InitiatePhoneVerificationInput {
  userId: string;
  phoneNumber: string;
}

interface InitiatePhoneVerificationResult {
  success: boolean;
  message: string;
}

class InitiatePhoneVerificationUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly logger: Logger
  ) {}

  async execute(input: InitiatePhoneVerificationInput): Promise<InitiatePhoneVerificationResult>;
}
```

**Logic:**
1. Validate `phoneNumber` against E.164 regex: `/^\+[1-9]\d{6,14}$/`
2. Find `Auth_User` by `userId` — throw `UserNotFoundError` if absent
3. Update `Auth_User.phoneNumber = input.phoneNumber`, `Auth_User.isPhoneVerified = false`
4. Persist via `userRepository.save()`
5. Emit audit log: `{ action: 'PHONE_OTP_INITIATED', userId, phoneNumber: maskPhone(phoneNumber), timestamp }`
6. Return `{ success: true, message: "Phone number registered. Complete OTP verification via the Firebase client SDK." }`

### 3. VerifyPhoneOtpUseCase

**Path:** `services/auth-service/src/application/use-cases/verify-phone-otp.use-case.ts`

Calls Firebase Admin SDK to verify the token, cross-checks the phone number claim, and updates `isPhoneVerified`.

```typescript
interface VerifyPhoneOtpInput {
  userId: string;
  firebaseIdToken: string;
}

interface VerifyPhoneOtpResult {
  success: boolean;
  phoneVerified: boolean;
}

class VerifyPhoneOtpUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly firebaseAdminService: IFirebaseAdminService,
    private readonly logger: Logger
  ) {}

  async execute(input: VerifyPhoneOtpInput): Promise<VerifyPhoneOtpResult>;
}
```

**Logic:**
1. Call `firebaseAdminService.verifyIdToken(firebaseIdToken)` — throw `InvalidFirebaseTokenError` on failure
2. Extract `decodedToken.phone_number` — throw `TokenMissingPhoneClaimError` if absent
3. Find `Auth_User` by `userId` — throw `UserNotFoundError` if absent
4. Compare `decodedToken.phone_number` vs `Auth_User.phoneNumber` — throw `PhoneNumberMismatchError` if not equal
5. Set `Auth_User.isPhoneVerified = true`, persist via `userRepository.save()`
6. Emit audit log: `{ action: 'PHONE_OTP_VERIFIED', userId, phoneNumber: maskPhone(phoneNumber), timestamp }`
7. Return `{ success: true, phoneVerified: true }`

On any failure after step 1, emit audit log with `action: 'PHONE_OTP_FAILED'`.

### 4. PhoneVerificationController

**Path:** `services/auth-service/src/api/controllers/phone-verification.controller.ts`

```typescript
export class PhoneVerificationController {
  constructor(
    private readonly initiatePhoneVerificationUseCase: InitiatePhoneVerificationUseCase,
    private readonly verifyPhoneOtpUseCase: VerifyPhoneOtpUseCase
  ) {}

  async sendOtp(req: Request, res: Response): Promise<void>;
  async verifyOtp(req: Request, res: Response): Promise<void>;
}
```

**`sendOtp`** reads `req.user.userId` (set by `requireAuth`) and `req.body.phoneNumber`, delegates to `InitiatePhoneVerificationUseCase`, and maps domain errors to HTTP responses.

**`verifyOtp`** reads `req.user.userId` and `req.body.firebaseIdToken`, delegates to `VerifyPhoneOtpUseCase`, and maps domain errors to HTTP responses.

**Error mapping:**

| Domain Error | HTTP Status | Error Code |
|---|---|---|
| `InvalidPhoneNumberError` | 400 | `INVALID_PHONE_NUMBER` |
| `MissingFirebaseTokenError` | 400 | `MISSING_FIREBASE_TOKEN` |
| `UserNotFoundError` | 404 | `USER_NOT_FOUND` |
| `InvalidFirebaseTokenError` | 401 | `INVALID_FIREBASE_TOKEN` |
| `TokenMissingPhoneClaimError` | 422 | `TOKEN_MISSING_PHONE_CLAIM` |
| `PhoneNumberMismatchError` | 409 | `PHONE_NUMBER_MISMATCH` |
| Unexpected error | 500 | `INTERNAL_SERVER_ERROR` |

All error responses conform to the existing auth service format:
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

### 5. Phone Routes

**Path:** `services/auth-service/src/api/routes/phone.routes.ts`

```typescript
export const createPhoneRoutes = (controller: PhoneVerificationController): Router => {
  const router = Router();

  // POST /v1/phone/send-otp
  router.post(
    '/send-otp',
    requireAuth,
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5, prefix: 'rl:phone-send-otp:' }),
    csrfValidationMiddleware,
    asyncHandler(controller.sendOtp.bind(controller))
  );

  // POST /v1/phone/verify-otp
  router.post(
    '/verify-otp',
    requireAuth,
    rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'rl:phone-verify-otp:' }),
    csrfValidationMiddleware,
    asyncHandler(controller.verifyOtp.bind(controller))
  );

  return router;
};
```

Mounted in `main.ts` at `/api/v1/phone`:
```typescript
app.use('/api/v1/phone', createPhoneRoutes(phoneVerificationController));
```

### 6. requirePhoneVerified Middleware

**Path:** `services/auth-service/src/api/middleware/require-phone-verified.middleware.ts`

```typescript
export const requirePhoneVerified = (userRepository: IUserRepository) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const user = await userRepository.findById(userId);
    if (!user || !user.isPhoneVerified) {
      res.status(403).json({
        success: false,
        error: {
          code: 'PHONE_VERIFICATION_REQUIRED',
          message: 'Phone verification is required to perform this action. Please verify your phone number.'
        }
      });
      return;
    }
    next();
  };
```

The middleware reads `isPhoneVerified` from the database on every call, not from the JWT, ensuring the check reflects the current persisted state even if the JWT was issued before a phone number update.

### 7. Audit Logging Helper

**Path:** `services/auth-service/src/infrastructure/services/phone-audit.service.ts`

```typescript
type PhoneAuditAction = 'PHONE_OTP_INITIATED' | 'PHONE_OTP_VERIFIED' | 'PHONE_OTP_FAILED';

interface PhoneAuditEntry {
  action: PhoneAuditAction;
  userId: string;
  phoneNumber: string; // last 4 digits only, e.g. "****5678"
  timestamp: string;   // ISO 8601
}

const maskPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return `****${digits.slice(-4)}`;
};

const emitPhoneAuditLog = (logger: Logger, entry: PhoneAuditEntry): void => {
  logger.info('PhoneVerificationAudit', entry);
};
```

---

## Data Models

### Prisma Schema Change

The `isPhoneVerified` field already exists in the `User` model in `prisma/schema.prisma` (confirmed from the current schema). No migration is needed for this field.

```prisma
model User {
  // ... existing fields ...
  phoneNumber     String?
  isPhoneVerified Boolean @default(false)
  // ... existing fields ...
}
```

If the field is not yet present in the `Auth_User` model (the `auth_user_sync` table), it must be added there as well:

```prisma
model Auth_User {
  // ... existing fields ...
  phoneNumber     String?
  isPhoneVerified Boolean @default(false)
}
```

After any schema change, run:
```bash
npx prisma migrate dev --name add-phone-verification-fields
```

### Domain Error Types

```typescript
// services/auth-service/src/domain/errors/phone-verification.errors.ts

export class InvalidPhoneNumberError extends Error {
  constructor(phone: string) {
    super(`Phone number "${phone}" does not conform to E.164 format`);
    this.name = 'InvalidPhoneNumberError';
  }
}

export class InvalidFirebaseTokenError extends Error {
  constructor(reason: string) {
    super(`Firebase ID token is invalid or expired: ${reason}`);
    this.name = 'InvalidFirebaseTokenError';
  }
}

export class TokenMissingPhoneClaimError extends Error {
  constructor() {
    super('Firebase ID token does not contain a phone_number claim');
    this.name = 'TokenMissingPhoneClaimError';
  }
}

export class PhoneNumberMismatchError extends Error {
  constructor() {
    super('The phone number in the Firebase token does not match the registered phone number');
    this.name = 'PhoneNumberMismatchError';
  }
}
```

### IUserRepository Extension

The existing `IUserRepository` interface must expose `findById` and `save` methods that include `phoneNumber` and `isPhoneVerified`. The `PrismaUserRepository` already maps these fields from the `auth_users` table.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: E.164 Validation Accepts Only Well-Formed Phone Numbers

*For any* string, the E.164 validator SHALL accept it if and only if it matches the pattern `^\+[1-9]\d{6,14}$` (starts with `+`, followed by a non-zero digit, followed by 6–14 more digits). Strings that do not match this pattern SHALL be rejected.

**Validates: Requirements 1.1, 1.2**

### Property 2: Initiating Verification Always Resets isPhoneVerified to False

*For any* valid E.164 phone number and any prior value of `Auth_User.isPhoneVerified` (true or false), calling `InitiatePhoneVerificationUseCase` with that phone number SHALL result in `Auth_User.isPhoneVerified` being `false` after the operation completes.

**Validates: Requirements 1.3, 6.1, 8.2**

### Property 3: Phone Number Round-Trip Storage Fidelity

*For any* valid E.164 phone number string accepted by the `send-otp` endpoint, the value stored in `Auth_User.phoneNumber` SHALL be byte-for-byte identical to the value submitted in the request, and the value returned in the profile response SHALL be byte-for-byte identical to the stored value.

**Validates: Requirements 1.3, 3.1, 8.3**

### Property 4: Successful Verification Always Sets isPhoneVerified to True

*For any* Firebase ID token whose `phone_number` claim matches `Auth_User.phoneNumber` for the authenticated user, and regardless of the prior value of `Auth_User.isPhoneVerified`, calling `VerifyPhoneOtpUseCase` SHALL result in `Auth_User.isPhoneVerified` being `true` after the operation completes.

**Validates: Requirements 2.7, 8.1**

### Property 5: Mismatched Token Leaves isPhoneVerified Unchanged

*For any* Firebase ID token whose `phone_number` claim does NOT match `Auth_User.phoneNumber` for the authenticated user, calling `VerifyPhoneOtpUseCase` SHALL leave `Auth_User.isPhoneVerified` at its prior value — it SHALL NOT be mutated to either `true` or `false`.

**Validates: Requirements 2.6, 8.4**

### Property 6: Enforcement Invariant — Unverified Users Are Always Blocked

*For any* authenticated user whose `Auth_User.isPhoneVerified` is `false`, any request to a route protected by `requirePhoneVerified` SHALL receive HTTP 403 with error code `PHONE_VERIFICATION_REQUIRED`, regardless of the route, request body, or any other request attribute.

**Validates: Requirements 4.1, 4.2, 8.5**

### Property 7: Error Responses Never Leak Sensitive Data

*For any* error condition in the phone verification flow (invalid token, mismatch, missing claim, unexpected Firebase error), the HTTP response body SHALL NOT contain Firebase private key material, raw Firebase ID token values, stack traces, or any Firebase-internal identifier. The response SHALL conform to `{ success: false, error: { code: string, message: string } }`.

**Validates: Requirements 7.2, 7.3**

### Property 8: Audit Log Entries Always Contain Required Fields with Masked Phone

*For any* phone verification action (PHONE_OTP_INITIATED, PHONE_OTP_VERIFIED, PHONE_OTP_FAILED) triggered for any userId and any phone number, the emitted audit log entry SHALL contain `userId`, `action`, `timestamp`, and a `phoneNumber` field showing only the last 4 digits (masked as `****XXXX`).

**Validates: Requirements 7.4**

---

## Error Handling

### Domain Error → HTTP Response Mapping

All errors are caught in the controller layer and mapped to structured HTTP responses. The use cases throw typed domain errors; the controller never lets raw errors propagate to the client.

```
InvalidPhoneNumberError       → 400 INVALID_PHONE_NUMBER
MissingFirebaseTokenError     → 400 MISSING_FIREBASE_TOKEN
UserNotFoundError             → 404 USER_NOT_FOUND
InvalidFirebaseTokenError     → 401 INVALID_FIREBASE_TOKEN
TokenMissingPhoneClaimError   → 422 TOKEN_MISSING_PHONE_CLAIM
PhoneNumberMismatchError      → 409 PHONE_NUMBER_MISMATCH
Unexpected / unknown error    → 500 INTERNAL_SERVER_ERROR
```

### Firebase SDK Error Handling

`firebase-admin`'s `verifyIdToken` throws errors with a `code` property (e.g., `auth/id-token-expired`, `auth/argument-error`). The use case catches all errors from this call:

- If the error has a Firebase `auth/` code → wrap in `InvalidFirebaseTokenError` → HTTP 401
- If the error is unexpected (no Firebase code) → log with severity `ERROR` including `userId` and sanitized message → HTTP 500

The raw Firebase error message and stack trace are never forwarded to the client.

### Sensitive Data Protection

- Firebase private key (`FIREBASE_PRIVATE_KEY`) is never logged or included in responses
- Raw `firebaseIdToken` values are never logged
- Phone numbers in logs are always masked to last 4 digits
- Stack traces are suppressed in all HTTP error responses

---

## Testing Strategy

### Unit Tests

Unit tests cover specific examples, edge cases, and error conditions for each component. They use mocks for the Firebase Admin SDK and the user repository.

**`InitiatePhoneVerificationUseCase` unit tests:**
- Accepts a valid E.164 phone number and returns success
- Rejects a phone number missing the `+` prefix (400)
- Rejects a phone number with fewer than 7 digits after `+` (400)
- Rejects a phone number with more than 15 digits after `+` (400)
- Returns 404 when the user does not exist
- Sets `isPhoneVerified = false` even when it was previously `true`
- Emits an audit log entry with masked phone number

**`VerifyPhoneOtpUseCase` unit tests:**
- Returns success when token is valid and phone numbers match
- Returns 401 when `verifyIdToken` throws a Firebase auth error
- Returns 422 when the decoded token has no `phone_number` claim
- Returns 409 when the token phone number does not match the stored phone number
- Returns 500 when `verifyIdToken` throws an unexpected error
- Does not mutate `isPhoneVerified` on mismatch
- Emits `PHONE_OTP_VERIFIED` audit log on success
- Emits `PHONE_OTP_FAILED` audit log on mismatch or token error

**`requirePhoneVerified` middleware unit tests:**
- Calls `next()` when `isPhoneVerified` is `true` in the DB
- Returns 403 with `PHONE_VERIFICATION_REQUIRED` when `isPhoneVerified` is `false` in the DB
- Returns 403 even when the JWT was issued before the phone number was updated (DB is authoritative)
- Returns 401 when no `userId` is present on the request

**`PhoneVerificationController` unit tests:**
- Maps each domain error to the correct HTTP status and error code
- Returns the correct success response body for `sendOtp`
- Returns the correct success response body for `verifyOtp`

### Property-Based Tests

Property-based tests use **fast-check** (already used in the project's TypeScript test suite) with a minimum of **100 iterations** per property.

Each property test is tagged with a comment referencing the design property:
```
// Feature: firebase-phone-otp-verification, Property N: <property text>
```

**Property 1 — E.164 Validation:**
Generate arbitrary strings using `fc.string()` and valid E.164 numbers using a custom `fc.string()` with the E.164 pattern. Verify the validator accepts all valid E.164 numbers and rejects all others.

**Property 2 — Initiating Verification Resets isPhoneVerified:**
Generate valid E.164 phone numbers with `fc.string({ minLength: 8, maxLength: 16 })` filtered to E.164 format, and prior `isPhoneVerified` values with `fc.boolean()`. Mock the repository. Verify `isPhoneVerified` is always `false` after the use case executes.

**Property 3 — Phone Number Round-Trip Storage Fidelity:**
Generate valid E.164 phone numbers. Call the use case with a mock repository that captures the saved value. Verify the saved value equals the input. Verify the profile response returns the same value.

**Property 4 — Successful Verification Sets isPhoneVerified to True:**
Generate valid E.164 phone numbers and prior `isPhoneVerified` values with `fc.boolean()`. Mock `verifyIdToken` to return a decoded token with `phone_number` matching the stored phone. Verify `isPhoneVerified` is always `true` after the use case executes.

**Property 5 — Mismatched Token Leaves isPhoneVerified Unchanged:**
Generate pairs of distinct E.164 phone numbers (stored vs. token claim) using `fc.tuple(fc.string(), fc.string()).filter(([a, b]) => a !== b)`. Generate prior `isPhoneVerified` values with `fc.boolean()`. Mock `verifyIdToken` to return the token phone. Verify `isPhoneVerified` is unchanged after the use case executes.

**Property 6 — Enforcement Invariant:**
Generate `userId` strings and mock the repository to return a user with `isPhoneVerified = false`. Apply `requirePhoneVerified` middleware. Verify the response is always HTTP 403 with `PHONE_VERIFICATION_REQUIRED`.

**Property 7 — Error Responses Never Leak Sensitive Data:**
Generate various error conditions (invalid token, mismatch, missing claim, unexpected error). Capture the HTTP response body. Verify no response body contains the strings `FIREBASE_PRIVATE_KEY`, `firebaseIdToken`, `stack`, or any Firebase-internal identifier pattern.

**Property 8 — Audit Log Entries:**
Generate `userId` strings and E.164 phone numbers. Trigger each audit action. Capture the log call arguments. Verify each entry contains `userId`, `action`, `timestamp`, and a `phoneNumber` field matching `****\d{4}`.

### Integration Tests

Integration tests verify the full request/response cycle using a test database and a mocked Firebase Admin SDK.

- `POST /api/v1/phone/send-otp` with valid JWT and valid phone → 200
- `POST /api/v1/phone/send-otp` without JWT → 401
- `POST /api/v1/phone/send-otp` with invalid phone → 400
- `POST /api/v1/phone/verify-otp` with valid JWT and matching token → 200
- `POST /api/v1/phone/verify-otp` with mismatched phone → 409
- `POST /api/v1/phone/verify-otp` with expired Firebase token → 401
- Route protected by `requirePhoneVerified` with unverified user → 403
- Route protected by `requirePhoneVerified` with verified user → passes through
