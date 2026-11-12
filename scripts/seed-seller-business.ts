/**
 * Seed script: Create and verify a business record for a seller account.
 *
 * Use this in development when a seller user exists but has no business
 * registration, causing GET /api/catalog/sellers/:id/storefront to return 404.
 *
 * Run:
 *   npx tsx scripts/seed-seller-business.ts
 *
 * Optional env overrides:
 *   SELLER_ID=usr_...          (default: the standard dev seller)
 *   BUSINESS_NAME="My Shop"    (default: "Pendo Crafts")
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { makeId } from '../shared/ids/id';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const SELLER_ID   = process.env.SELLER_ID    || 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Pendo Crafts';

// Derive the expected slug from the business name (mirrors generateDefaultSlug logic)
function toSlug(name: string, sellerId: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (base.length > 0) return base;
  return sellerId.replace(/^usr_/i, '').slice(0, 12).toLowerCase();
}

async function main(): Promise<void> {
  console.log(`\nSeeding business for seller: ${SELLER_ID}`);
  console.log(`Business name: ${BUSINESS_NAME}\n`);

  // ------------------------------------------------------------------
  // 1. Check if a business already exists for this seller
  // ------------------------------------------------------------------
  const existing = await prisma.business.findFirst({
    where: { ownerId: SELLER_ID },
    select: { id: true, name: true, status: true, verificationStatus: true, complianceStatus: true }
  });

  if (existing) {
    console.log('ℹ️  Business already exists:');
    console.log(`   id:                 ${existing.id}`);
    console.log(`   name:               ${existing.name}`);
    console.log(`   status:             ${existing.status}`);
    console.log(`   verificationStatus: ${existing.verificationStatus}`);
    console.log(`   complianceStatus:   ${existing.complianceStatus}`);

    // Patch to storefront-eligible + update name to BUSINESS_NAME + fix registrationNumber format
    console.log('\n🔧 Patching business to ACTIVE + VERIFIED + COMPLIANT...');
    await prisma.business.update({
      where: { id: existing.id },
      data: {
        name:               BUSINESS_NAME,
        status:             'ACTIVE',
        verificationStatus: 'VERIFIED',
        complianceStatus:   'COMPLIANT',
        verifiedAt:         new Date(),
        verifiedBy:         'seed-script',
        // Fix non-compliant registrationNumber format if needed
        registrationNumber: existing.registrationNumber?.startsWith('TZ-')
          ? existing.registrationNumber
          : `TZ-DSM-${Date.now().toString().slice(-8)}`,
        // Ensure contact + identity fields are populated
        description:        `${BUSINESS_NAME} — quality products delivered across Tanzania`,
        industry:           ['retail', 'fashion'],
        email:              process.env.BUSINESS_EMAIL   || 'contact@pendocrafts.co.tz',
        phoneNumber:        process.env.BUSINESS_PHONE   || '+255744000001',
        website:            process.env.BUSINESS_WEBSITE || 'https://pendocrafts.co.tz',
      }
    });
    console.log('✅ Business patched.');

    // ------------------------------------------------------------------
    // 2. Reset the storefront slug ONLY if the business name changed
    // ------------------------------------------------------------------
    const expectedSlug = toSlug(BUSINESS_NAME, SELLER_ID);
    const existingSlugRow = await prisma.sellerStorefront.findUnique({ where: { sellerId: SELLER_ID } });
    const nameChanged = existing.name !== BUSINESS_NAME;

    if (existingSlugRow && nameChanged) {
      console.log(`\n🔧 Business name changed ("${existing.name}" → "${BUSINESS_NAME}"), resetting slug...`);
      console.log(`   Old slug: "${existingSlugRow.slug}" → New slug will be: "${expectedSlug}"`);
      await prisma.sellerStorefront.delete({ where: { sellerId: SELLER_ID } });
      console.log('✅ Old slug row deleted. Next GET /storefront will auto-generate the new slug.');
    } else if (!existingSlugRow) {
      console.log(`\nℹ️  No slug row exists yet. Next GET /storefront will generate "${expectedSlug}".`);
    } else {
      console.log(`\n✅ Slug unchanged: "${existingSlugRow.slug}" (business name not changed).`);
      console.log(`   Storefront accessible at: GET /api/catalog/sellers/${existingSlugRow.slug}/storefront`);
    }

    console.log('\nNow call:');
    console.log(`  GET /api/catalog/sellers/${SELLER_ID}/storefront`);
    return;
  }

  // ------------------------------------------------------------------
  // 2. Create a fresh business record
  // ------------------------------------------------------------------
  const businessId = makeId('biz');
  const addressId  = makeId('biz');

  // registrationNumber must match TZ-{region}-{number} format
  const registrationNumber = `TZ-DSM-${Date.now().toString().slice(-8)}`;

  await prisma.$transaction(async (tx) => {
    await tx.business.create({
      data: {
        id:                 businessId,
        name:               BUSINESS_NAME,
        businessType:       'SOLE_PROPRIETORSHIP',
        registrationNumber,
        ownerId:            SELLER_ID,
        status:             'ACTIVE',
        verificationStatus: 'VERIFIED',
        complianceStatus:   'COMPLIANT',
        verifiedAt:         new Date(),
        verifiedBy:         'seed-script',
        description:        `${BUSINESS_NAME} — quality products delivered across Tanzania`,
        industry:           ['retail', 'fashion'],
        email:              process.env.BUSINESS_EMAIL   || 'contact@pendocrafts.co.tz',
        phoneNumber:        process.env.BUSINESS_PHONE   || '+255744000001',
        website:            process.env.BUSINESS_WEBSITE || 'https://pendocrafts.co.tz',
      }
    });

    // Every business needs at least one address
    await tx.businessAddress.create({
      data: {
        id:         addressId,
        businessId: businessId,
        type:       'MAIN',
        street:     '1 Dev Street',
        city:       'Dar es Salaam',
        region:     'Dar es Salaam',
        country:    'Tanzania',
        isPrimary:  true,
      }
    });
  });

  console.log('✅ Business created and verified:');
  console.log(`   id:                 ${businessId}`);
  console.log(`   registrationNumber: ${registrationNumber}`);
  console.log(`   name:               ${BUSINESS_NAME}`);
  console.log(`   ownerId:            ${SELLER_ID}`);
  console.log('\nYou can now call:');
  console.log(`  GET /api/catalog/sellers/${SELLER_ID}/storefront`);
  console.log('The first request will auto-generate and persist the slug.\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
