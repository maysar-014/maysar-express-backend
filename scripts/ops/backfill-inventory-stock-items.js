/**
 * backfill-inventory-stock-items.js
 *
 * One-time migration: creates inventory_StockItem records for every
 * product variant that doesn't already have one.
 *
 * - Assigns stock to the first active warehouse (by createdAt)
 * - Sets quantityAvailable = DEFAULT_QUANTITY (default: 50)
 * - Idempotent: skips variants that already have a stock item
 * - Safe: read-only dry-run mode with --dry-run flag
 *
 * Usage:
 *   node scripts/ops/backfill-inventory-stock-items.js            # live run
 *   node scripts/ops/backfill-inventory-stock-items.js --dry-run  # preview only
 *   DEFAULT_QUANTITY=100 node scripts/ops/backfill-inventory-stock-items.js
 */

'use strict';

const path = require('path');
const { randomUUID } = require('crypto');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { PrismaClient } = require('@prisma/client');

const DRY_RUN = process.argv.includes('--dry-run');
const DEFAULT_QUANTITY = Math.max(0, parseInt(process.env.DEFAULT_QUANTITY || '50', 10));
const BATCH_SIZE = 100;

const prisma = new PrismaClient();

function makeStockId() {
  return 'inv_stk_' + randomUUID().replace(/-/g, '').slice(0, 20);
}

async function main() {
  console.log('\n========================================');
  console.log('  Backfill inventory stock items');
  console.log('========================================');
  console.log(`Mode             : ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Default quantity : ${DEFAULT_QUANTITY}`);
  console.log('');

  // 1. Find the primary warehouse
  const warehouse = await prisma.inventory_Warehouse.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'asc' }
  });

  if (!warehouse) {
    console.error('✗ No active warehouse found. Cannot backfill stock items.');
    process.exit(1);
  }

  console.log(`Warehouse : ${warehouse.id} — ${warehouse.name}\n`);

  // 2. Load all variant IDs that already have a stock item
  console.log('Loading existing stock items...');
  const existingStockItems = await prisma.inventory_StockItem.findMany({
    select: { productVariantId: true }
  });
  const coveredVariantIds = new Set(existingStockItems.map(s => s.productVariantId));
  console.log(`  ${coveredVariantIds.size} variants already have stock items\n`);

  // 3. Load all product variants in batches
  let skip = 0;
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalSkipped = 0;

  console.log('Processing variants...');

  while (true) {
    const variants = await prisma.productVariant.findMany({
      skip,
      take: BATCH_SIZE,
      select: { id: true, sku: true, productId: true }
    });

    if (variants.length === 0) break;

    for (const variant of variants) {
      totalProcessed++;

      if (coveredVariantIds.has(variant.id)) {
        totalSkipped++;
        continue;
      }

      const stockId = makeStockId();
      const sku = (variant.sku || variant.id).slice(0, 95) + '-stk';

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create stock item for variant ${variant.id} (product ${variant.productId})`);
      } else {
        try {
          await prisma.inventory_StockItem.create({
            data: {
              id: stockId,
              productVariantId: variant.id,
              warehouseId: warehouse.id,
              sku,
              quantityAvailable: DEFAULT_QUANTITY,
              quantityReserved: 0,
              quantityDamaged: 0,
              quantityOnOrder: 0,
              reorderPoint: 0,
              status: 'active'
            }
          });
          totalCreated++;

          if (totalCreated % 50 === 0) {
            console.log(`  Created ${totalCreated} stock items so far...`);
          }
        } catch (err) {
          // Handle race condition — another process may have created it
          if (err.code === 'P2002') {
            totalSkipped++;
          } else {
            console.error(`  ✗ Failed for variant ${variant.id}: ${err.message}`);
          }
        }
      }

      if (DRY_RUN) totalCreated++;
    }

    skip += BATCH_SIZE;
  }

  console.log('\n========================================');
  console.log('  Summary');
  console.log('========================================');
  console.log(`Total variants processed : ${totalProcessed}`);
  console.log(`Already had stock items  : ${totalSkipped}`);
  console.log(`${DRY_RUN ? 'Would create' : 'Created'}              : ${totalCreated}`);
  if (DRY_RUN) {
    console.log('\nThis was a dry run. Re-run without --dry-run to apply changes.');
  } else {
    console.log(`\n✓ Done. ${totalCreated} stock items created with ${DEFAULT_QUANTITY} units each.`);
    console.log('  Products will now show "in_stock" when fetched from the catalog.');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
