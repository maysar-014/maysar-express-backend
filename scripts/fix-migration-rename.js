/**
 * Updates _prisma_migrations to rename
 * 20260823300000_seller_locations_and_product_inventory
 * → 20260823100001_seller_locations_and_product_inventory
 * and recomputes its checksum from the file on disk.
 *
 * Run once with: node scripts/fix-migration-rename.js
 */
const crypto = require('crypto');
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const oldName = '20260823300000_seller_locations_and_product_inventory';
  const newName = '20260823100001_seller_locations_and_product_inventory';
  const filePath = `prisma/migrations/${newName}/migration.sql`;

  const content = fs.readFileSync(filePath, 'utf8');
  const checksum = crypto.createHash('sha256').update(content).digest('hex');
  console.log(`New name:     ${newName}`);
  console.log(`New checksum: ${checksum}`);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const result = await client.query(
    `UPDATE _prisma_migrations
     SET migration_name = $1, checksum = $2
     WHERE migration_name = $3
     RETURNING migration_name`,
    [newName, checksum, oldName]
  );

  if (result.rowCount === 0) {
    console.log(`Migration "${oldName}" not found in _prisma_migrations.`);
    console.log('Checking if new name already exists...');
    const check = await client.query(
      `SELECT migration_name FROM _prisma_migrations WHERE migration_name = $1`,
      [newName]
    );
    if (check.rowCount > 0) {
      console.log(`"${newName}" already exists — updating checksum only.`);
      await client.query(
        `UPDATE _prisma_migrations SET checksum = $1 WHERE migration_name = $2`,
        [checksum, newName]
      );
      console.log('Checksum updated.');
    } else {
      console.log('Neither old nor new name found. Nothing to update.');
    }
  } else {
    console.log(`Renamed: ${oldName} → ${result.rows[0].migration_name}`);
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
