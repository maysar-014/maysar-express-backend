#!/usr/bin/env ts-node
/**
 * Backfill `users.email` / `users.phoneNumber` from AES-256-GCM ciphertext to
 * plain, normalized values.
 *
 * WHY
 * The `users` table stored email and phone encrypted with a random IV per row.
 * That broke three database guarantees:
 *   1. `@unique` on random-IV ciphertext cannot enforce uniqueness - the same
 *      address encrypts differently every time, so duplicates were possible.
 *   2. No query could match a plaintext address, so every DB-level lookup by
 *      email (seeds, ops/support tooling) silently missed.
 *   3. A silent `''` sentinel had to be invented at the read layer for rows
 *      that could not be decrypted.
 *
 * Passwords are untouched: `passwordHash` is bcrypt, not reversible, and stays.
 * Encryption of genuinely sensitive non-credential data (e.g. payout bank
 * details) is unaffected.
 *
 * SAFE / IDEMPOTENT
 *   - Runs in a single transaction, so a failure leaves the table untouched.
 *   - Detects ciphertext structurally (`iv:authTag:ciphertext`, all hex) and
 *     skips rows that are already plain, so re-runs are no-ops.
 *   - Aborts BEFORE writing if decrypted values would collide with an existing
 *     row, instead of letting a unique-violation half-apply.
 *   - Refuses to run when PII_ENCRYPTION_KEY is missing.
 *
 * USAGE
 *   npx ts-node -r tsconfig-paths/register scripts/maintenance/backfill-users-plaintext-pii.ts [--dry-run]
 *
 * ORDERING (see prisma/migrations/2026092801* and 2026092802*)
 *   1. apply migration 20260928010000 (adds the CHECK constraint NOT VALID,
 *      which blocks any NEW ciphertext write)
 *   2. run this script
 *   3. apply migration 20260928020000 (VALIDATEs the constraint + adds the
 *      case-insensitive unique index)
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { PiiEncryptionService } from '../../shared/encryption/pii-encryption.service';

dotenv.config();

/** AES-256-GCM output is `iv(12B):authTag(16B):ciphertext`, all hex. */
const CIPHERTEXT_PATTERN = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const isCiphertext = (value: unknown): value is string =>
  typeof value === 'string' && CIPHERTEXT_PATTERN.test(value.trim());

const normalizeEmail = (value: string): string => value.trim().toLowerCase();


async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  if (!process.env.PII_ENCRYPTION_KEY) {
    console.error('ABORT: PII_ENCRYPTION_KEY is not set - legacy rows cannot be decrypted.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const pii = new PiiEncryptionService();

  try {
    const rows = await prisma.user_User.findMany({
      select: { id: true, email: true, phoneNumber: true },
      orderBy: { id: 'asc' },
    });

    const plan: Array<{ id: string; email: string; phoneNumber: string | null }> = [];
    const failures: Array<{ id: string; field: string; reason: string }> = [];

    for (const row of rows) {
      let email = row.email ?? '';
      let phoneNumber = row.phoneNumber ?? null;

      if (isCiphertext(email)) {
        try {
          email = normalizeEmail(pii.decrypt(email));
          if (!EMAIL_PATTERN.test(email)) {
            failures.push({ id: row.id, field: 'email', reason: `decrypted value is not an email: ${email}` });
            continue;
          }
        } catch {
          failures.push({ id: row.id, field: 'email', reason: 'decryption failed (wrong key or corrupt row)' });
          continue;
        }
      } else {
        email = normalizeEmail(email);
      }

      if (isCiphertext(phoneNumber)) {
        try {
          phoneNumber = pii.decrypt(phoneNumber).trim();
        } catch {
          failures.push({ id: row.id, field: 'phoneNumber', reason: 'decryption failed (wrong key or corrupt row)' });
          continue;
        }
      }

      plan.push({ id: row.id, email, phoneNumber });
    }

    if (failures.length > 0) {
      console.error('ABORT: could not decrypt every legacy row. Nothing was written.');
      for (const failure of failures) {
        console.error(`  ${failure.id} ${failure.field}: ${failure.reason}`);
      }
      process.exit(1);
    }

    // Collision check against the FINAL state of the table: two decrypted
    // addresses may normalize to the same value, and a decrypted value may
    // match a row that is already plain.
    const finalEmails = new Map<string, string[]>();
    for (const entry of plan) {
      const key = entry.email.toLowerCase();
      finalEmails.set(key, [...(finalEmails.get(key) ?? []), entry.id]);
    }
    const duplicates = [...finalEmails.entries()].filter(([, ids]) => ids.length > 1);
    if (duplicates.length > 0) {
      console.error('ABORT: decryption would produce duplicate emails. Nothing was written.');
      for (const [email, ids] of duplicates) {
        console.error(`  ${email} <- ${ids.join(', ')}`);
      }
      console.error('Resolve the duplicate accounts by hand, then re-run.');
      process.exit(1);
    }

    const changed = plan.filter((entry, index) => {
      const before = rows[index];
      return entry.email !== before.email || entry.phoneNumber !== (before.phoneNumber ?? null);
    });

    console.log(`scanned=${rows.length} would_change=${changed.length} dry_run=${dryRun}`);
    for (const entry of changed) {
      console.log(`  ${entry.id}  email=${entry.email}  phone=${entry.phoneNumber ?? '(null)'}`);
    }

    if (dryRun) {
      console.log('DRY RUN - no writes performed.');
      return;
    }
    if (changed.length === 0) {
      console.log('Nothing to do - all rows are already plain.');
      return;
    }

    await prisma.$transaction(
      changed.map((entry) =>
        prisma.user_User.update({
          where: { id: entry.id },
          data: { email: entry.email, phoneNumber: entry.phoneNumber },
          select: { id: true },
        }),
      ),
    );

    const remaining = await prisma.user_User.count({ where: { phoneNumber: { contains: ':' } } });
    console.log(`committed ${changed.length} row(s); rows still holding phone ciphertext = ${remaining}`);
    console.log('Now apply migration 20260928020000_users_email_plaintext_validate.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('BACKFILL FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
