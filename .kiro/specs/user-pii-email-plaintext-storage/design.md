# Design Document — user-pii-email-plaintext-storage

## Overview

Two coordinated changes are required:

1. **Runtime fix** — inject `PiiEncryptionService` into `AuthEventHandlers` and apply encryption + index creation inside the `UserRegistered.v1` handler, mirroring the behaviour of `PrismaUserRepository.create()`.
2. **Data migration** — a one-time Prisma migration script that finds existing plaintext rows, encrypts them in-place, and creates missing index entries.

---

## Bug Condition Analysis

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type UserRegisteredEventPayload
  OUTPUT: boolean

  // The bug fires whenever the handler runs and the email is written
  // without encryption — i.e. on every UserRegistered.v1 event.
  RETURN true
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result ← handleUserRegistered'(X)   // fixed handler
  ASSERT user_User.email IS encrypted  // contains ':' separators, no '@')
  ASSERT user_UserIndex entry EXISTS for (userId, 'email')
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  // All other event handlers (AuthLoginSuccess, AuthLoginFailed,
  // AuthTwoFactorEnabled, AuthTwoFactorDisabled) must behave identically
  ASSERT F(X) = F'(X)
END FOR
```

The bug condition is effectively `true` for every `UserRegistered.v1` event — the existing handler always stores plaintext. The fix converts the condition to `false` by encrypting before every write.

---

## Technical Context

### Relevant Files

| File | Role |
|---|---|
| `services/user-service/src/infrastructure/messaging/auth-event-handlers.ts` | **Primary change** — add `PiiEncryptionService` dependency, encrypt email/phone, create index entries |
| `services/user-service/src/main.ts` | **Secondary change** — pass `new PiiEncryptionService()` when constructing `AuthEventHandlers` |
| `shared/encryption/pii-encryption.service.ts` | Provides `encrypt(plaintext): string` and `hash(value): string` — no changes needed |
| `services/user-service/src/infrastructure/repositories/prisma-user.repository.ts` | Reference implementation — mirrors the pattern to replicate |
| `prisma/migrations/` | New migration SQL for data cleanup |

### PiiEncryptionService Contract

- `encrypt(plaintext)` — AES-256-GCM, returns `iv:authTag:ciphertext` (hex). Returns the input unchanged for empty strings.
- `hash(value)` — HMAC-SHA256 deterministic hash used as the index lookup key. Returns the input unchanged for empty strings.
- The service reads `PII_ENCRYPTION_KEY` and `PII_HMAC_SECRET` from environment variables; both must be present at runtime.

### Index Table Structure (`user_UserIndex`)

```
userId     String   (FK → user_User.id)
indexType  String   ('email' | 'phone')
value      String   (HMAC-SHA256 hash of plaintext value)
```

`findByEmail` performs: `user_UserIndex.findFirst({ where: { indexType: 'email', value: hash(email) } })`.

---

## Solution Design

### Change 1 — `auth-event-handlers.ts`

**Constructor injection:**

```typescript
import { PiiEncryptionService } from '../../../../../shared/encryption/pii-encryption.service';

export class AuthEventHandlers {
  constructor(
    private readonly piiService: PiiEncryptionService
  ) {}
  ...
}
```

**Updated `UserRegistered.v1` handler:**

```typescript
eventBus.subscribe('UserRegistered.v1', async (envelope: EventEnvelope) => {
  const payload = asUserRegistered(envelope.data);
  if (!payload.userId) return;

  const { firstName = null, lastName = null, phoneNumber = null } = payload.profile ?? {};

  const encryptedEmail  = this.piiService.encrypt(payload.email ?? '');
  const emailHash       = this.piiService.hash(payload.email ?? '');
  const encryptedPhone  = phoneNumber ? this.piiService.encrypt(phoneNumber) : null;
  const phoneHash       = phoneNumber ? this.piiService.hash(phoneNumber)    : null;

  await prisma.user_User.upsert({
    where: { id: payload.userId },
    create: {
      id:           payload.userId,
      email:        encryptedEmail,        // encrypted ✓
      publicCode:   payload.publicCode ?? null,
      passwordHash: '',
      role:         mapRole(payload.role),
      status:       User_UserStatus.PENDING_VERIFICATION,
      firstName:    firstName  ?? null,
      lastName:     lastName   ?? null,
      phoneNumber:  encryptedPhone         // encrypted ✓
    },
    update: {
      publicCode: payload.publicCode ?? null,
      role:       mapRole(payload.role),
      status:     User_UserStatus.PENDING_VERIFICATION
    }
  });

  // Create index entries only when they don't already exist
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
});
```

The `prisma` client is accessed via the module-level singleton import (matching the existing pattern in the file). No changes are needed to the other four event subscriptions.

### Change 2 — `main.ts`

In `initializeEventHandlers()`, replace:

```typescript
const authEventHandlers = new AuthEventHandlers();
```

with:

```typescript
const authEventHandlers = new AuthEventHandlers(new PiiEncryptionService());
```

`PiiEncryptionService` is already imported in `main.ts` (used for `PrismaUserRepository`).

### Change 3 — Data Cleanup Migration

A new Prisma migration with raw SQL that:

1. Iterates all `user_User` rows where `email LIKE '%@%'` (plaintext indicator).
2. For each such row — encrypts the email and phone (if set and plaintext) using the same AES-256-GCM algorithm as `PiiEncryptionService`. Because SQL cannot call the Node.js crypto library, the migration is implemented as a **TypeScript seed/migration script** (`prisma/migrations/fix-plaintext-pii/migrate.ts`) that runs after the SQL migration and uses `PiiEncryptionService` directly.

**Migration script logic (pseudocode):**

```
1. SELECT id, email, phoneNumber FROM user_User WHERE email LIKE '%@%'
2. FOR EACH row:
   a. encryptedEmail  = piiService.encrypt(row.email)
   b. emailHash       = piiService.hash(row.email)
   c. encryptedPhone  = row.phoneNumber LIKE '%@%' OR (not encrypted format)
                        ? piiService.encrypt(row.phoneNumber)
                        : row.phoneNumber   // already encrypted, leave alone
   d. phoneHash       = phoneNumber present ? piiService.hash(original plaintext phone) : null
   e. UPDATE user_User SET email = encryptedEmail, phoneNumber = encryptedPhone WHERE id = row.id
   f. IF NOT EXISTS (SELECT 1 FROM user_UserIndex WHERE userId = row.id AND indexType = 'email')
        INSERT INTO user_UserIndex (userId, indexType, value) VALUES (row.id, 'email', emailHash)
   g. IF phoneHash AND NOT EXISTS (SELECT 1 FROM user_UserIndex WHERE userId = row.id AND indexType = 'phone')
        INSERT INTO user_UserIndex (userId, indexType, value) VALUES (row.id, 'phone', phoneHash)
3. LOG count of rows fixed
```

The script is idempotent: re-running it on already-fixed rows is safe because the `WHERE email LIKE '%@%'` filter excludes encrypted values (which contain `:` separators and no `@`).

---

## Correctness Properties

### Property 1 — Fix Checking: Email is Always Encrypted on Write

```pascal
FOR ALL event WHERE event.type = 'UserRegistered.v1' AND event.email IS NOT NULL DO
  handle(event)
  row ← SELECT email FROM user_User WHERE id = event.userId
  ASSERT row.email NOT LIKE '%@%'         // no plaintext email
  ASSERT row.email LIKE '%:%:%'           // iv:authTag:ciphertext format
END FOR
```

### Property 2 — Fix Checking: Index Entry Created on New User

```pascal
FOR ALL event WHERE event.type = 'UserRegistered.v1'
    AND NOT EXISTS (SELECT 1 FROM user_User WHERE id = event.userId) DO
  handle(event)
  ASSERT EXISTS (SELECT 1 FROM user_UserIndex
                 WHERE userId = event.userId AND indexType = 'email')
END FOR
```

### Property 3 — Fix Checking: findByEmail Works After Registration

```pascal
FOR ALL event WHERE event.type = 'UserRegistered.v1' DO
  handle(event)
  result ← findByEmail(event.email)
  ASSERT result IS NOT NULL
  ASSERT result.id = event.userId
END FOR
```

### Property 4 — Preservation Checking: No Duplicate Index Entries

```pascal
FOR ALL event WHERE event.type = 'UserRegistered.v1'
    AND EXISTS (SELECT 1 FROM user_UserIndex
                WHERE userId = event.userId AND indexType = 'email') DO
  handle(event)
  count ← SELECT COUNT(*) FROM user_UserIndex
           WHERE userId = event.userId AND indexType = 'email'
  ASSERT count = 1
END FOR
```

### Property 5 — Preservation Checking: Other Event Handlers Unchanged

```pascal
FOR ALL event WHERE event.type IN
    ('AuthLoginSuccess', 'AuthLoginFailed',
     'AuthTwoFactorEnabled', 'AuthTwoFactorDisabled') DO
  ASSERT handle_fixed(event) = handle_original(event)
END FOR
```

### Property 6 — Migration: Cleanup is Idempotent

```pascal
FOR ALL row WHERE row.email NOT LIKE '%@%' DO
  run_migration()
  ASSERT row.email IS UNCHANGED
END FOR
```

---

## Test Strategy

| Test | Type | What to Verify |
|---|---|---|
| `AuthEventHandlers` — new user via `UserRegistered.v1` stores encrypted email | Unit | `user_User.email` matches `piiService.encrypt(rawEmail)` |
| `AuthEventHandlers` — new user creates email index entry | Unit | `user_UserIndex` has one row for `(userId, 'email')` |
| `AuthEventHandlers` — new user with phone creates phone index entry | Unit | `user_UserIndex` has row for `(userId, 'phone')` |
| `AuthEventHandlers` — existing user upsert does NOT duplicate index | Unit | `user_UserIndex` count for `(userId, 'email')` remains 1 |
| `AuthEventHandlers` — `findByEmail` resolves user after event | Integration | `findByEmail(email)` returns the registered user |
| Cleanup migration — plaintext rows are encrypted | Integration | After migration, no `user_User` row has `email LIKE '%@%'` |
| Cleanup migration — missing indexes are created | Integration | After migration, all users have a `user_UserIndex` email entry |
| Cleanup migration — already-encrypted rows are untouched | Integration | Re-running migration leaves encrypted rows unchanged |
