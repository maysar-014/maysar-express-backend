/**
 * Data Cleanup Migration: Fix plaintext PII in user_User table
 *
 * Problem: The `AuthEventHandlers.UserRegistered.v1` handler previously wrote
 * raw plaintext email values to `user_User.email` instead of using
 * `PiiEncryptionService.encrypt()`. This migration finds those rows and:
 *   1. Encrypts the email (and phone if also plaintext) in-place
 *   2. Creates missing `user_UserIndex` entries so `findByEmail` can resolve them
 *
 * How to identify plaintext rows:
 *   - Encrypted emails use AES-256-GCM format: `iv:authTag:ciphertext` (contains ':')
 *   - Plaintext emails always contain '@'
 *   - Therefore: `email LIKE '%@%'` reliably identifies unencrypted rows
 *
 * Idempotency: Safe to run multiple times. Already-encrypted rows are skipped
 * because `email LIKE '%@%'` will not match them.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register prisma/migrations/fix-plaintext-pii/migrate.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { PiiEncryptionService } from '../../../shared/encryption/pii-encryption.service';

dotenv.config();

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const piiService = new PiiEncryptionService();

/**
 * Returns true if a value looks like plaintext (not already encrypted).
 * Encrypted values produced by PiiEncryptionService contain ':' separators
 * (iv:authTag:ciphertext). Plaintext emails contain '@'.
 * Plaintext phone numbers are digit strings without ':'.
 */
function isPlaintext(value: string | null | undefined): value is string {
  if (!value) return false;
  // Already encrypted: contains ':' separators (AES-256-GCM output format)
  if (value.includes(':')) return false;
  return true;
}

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     PII Plaintext Fix Migration — user_User table            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // 1. Find all rows where email is plaintext (contains '@' = not encrypted)
  const plaintextRows = await prisma.$queryRaw<Array<{ id: string; email: string; phoneNumber: string | null }>>`
    SELECT id, email, "phoneNumber"
    FROM users
    WHERE email LIKE '%@%'
  `;

  console.log(`  Found ${plaintextRows.length} row(s) with plaintext email.\n`);

  if (plaintextRows.length === 0) {
    console.log('  Nothing to fix — all rows are already encrypted. ✓\n');
    return;
  }

  let fixedCount = 0;
  let indexCreatedCount = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const row of plaintextRows) {
    try {
      const rawEmail = row.email;
      const rawPhone = row.phoneNumber && isPlaintext(row.phoneNumber) ? row.phoneNumber : null;

      // Encrypt the email
      const encryptedEmail = piiService.encrypt(rawEmail);
      const emailHash = piiService.hash(rawEmail);

      // Encrypt the phone if also plaintext
      const encryptedPhone = rawPhone ? piiService.encrypt(rawPhone) : undefined;
      const phoneHash = rawPhone ? piiService.hash(rawPhone) : null;

      // Update the user_User row with encrypted values
      await prisma.user_User.update({
        where: { id: row.id },
        data: {
          email: encryptedEmail,
          ...(encryptedPhone !== undefined ? { phoneNumber: encryptedPhone } : {})
        }
      });

      // Create missing email index entry
      const existingEmailIndex = await prisma.user_UserIndex.findFirst({
        where: { userId: row.id, indexType: 'email' }
      });

      if (!existingEmailIndex) {
        const indexData: Array<{ userId: string; indexType: string; value: string }> = [
          { userId: row.id, indexType: 'email', value: emailHash }
        ];

        if (phoneHash) {
          // Only add phone index if not already present
          const existingPhoneIndex = await prisma.user_UserIndex.findFirst({
            where: { userId: row.id, indexType: 'phone' }
          });
          if (!existingPhoneIndex) {
            indexData.push({ userId: row.id, indexType: 'phone', value: phoneHash });
          }
        }

        await prisma.user_UserIndex.createMany({ data: indexData });
        indexCreatedCount += indexData.length;
        console.log(`  [${row.id}] ✓ email encrypted + ${indexData.length} index entrie(s) created`);
      } else {
        console.log(`  [${row.id}] ✓ email encrypted (index already existed)`);
      }

      fixedCount++;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      errors.push({ id: row.id, error: msg });
      console.error(`  [${row.id}] ✗ ERROR: ${msg}`);
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  Migration complete                                           ║`);
  console.log(`║    Rows fixed:           ${String(fixedCount).padEnd(36)} ║`);
  console.log(`║    Index entries created: ${String(indexCreatedCount).padEnd(35)} ║`);
  console.log(`║    Errors:               ${String(errors.length).padEnd(36)} ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (errors.length > 0) {
    console.error('Errors encountered:');
    errors.forEach(({ id, error }) => console.error(`  ${id}: ${error}`));
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
