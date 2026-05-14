/**
 * Clears all products seeded by the dev seller so the seed script can run fresh.
 * Run: npx ts-node -r tsconfig-paths/register scripts/ops/clear-seeded-products.ts
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

// The seller ID used by scripts/seed-products.ts
const SELLER_ID = 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';

async function main() {
  console.log('\n🗑  Clearing seeded products for seller:', SELLER_ID);

  const products = await (prisma as any).product.findMany({
    where: { sellerId: SELLER_ID },
    select: { id: true, title: true },
  });

  if (products.length === 0) {
    console.log('  No products found — nothing to clear.\n');
    return;
  }

  console.log(`  Found ${products.length} product(s):`);
  products.forEach((p: any) => console.log(`    - ${p.title} (${p.id})`));

  const productIds = products.map((p: any) => p.id);

  // Delete dependent records first
  const mediaDeleted = await (prisma as any).mediaRef.deleteMany({
    where: { entityId: { in: productIds } },
  });
  console.log(`\n  ✓ MediaRef deleted: ${mediaDeleted.count}`);

  const variantsDeleted = await (prisma as any).productVariant.deleteMany({
    where: { productId: { in: productIds } },
  });
  console.log(`  ✓ Variants deleted: ${variantsDeleted.count}`);

  const productsDeleted = await (prisma as any).product.deleteMany({
    where: { id: { in: productIds } },
  });
  console.log(`  ✓ Products deleted: ${productsDeleted.count}`);

  console.log('\n  Done. Ready to re-seed.\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Clear failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
