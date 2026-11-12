/**
 * Seed an enabler_Profile row for the seeded enabler user.
 * Run with: node scripts/verification/seed-enabler-profile.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ENABLER_USER_ID = 'usr_01KRFZ1E8HMAE7MMH175PJ9337';
const ENABLER_PROFILE_ID = 'enb_01KRFZ1E8HMAE7MMH175PJ9337';

async function main() {
  console.log('Seeding enabler profile...');

  // Check if already exists
  const existing = await prisma.enabler_Profile.findUnique({
    where: { userId: ENABLER_USER_ID }
  }).catch(() => null);

  if (existing) {
    console.log('  ✅ Enabler profile already exists:', existing.id);
    return;
  }

  // Create the enabler profile
  const profile = await prisma.enabler_Profile.create({
    data: {
      id: ENABLER_PROFILE_ID,
      userId: ENABLER_USER_ID,
      enablerCode: 'ENB-ZAWADI',
      enablerCodeShort: 'ENB-ZA',
      businessName: 'Zawadi Omondi - Maysar Enabler',
      contactEmail: 'enabler@maysar.co.tz',
      contactPhone: '+255700000006',
      businessDescription: 'Seeded enabler for lifecycle verification testing.',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      tier: 'STANDARD',
      commissionRate: 0.05,
      totalSales: 0,
      totalOrders: 0,
      conversionRate: 0,
      totalCommissionEarned: 0,
      approvedBy: 'usr_ADMIN000000000000000000001',
      approvedAt: new Date(),
      termsVersion: '1.0',
      termsAcceptedAt: new Date(),
      trainingStatus: 'completed',
      trainingCompletedAt: new Date(),
      activatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }).catch(err => {
    console.error('  ❌ Failed to create enabler profile:', err.message);
    process.exit(1);
  });

  console.log('  ✅ Enabler profile created:', profile.id, 'for user:', ENABLER_USER_ID);
}

main()
  .catch(err => { console.error('Fatal:', err.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
