/**
 * seed-product-condition-cod.js
 *
 * Seeds condition and codAccepted fields for all existing products.
 *
 * Logic:
 *  - Food/grocery products → condition: 'new', codAccepted: true  (perishables, easy COD)
 *  - Electronics/appliances → condition: 'new', codAccepted: false (high value, no COD by default)
 *  - Bags/footwear → condition: 'new', codAccepted: true
 *  - Test/dev products → condition: 'new', codAccepted: false
 *
 * Usage:
 *   node scripts/ops/seed-product-condition-cod.js            # live
 *   node scripts/ops/seed-product-condition-cod.js --dry-run  # preview
 */

'use strict';

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const DRY_RUN = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Per-product overrides — condition and COD based on product nature
// ---------------------------------------------------------------------------
const PRODUCT_OVERRIDES = {
  // Cooking oils — new, COD ok (affordable, everyday items)
  '6086b81d-beff-47a2-b934-d671fd608de5': { condition: 'new', codAccepted: true  }, // Azam Sunflower Oil 5L
  'f382b77b-dc38-47f9-a50a-4638403a129a': { condition: 'new', codAccepted: true  }, // Mount Meru Soy Oil 2L

  // Rice & flour — new, COD ok
  '56ca53bf-4782-4e56-aa98-9ce2c945ac36': { condition: 'new', codAccepted: true  }, // Kilombero Rice 5kg
  '4b901801-aa22-490e-bc4d-fe68afd04734': { condition: 'new', codAccepted: true  }, // Mbeya Sifa Rice 25kg
  '67924632-cb8f-4073-b730-683d97df58b8': { condition: 'new', codAccepted: true  }, // Uhuru Mills Maize Flour 10kg

  // Small kitchen appliances — new, no COD (higher value electronics)
  'ac2e0085-6720-4812-af48-109bdfc921b6': { condition: 'new', codAccepted: false }, // Sayona Blender
  '312853bb-408d-4e6a-8e1d-c40ab006e917': { condition: 'new', codAccepted: false }, // Decakila Kettle

  // Bags & footwear — new, COD ok
  '9c745e86-00e3-431e-8cb7-812caab14866': { condition: 'new', codAccepted: true  }, // Urban Trek Backpack
  'ab9c17b5-1000-4d8e-b30e-e6c7044dd493': { condition: 'new', codAccepted: true  }, // SafariStep Sneakers

  // Test/dev products — new, no COD
  'cat_pro_01KR1Q9693EF7S6S1X7E2QWA5P':   { condition: 'new', codAccepted: false }, // Azam Uji Porridge (test)
  'cat_pro_01KR1QVJJS97CMKDE9RK5TK9CD':   { condition: 'new', codAccepted: false }, // Azam Porridge (test)
  'cat_pro_01KR1QX27W44RN4N0QVBXKAQN6':   { condition: 'new', codAccepted: false }, // Azam Porridge (test)
};

// Default for any product not in the overrides
const DEFAULT = { condition: 'new', codAccepted: false };

async function main() {
  console.log('\n========================================');
  console.log('  Seed product condition & COD support');
  console.log('========================================');
  console.log(`Mode : ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  const products = await prisma.product.findMany({
    select: { id: true, title: true }
  });

  console.log(`Found ${products.length} products\n`);

  let updated = 0;

  for (const product of products) {
    const override = PRODUCT_OVERRIDES[product.id] ?? DEFAULT;
    const { condition, codAccepted } = override;

    console.log(`${product.title}`);
    console.log(`  condition=${condition}  codAccepted=${codAccepted}`);

    if (!DRY_RUN) {
      await prisma.product.update({
        where: { id: product.id },
        data: { condition, codAccepted }
      });
      updated++;
    }
  }

  console.log('\n========================================');
  console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${DRY_RUN ? products.length : updated} products`);
  console.log('========================================\n');

  if (DRY_RUN) {
    console.log('Re-run without --dry-run to apply.\n');
  } else {
    console.log('✓ Done.\n');
  }

  await prisma.$disconnect();
}

main().catch(async e => {
  console.error('Error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
