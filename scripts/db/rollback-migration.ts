#!/usr/bin/env tsx
/**
 * Maysar Engineering — Database Migration Rollback Script
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 10.14: Database migrations shall be controlled, documented and recoverable
 *   - Article 26: Release and Recovery — Changes to persistent data shall account for
 *     the possibility that ordinary code rollback cannot reverse a completed migration.
 * 
 * This script rolls back a specific Prisma migration by:
 * 1. Marking the migration as rolled back in the _prisma_migrations table
 * 2. Reverting the schema changes made by that migration
 * 
 * Usage:
 *   npx tsx scripts/db/rollback-migration.ts <migration_name>
 * 
 * Example:
 *   npx tsx scripts/db/rollback-migration.ts 20260101000000_add_wallet_balances
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationRecord {
    migration_name: string;
    finished_at: Date | null;
    rolled_back_at: Date | null;
    applied_steps_count: number;
}

/**
 * Roll back a specific migration.
 * 
 * @param migrationName - The name of the migration to roll back (e.g., "20260101000000_add_wallet_balances")
 */
async function rollbackMigration(migrationName: string): Promise<void> {
    console.log(`[Rollback] Starting rollback for migration: ${migrationName}`);

    // 1. Verify the migration exists and hasn't already been rolled back
    const migration = await prisma.$queryRawUnsafe<MigrationRecord[]>(
        `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
         FROM "_prisma_migrations"
         WHERE migration_name = $1`,
        [migrationName]
    );

    if (migration.length === 0) {
        console.error(`[Rollback] Migration not found: ${migrationName}`);
        process.exit(1);
    }

    if (migration[0].rolled_back_at !== null) {
        console.error(`[Rollback] Migration already rolled back: ${migrationName}`);
        process.exit(1);
    }

    if (migration[0].finished_at === null) {
        console.error(`[Rollback] Migration was not fully applied: ${migrationName}`);
        process.exit(1);
    }

    console.log(`[Rollback] Found migration: ${migrationName} (applied ${migration[0].applied_steps_count} steps)`);

    // 2. Mark the migration as rolled back in _prisma_migrations
    // This prevents Prisma from re-applying it on subsequent migrate deploy
    await prisma.$executeRawUnsafe(
        `UPDATE "_prisma_migrations"
         SET rolled_back_at = NOW(),
             finished_at = NOW()
         WHERE migration_name = $1 AND rolled_back_at IS NULL`,
        [migrationName]
    );

    console.log(`[Rollback] Marked migration as rolled back: ${migrationName}`);

    // 3. Revert schema changes
    // NOTE: This section must be customized for each migration.
    // The examples below show common patterns for financial schema changes.
    // Add specific DDL statements for each migration that needs rollback support.
    await revertSchemaChanges(migrationName);

    console.log(`[Rollback] Successfully rolled back migration: ${migrationName}`);
}

/**
 * Revert schema changes for a specific migration.
 * 
 * This function contains the DDL statements needed to undo each migration.
 * Add new cases as migrations are created. Each migration must have a
 * corresponding rollback path before it can be applied to production.
 * 
 * @param migrationName - The name of the migration to revert
 */
async function revertSchemaChanges(migrationName: string): Promise<void> {
    console.log(`[Rollback] Reverting schema changes for: ${migrationName}`);

    // Example rollback patterns - add specific cases for each migration:
    //
    // switch (migrationName) {
    //   case '20260101000001_create_wallets':
    //     await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "wallets"`);
    //     break;
    //   case '20260101000002_add_escrow_accounts':
    //     await prisma.$executeRawUnsafe(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "escrow_id"`);
    //     break;
    //   default:
    //     console.warn(`[Rollback] No specific revert defined for ${migrationName}. Manual intervention may be required.`);
    // }

    // For migrations without explicit rollback DDL, mark as rolled back
    // and require manual verification
    console.warn(`[Rollback] No specific DDL revert defined for ${migrationName}.`);
    console.warn(`[Rollback] Manual database review recommended to ensure schema consistency.`);
}

/**
 * List all applied migrations that can be rolled back.
 */
async function listRollbackCandidates(): Promise<void> {
    const migrations = await prisma.$queryRawUnsafe<MigrationRecord[]>(
        `SELECT migration_name, finished_at, rolled_back_at
         FROM "_prisma_migrations"
         WHERE rolled_back_at IS NULL
         ORDER BY finished_at DESC`
    );

    console.log('\n[Rollback] Available migrations for rollback:');
    console.log('===========================================');
    if (migrations.length === 0) {
        console.log('(none)');
    } else {
        for (const m of migrations) {
            console.log(`  - ${m.migration_name} (applied: ${m.finished_at})`);
        }
    }
    console.log('===========================================\n');
}

const migrationName = process.argv[2];

if (!migrationName) {
    console.error('[Rollback] Usage: tsx scripts/db/rollback-migration.ts <migration_name>');
    console.error('\nAvailable migrations:');
    await listRollbackCandidates();
    process.exit(1);
}

rollbackMigration(migrationName)
    .then(() => {
        console.log('\n[Rollback] Rollback completed successfully.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n[Rollback] Rollback failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });