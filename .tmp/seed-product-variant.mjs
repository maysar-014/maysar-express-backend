/**
 * Seed: add a variant to the lifecycle test product so LC-19 can exercise
 * stock adjustment and reservation flows.
 *
 * Run: node .tmp/seed-product-variant.mjs
 */

import { PrismaClient } from '@prisma/client';

const PRODUCT_ID = 'cat_01M5YT3QK6T9H0W5CZ2W6XC1VR';
const VARIANT_ID = 'cat_var_lifecycle_test_001'; // predictable ID for idempotency

const prisma = new PrismaClient();

async function main() {
  // Check if variant already exists
  const existing = await prisma.productVariant.findFirst({
    where: { productId: PRODUCT_ID },
    select: { id: true, sku: true },
  });

  if (existing) {
    console.log(`✅ Variant already exists: ${existing.id} (sku: ${existing.sku})`);
    return existing.id;
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: PRODUCT_ID },
    select: { id: true, title: true },
  });

  if (!product) {
    console.error(`❌ Product ${PRODUCT_ID} not found`);
    process.exit(1);
  }

  console.log(`📦 Adding variant to: ${product.title}`);

  const variant = await prisma.productVariant.create({
    data: {
      id: VARIANT_ID,
      productId: PRODUCT_ID,
      sku: `SKU-LIFECYCLE-TEST-001`,
      name: 'Standard',
      price: 45000,
      status: 'active',
      inventoryPolicy: 'deny',
      attributes: { size: 'standard', color: 'default' },
    },
  });

  console.log(`✅ Variant created: ${variant.id}`);

  // Also create a stock record for this variant in the inventory service
  const stockItem = await prisma.inventory_StockItem.findFirst({
    where: { productVariantId: variant.id },
    select: { id: true },
  });

  if (!stockItem) {
    // Find or create a warehouse
    const warehouse = await prisma.inventory_Warehouse.findFirst({
      select: { id: true, name: true },
    });

    if (warehouse) {
      const newStock = await prisma.inventory_StockItem.create({
        data: {
          productVariantId: variant.id,
          warehouseId: warehouse.id,
          quantityAvailable: 100,
          quantityReserved: 0,
          reorderPoint: 10,
        },
      });
      console.log(`✅ Stock created: ${newStock.id} (qty: ${newStock.quantityAvailable})`);
    } else {
      console.log('⚠️  No warehouse found — stock record skipped');
    }
  } else {
    console.log(`✅ Stock record already exists: ${stockItem.id}`);
  }

  return variant.id;
}

main()
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
