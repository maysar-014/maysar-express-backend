-- Guard: `users.email` must hold a plain, lowercase-normalized address.
--
-- The column previously stored AES-256-GCM ciphertext (random IV per row).
-- Two problems with that, both now impossible:
--   1. `@unique` on random-IV ciphertext cannot enforce email uniqueness
--      (the same address produces different ciphertext every time).
--   2. No lookup could match a plaintext address, so every DB-level lookup by
--      email (seeds, ops/support scripts) silently missed.
--
-- This constraint is added NOT VALID on purpose: rows written before the
-- backfill may still hold ciphertext. PostgreSQL enforces it for all NEW and
-- UPDATED rows immediately, so the service cannot re-introduce ciphertext.
-- scripts/maintenance/backfill-users-plaintext-pii.ts then decrypts the legacy
-- rows, and the follow-up migration VALIDATEs this constraint.
--
-- NOT VALID is only valid for CHECK constraints - which is exactly what we need.

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_plaintext_chk"
  CHECK (
    "email" = ''
    OR "email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ) NOT VALID;

COMMENT ON CONSTRAINT "users_email_plaintext_chk" ON "users" IS
  'users.email stores a plain, normalized address (never ciphertext). Backfilled from AES-256-GCM by scripts/maintenance/backfill-users-plaintext-pii.ts.';
