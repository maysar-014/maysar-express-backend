-- Second half of the email-plaintext migration.
--
-- Run this ONLY after scripts/maintenance/backfill-users-plaintext-pii.ts has
-- converted the legacy ciphertext rows. VALIDATE re-checks every existing row
-- against `users_email_plaintext_chk`; if the backfill was skipped or
-- incomplete, this statement fails loudly instead of leaving the database in
-- a half-migrated, ambiguous state.
--
-- It also adds a case-insensitive unique index. The column-level @unique only
-- constrains exact matches, so without this `Buyer@x.com` and `buyer@x.com`
-- could both exist - the classic duplicate-account bug. Email.create()
-- normalizes to lowercase, so in practice this index agrees with the
-- application, but it makes the guarantee a database invariant rather than a
-- convention.

ALTER TABLE "users" VALIDATE CONSTRAINT "users_email_plaintext_chk";

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_key" ON "users" (lower("email"));
