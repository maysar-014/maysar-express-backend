/**
 * Removes the orphaned 20260831225421_products_states_enhanced record
 * from _prisma_migrations. Run once with:
 *   node scripts/delete-migration-record.js
 */
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const name = '20260831225421_products_states_enhanced';
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const result = await client.query(
    `DELETE FROM _prisma_migrations WHERE migration_name = $1 RETURNING migration_name`,
    [name]
  );

  if (result.rowCount === 0) {
    console.log(`"${name}" not found — nothing to delete.`);
  } else {
    console.log(`Deleted: ${result.rows[0].migration_name}`);
  }

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
