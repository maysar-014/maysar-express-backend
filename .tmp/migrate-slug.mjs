/**
 * Migration: make product slugs globally unique
 * 
 * Steps:
 * 1. First, ensure all existing slugs are globally unique (add random suffix to any duplicates)
 * 2. Drop the old per-seller unique constraint
 * 3. Add the new global unique constraint
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Step 1: Checking for duplicate slugs across sellers...');
  
  // Find any slugs that appear for more than one seller
  const duplicates = await prisma.$queryRaw`
    SELECT slug, COUNT(*) as cnt, array_agg(id) as ids
    FROM catalog_products
    GROUP BY slug
    HAVING COUNT(*) > 1
  `;

  const dupArray = Array.isArray(duplicates) ? duplicates : [];
  console.log(`Found ${dupArray.length} duplicate slug groups`);

  // Fix duplicates by appending a suffix to all but the first occurrence
  for (const dup of dupArray) {
    const ids = dup.ids;
    // Keep first, fix rest
    for (let i = 1; i < ids.length; i++) {
      const suffix = Math.random().toString(36).slice(2, 6);
      const newSlug = `${dup.slug}-${suffix}`;
      await prisma.$executeRaw`
        UPDATE catalog_products SET slug = ${newSlug} WHERE id = ${ids[i]}
      `;
      console.log(`  Fixed duplicate: ${dup.slug} → ${newSlug} for product ${ids[i]}`);
    }
  }

  console.log('\nStep 2: Dropping old per-seller unique constraint...');
  await prisma.$executeRaw`
    ALTER TABLE catalog_products DROP CONSTRAINT IF EXISTS "catalog_products_sellerId_slug_key"
  `;
  console.log('  Dropped catalog_products_sellerId_slug_key');

  console.log('\nStep 3: Dropping old slug index (will recreate as unique)...');
  await prisma.$executeRaw`
    DROP INDEX IF EXISTS "catalog_products_slug_idx"
  `;

  console.log('\nStep 4: Adding global unique constraint on slug...');
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "catalog_products_slug_key" ON catalog_products(slug)
  `;
  console.log('  Created catalog_products_slug_key (global unique)');

  console.log('\nStep 5: Creating seller+slug composite index for fast seller lookups...');
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "catalog_products_sellerId_slug_idx" ON catalog_products("sellerId", slug)
  `;
  console.log('  Created catalog_products_sellerId_slug_idx');

  console.log('\n✅ Migration complete — product slugs are now globally unique');
  
  // Verify
  const totalProducts = await prisma.product.count();
  const uniqueSlugs = await prisma.$queryRaw`SELECT COUNT(DISTINCT slug) as cnt FROM catalog_products`;
  console.log(`  Total products: ${totalProducts}`);
  console.log(`  Unique slugs: ${uniqueSlugs[0]?.cnt}`);
}

main()
  .catch(e => { console.error('Migration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
