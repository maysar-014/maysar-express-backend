/**
 * Fixes the checksum of a migration in _prisma_migrations to match the current file.
 * Usage: node scripts/fix-migration-checksum.js <migration_name>
 * Example: node scripts/fix-migration-checksum.js 20260901000000_product_intelligence_engine
 */
const crypto = require('crypto');
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const migrationName = process.argv[2] || '20260901000000_product_intelligence_engine';
  const filePath = `prisma/migrations/${migrationName}/migration.sql`;

  const content = fs.readFileSync(filePath, 'utf8');
  const checksum = crypto.createHash('sha256').update(content).digest('hex');
  console.log(`Migration: ${migrationName}`);
  console.log(`Checksum:  ${checksum}`);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const result = await client.query(
    `UPDATE _prisma_migrations SET checksum = $1 WHERE migration_name = $2 RETURNING migration_name`,
    [checksum, migrationName]
  );

  if (result.rowCount === 0) {
    console.log('Migration record not found — nothing updated.');
  } else {
    console.log(`Updated: ${result.rows[0].migration_name}`);
  }

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
