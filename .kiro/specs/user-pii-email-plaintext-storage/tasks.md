# Tasks — user-pii-email-plaintext-storage

## Task List

- [ ] 1. Inject `PiiEncryptionService` into `AuthEventHandlers`
  - [ ] 1.1 Add a constructor to `AuthEventHandlers` that accepts `piiService: PiiEncryptionService` as a parameter and stores it as a private readonly field
  - [ ] 1.2 Add the import for `PiiEncryptionService` at the top of `auth-event-handlers.ts`

- [ ] 2. Fix the `UserRegistered.v1` handler — encrypt email and phone
  - [ ] 2.1 Before the `prisma.user_User.upsert` call, derive `encryptedEmail` via `this.piiService.encrypt(payload.email ?? '')` and `emailHash` via `this.piiService.hash(payload.email ?? '')`
  - [ ] 2.2 Derive `encryptedPhone` and `phoneHash` from `phoneNumber` using `piiService.encrypt` / `piiService.hash` (only when `phoneNumber` is non-null)
  - [ ] 2.3 Replace `email: payload.email ?? ''` with `email: encryptedEmail` in the `create` branch of the upsert
  - [ ] 2.4 Replace `phoneNumber: phoneNumber ?? null` with `phoneNumber: encryptedPhone` in the `create` branch of the upsert

- [ ] 3. Create `user_UserIndex` entries in the `UserRegistered.v1` handler
  - [ ] 3.1 After the upsert, query `prisma.user_UserIndex.findFirst` to check whether an email index already exists for the given `userId`
  - [ ] 3.2 If no email index exists, call `prisma.user_UserIndex.createMany` with the email index entry and, conditionally, the phone index entry

- [ ] 4. Update `main.ts` to pass `PiiEncryptionService` when constructing `AuthEventHandlers`
  - [ ] 4.1 In `initializeEventHandlers()`, change `new AuthEventHandlers()` to `new AuthEventHandlers(new PiiEncryptionService())`

- [ ] 5. Write unit tests for the fixed `AuthEventHandlers`
  - [ ] 5.1 Test that a `UserRegistered.v1` event results in `user_User.email` being the encrypted value (not the raw email)
  - [ ] 5.2 Test that a `UserRegistered.v1` event for a new user creates a `user_UserIndex` row with `indexType: 'email'`
  - [ ] 5.3 Test that a `UserRegistered.v1` event for a new user with a phone number creates a `user_UserIndex` row with `indexType: 'phone'`
  - [ ] 5.4 Test that a `UserRegistered.v1` event for a user whose email index already exists does NOT create a duplicate index entry
  - [ ] 5.5 Test that the other event handlers (`AuthLoginSuccess`, `AuthLoginFailed`, `AuthTwoFactorEnabled`, `AuthTwoFactorDisabled`) are unaffected by the change

- [ ] 6. Create the data cleanup migration script
  - [ ] 6.1 Create `prisma/migrations/fix-plaintext-pii/migrate.ts` — a TypeScript script that uses `PrismaClient` and `PiiEncryptionService` to find all `user_User` rows where `email` contains `@`
  - [ ] 6.2 For each plaintext row, encrypt the email with `piiService.encrypt()` and update the `user_User` row
  - [ ] 6.3 For each plaintext row, check whether a `user_UserIndex` entry exists for `(userId, 'email')`; if not, insert it using `piiService.hash(plaintext_email)`
  - [ ] 6.4 Repeat steps 6.2–6.3 for `phoneNumber` if the phone value is also plaintext (contains digits but no `:` separator)
  - [ ] 6.5 Add a log statement reporting the total number of rows fixed and verify the script is idempotent (safe to re-run)

- [ ] 7. Write integration tests for the cleanup migration
  - [ ] 7.1 Test that after running the migration, no `user_User` row has `email LIKE '%@%'`
  - [ ] 7.2 Test that after running the migration, every `user_User` row has at least one corresponding `user_UserIndex` row with `indexType: 'email'`
  - [ ] 7.3 Test that running the migration twice does not alter already-encrypted rows or create duplicate index entries
