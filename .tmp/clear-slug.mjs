/**
 * Clears the slug row for the dev seller so the next GET /storefront
 * auto-generates a fresh slug from the business name.
 *
 * Run: node .tmp/clear-slug.mjs
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const SELLER_ID = process.env.SELLER_ID || 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z';

const existing = await prisma.sellerStorefront.findUnique({ where: { sellerId: SELLER_ID } });
if (existing) {
  await prisma.sellerStorefront.delete({ where: { sellerId: SELLER_ID } });
  console.log(`✅ Deleted slug row (was: "${existing.slug}"). Next GET /storefront will regenerate.`);
} else {
  console.log('ℹ️  No slug row found — nothing to delete.');
}

await prisma.$disconnect();
