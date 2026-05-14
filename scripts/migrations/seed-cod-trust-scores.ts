/**
 * Seed COD Trust Scores — One-time migration script
 *
 * Initialises the Progressive COD Trust System for all existing buyers:
 *   1. All existing buyers start at score 0 (NEW_BUYER tier) — conservative default
 *   2. Buyers with ≥ 1 historical successful COD delivery get a SUCCESSFUL_DELIVERY
 *      signal applied retroactively (score 0 → 8, still NEW_BUYER but with history)
 *
 * Run once after deploying the add_cod_trust_system migration.
 * Safe to re-run — uses upsert so existing records are not duplicated.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/migrations/seed-cod-trust-scores.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

function deriveTier(score: number): string {
  if (score <= 20) return 'NEW_BUYER';
  if (score <= 40) return 'TRUSTED_BEGINNER';
  return 'TRUSTED_BUYER';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function main() {
  console.log('🚀 Starting COD Trust Score seed migration...\n');

  // ── Step 1: Find all unique buyer IDs from order history ──────────────────
  console.log('📋 Step 1: Collecting all buyer IDs from order history...');

  const buyerRows = await (prisma as any).order_Order.findMany({
    select: { buyerId: true },
    distinct: ['buyerId'],
  });

  const allBuyerIds: string[] = buyerRows.map((r: any) => r.buyerId);
  console.log(`   Found ${allBuyerIds.length} unique buyers\n`);

  // ── Step 2: Find buyers with successful COD deliveries ────────────────────
  console.log('📦 Step 2: Finding buyers with successful COD deliveries...');

  const successfulCODRows = await (prisma as any).order_Order.findMany({
    where: {
      paymentMethod: 'COD',
      status: 'DELIVERED',
    },
    select: { buyerId: true },
  });

  // Count deliveries per buyer
  const deliveryCountByBuyer = new Map<string, number>();
  for (const row of successfulCODRows) {
    deliveryCountByBuyer.set(row.buyerId, (deliveryCountByBuyer.get(row.buyerId) ?? 0) + 1);
  }

  const buyersWithDeliveries = deliveryCountByBuyer.size;
  console.log(`   Found ${buyersWithDeliveries} buyers with successful COD deliveries\n`);

  // ── Step 3: Seed scores ───────────────────────────────────────────────────
  console.log('💾 Step 3: Seeding COD trust scores...');

  let seeded = 0;
  let skipped = 0;
  let errors = 0;

  const SUCCESSFUL_DELIVERY_DELTA = 8;
  const batchSize = 100;

  for (let i = 0; i < allBuyerIds.length; i += batchSize) {
    const batch = allBuyerIds.slice(i, i + batchSize);

    await Promise.all(batch.map(async (buyerId) => {
      try {
        const deliveries = deliveryCountByBuyer.get(buyerId) ?? 0;

        // Apply SUCCESSFUL_DELIVERY signal for each historical delivery (capped at score 100)
        let score = 0;
        const events: Array<{ delta: number; scoreBefore: number; scoreAfter: number }> = [];

        for (let d = 0; d < deliveries; d++) {
          const newScore = clamp(score + SUCCESSFUL_DELIVERY_DELTA, 0, 100);
          events.push({ delta: newScore - score, scoreBefore: score, scoreAfter: newScore });
          score = newScore;
        }

        const tier = deriveTier(score);

        // Upsert trust score
        await (prisma as any).order_CODTrustScore.upsert({
          where: { buyerId },
          create: { buyerId, score, tier },
          update: { score, tier },
        });

        // Append score events for audit trail (only if there are deliveries)
        if (events.length > 0) {
          await (prisma as any).order_CODScoreEvent.createMany({
            data: events.map(e => ({
              buyerId,
              signalType: 'SUCCESSFUL_DELIVERY',
              delta: e.delta,
              scoreBefore: e.scoreBefore,
              scoreAfter: e.scoreAfter,
              sourceService: 'migration:seed-cod-trust-scores',
              sourceEntityId: 'historical-backfill',
            })),
            skipDuplicates: false,
          });
        }

        seeded++;
      } catch (err: any) {
        console.error(`   ✗ Error seeding buyer ${buyerId}: ${err.message}`);
        errors++;
      }
    }));

    const progress = Math.min(i + batchSize, allBuyerIds.length);
    process.stdout.write(`   Progress: ${progress}/${allBuyerIds.length} buyers processed\r`);
  }

  console.log(`\n\n✅ Seed complete:`);
  console.log(`   Seeded:  ${seeded} buyers`);
  console.log(`   Skipped: ${skipped} buyers`);
  console.log(`   Errors:  ${errors} buyers`);

  // ── Step 4: Summary stats ─────────────────────────────────────────────────
  console.log('\n📊 Score distribution:');

  const newBuyerCount = await (prisma as any).order_CODTrustScore.count({
    where: { tier: 'NEW_BUYER' },
  });
  const trustedBeginnerCount = await (prisma as any).order_CODTrustScore.count({
    where: { tier: 'TRUSTED_BEGINNER' },
  });
  const trustedBuyerCount = await (prisma as any).order_CODTrustScore.count({
    where: { tier: 'TRUSTED_BUYER' },
  });

  console.log(`   NEW_BUYER (0–20):        ${newBuyerCount}`);
  console.log(`   TRUSTED_BEGINNER (21–40): ${trustedBeginnerCount}`);
  console.log(`   TRUSTED_BUYER (41–100):   ${trustedBuyerCount}`);
}

main()
  .catch((err) => {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
