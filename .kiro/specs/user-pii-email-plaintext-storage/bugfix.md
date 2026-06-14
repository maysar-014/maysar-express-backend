# Bugfix Requirements Document

## Introduction

The `UserRegistered.v1` event handler in `AuthEventHandlers` writes user records directly to `prisma.user_User` using the raw plaintext email from the event payload, bypassing the `PiiEncryptionService`. This violates the PII storage contract of the `users` table (which requires AES-256-GCM encrypted emails) and omits the corresponding `user_UserIndex` entry that `findByEmail` depends on for lookups.

The combined effect is two-fold:
1. **PII violation** — plaintext email values are persisted in a column that must always store encrypted data.
2. **Duplicate/ghost rows** — when a user registers, `CreateUserUseCase → PrismaUserRepository.create()` correctly creates a row with an encrypted email and an index entry, while the `AuthEventHandlers` handler creates a second row with a plaintext email and no index entry. The ghost row is invisible to all application queries but pollutes the database and exposes unencrypted PII.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the `UserRegistered.v1` event is processed by `AuthEventHandlers` THEN the system stores the raw plaintext email value (`payload.email`) directly into the `user_User.email` column without encryption.

1.2 WHEN the `UserRegistered.v1` event is processed by `AuthEventHandlers` THEN the system omits creating a `user_UserIndex` row for the `email` index type, leaving the upserted user record unreachable via `findByEmail`.

1.3 WHEN the `UserRegistered.v1` event is processed for a user whose record was already created by `CreateUserUseCase` THEN the system creates a second `user_User` row (via upsert) with a plaintext email alongside the correct encrypted row, resulting in duplicate rows in the `users` table.

1.4 WHEN existing rows in `user_User` contain a plaintext email (identifiable by the presence of `@`) THEN the system has no mechanism to retroactively encrypt those values or create their missing index entries.

### Expected Behavior (Correct)

2.1 WHEN the `UserRegistered.v1` event is processed by `AuthEventHandlers` THEN the system SHALL encrypt the email using `PiiEncryptionService.encrypt()` before writing it to `user_User.email`.

2.2 WHEN the `UserRegistered.v1` event creates a new `user_User` row THEN the system SHALL also create a `user_UserIndex` entry with `indexType: 'email'` and `value: PiiEncryptionService.hash(email)`, making the user findable by email.

2.3 WHEN the `UserRegistered.v1` event creates a new `user_User` row and the event payload includes a `phoneNumber` THEN the system SHALL also create a `user_UserIndex` entry with `indexType: 'phone'` and `value: PiiEncryptionService.hash(phoneNumber)`.

2.4 WHEN the `UserRegistered.v1` event targets a `userId` for which a `user_UserIndex` entry with `indexType: 'email'` already exists THEN the system SHALL skip creating duplicate index entries (upsert semantics for the index).

2.5 WHEN the data cleanup migration runs THEN the system SHALL identify all `user_User` rows where the `email` column contains a plaintext email (contains `@`), encrypt each such email, update the row, and create the missing `user_UserIndex` entries.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the `UserRegistered.v1` event is processed for a user whose `userId` already has a `user_User` row THEN the system SHALL CONTINUE TO update only the `publicCode`, `role`, and `status` fields (no change to the upsert update payload).

3.2 WHEN `AuthLoginSuccess`, `AuthLoginFailed`, `AuthTwoFactorEnabled`, and `AuthTwoFactorDisabled` events are processed THEN the system SHALL CONTINUE TO update the respective fields on the `user_User` row without any modification to encryption or indexing logic.

3.3 WHEN `PrismaUserRepository.create()` creates a user via `CreateUserUseCase` THEN the system SHALL CONTINUE TO encrypt the email, hash it, and create the `user_UserIndex` entry exactly as before.

3.4 WHEN `findByEmail` is called for a user whose record was correctly created by `PrismaUserRepository.create()` THEN the system SHALL CONTINUE TO resolve the user via the `user_UserIndex` lookup.

3.5 WHEN a user record already has a correct encrypted email (does not contain `@`) THEN the cleanup migration SHALL CONTINUE TO leave that row untouched.
