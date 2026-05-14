/**
 * Development Seed Script — Users, Wallets, and KYC
 *
 * Creates one user per role plus a super-admin account.
 * Safe to re-run — uses upsert on email so existing records are not duplicated.
 *
 * Roles seeded:
 *   system   — super admin (full platform access)
 *   buyer    — verified buyer with KYC level 3, funded wallet (100,000 TZS)
 *   seller   — verified seller with KYC level 2, funded wallet (50,000 TZS)
 *   supplier — verified supplier
 *   courier  — verified courier
 *   enabler  — verified enabler
 *
 * All passwords: Maysar@2024!
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-dev-users.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { makeId, getModelPrefix } from '../shared/ids/id';

dotenv.config();

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'Maysar@2024!';
const CURRENCY = 'TZS';

// ─── Seed definitions ─────────────────────────────────────────────────────────

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  kycLevel: number;
  kycStatus: string;
  walletBalance: number;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  description: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@maysar.co.tz',
    firstName: 'Super',
    lastName: 'Admin',
    phoneNumber: '+255700000001',
    role: 'system',
    kycLevel: 3,
    kycStatus: 'VERIFIED',
    walletBalance: 0,
    isEmailVerified: true,
    isPhoneVerified: true,
    description: 'Super Admin — full platform access',
  },
  {
    email: 'buyer@maysar.co.tz',
    firstName: 'Amina',
    lastName: 'Hassan',
    phoneNumber: '+255700000002',
    role: 'buyer',
    kycLevel: 3,
    kycStatus: 'VERIFIED',
    walletBalance: 100_000,
    isEmailVerified: true,
    isPhoneVerified: true,
    description: 'Verified buyer — KYC level 3, funded wallet (100,000 TZS)',
  },
  {
    email: 'seller@maysar.co.tz',
    firstName: 'Juma',
    lastName: 'Mwangi',
    phoneNumber: '+255700000003',
    role: 'seller',
    kycLevel: 2,
    kycStatus: 'VERIFIED',
    walletBalance: 50_000,
    isEmailVerified: true,
    isPhoneVerified: true,
    description: 'Verified seller — KYC level 2, funded wallet (50,000 TZS)',
  },
  {
    email: 'supplier@maysar.co.tz',
    firstName: 'Fatuma',
    lastName: 'Ally',
    phoneNumber: '+255700000004',
    role: 'supplier',
    kycLevel: 2,
    kycStatus: 'VERIFIED',
    walletBalance: 0,
    isEmailVerified: true,
    isPhoneVerified: true,
    description: 'Verified supplier',
  },
  {
    email: 'courier@maysar.co.tz',
    firstName: 'Baraka',
    lastName: 'Kimani',
    phoneNumber: '+255700000005',
    role: 'courier',
    kycLevel: 2,
    kycStatus: 'VERIFIED',
    walletBalance: 0,
    isEmailVerified: true,
    isPhoneVerified: true,
    description: 'Verified courier',
  },
  {
    email: 'enabler@maysar.co.tz',
    firstName: 'Zawadi',
    lastName: 'Omondi',
    phoneNumber: '+255700000006',
    role: 'enabler',
    kycLevel: 2,
    kycStatus: 'VERIFIED',
    walletBalance: 0,
    isEmailVerified: true,
    isPhoneVerified: true,
    description: 'Verified enabler',
  },
];

// ─── Role enum maps ───────────────────────────────────────────────────────────

// Auth_UserRole enum keys (Prisma enum names, not @map values)
const AUTH_ROLE_MAP: Record<string, string> = {
  system: 'SYSTEM',
  buyer: 'BUYER',
  seller: 'SELLER',
  supplier: 'SUPPLIER',
  courier: 'COURIER',
  enabler: 'ENABLER',
};

// User_UserRole enum keys
const USER_ROLE_MAP: Record<string, string> = {
  system: 'SYSTEM',
  buyer: 'BUYER',
  seller: 'SELLER',
  supplier: 'SUPPLIER',
  courier: 'COURIER',
  enabler: 'ENABLER',
};

function log(msg: string) { console.log(`  ${msg}`); }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           Maysar Development User Seed Script            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`  Password for all accounts: ${DEFAULT_PASSWORD}\n`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  const seededUsers: Array<{ email: string; role: string; id: string }> = [];

  for (const user of SEED_USERS) {
    console.log(`\n─── ${user.description} ───`);
    console.log(`  Email: ${user.email}  Role: ${user.role}`);

    // ── 1. Check if user already exists ──────────────────────────────────
    const existingAuthUser = await (prisma as any).user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    const userId: string = existingAuthUser?.id ?? makeId(getModelPrefix('User'));
    console.log(`  ID:    ${userId}`);

    // ── 2. Upsert auth_users (User model — used by auth service) ─────────
    await (prisma as any).user.upsert({
      where: { email: user.email },
      create: {
        id: userId,
        email: user.email,
        passwordHash,
        role: AUTH_ROLE_MAP[user.role] ?? 'BUYER',
        status: 'ACTIVE',
        phoneNumber: user.phoneNumber,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
      update: {
        passwordHash,
        role: AUTH_ROLE_MAP[user.role] ?? 'BUYER',
        status: 'ACTIVE',
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
    log('✓ auth_users upserted');

    // ── 3. Upsert users (User_User model — used by user service) ─────────
    await (prisma as any).user_User.upsert({
      where: { email: user.email },
      create: {
        id: userId,
        email: user.email,
        passwordHash,
        role: USER_ROLE_MAP[user.role] ?? 'BUYER',
        status: 'ACTIVE',
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        emailVerifiedAt: user.isEmailVerified ? new Date() : null,
        phoneVerifiedAt: user.isPhoneVerified ? new Date() : null,
        kycStatus: user.kycStatus,
        kycLevel: user.kycLevel,
        kycVerifiedAt: user.kycLevel > 0 ? new Date() : null,
        codEnabled: user.role === 'buyer',
        kycLimitMaxListings: user.kycLevel >= 2 ? 100 : 5,
        kycLimitMaxTransactions: user.kycLevel >= 3 ? 1000 : user.kycLevel >= 2 ? 50 : 1,
        kycLimitMaxEarnings: user.kycLevel >= 3 ? 10_000_000 : user.kycLevel >= 2 ? 1_000_000 : 0,
      },
      update: {
        passwordHash,
        status: 'ACTIVE',
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        kycStatus: user.kycStatus,
        kycLevel: user.kycLevel,
        kycVerifiedAt: user.kycLevel > 0 ? new Date() : null,
        codEnabled: user.role === 'buyer',
        kycLimitMaxListings: user.kycLevel >= 2 ? 100 : 5,
        kycLimitMaxTransactions: user.kycLevel >= 3 ? 1000 : user.kycLevel >= 2 ? 50 : 1,
        kycLimitMaxEarnings: user.kycLevel >= 3 ? 10_000_000 : user.kycLevel >= 2 ? 1_000_000 : 0,
      },
    });
    log('✓ users upserted');

    // ── 4. Create wallet if needed ────────────────────────────────────────
    const rolesWithWallets = ['buyer', 'seller', 'enabler'];
    if (rolesWithWallets.includes(user.role) || user.walletBalance > 0) {
      // Use raw SQL to avoid any Prisma UUID validation on existing rows
      const existingWallet = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM wallets WHERE "userId"::text = ${userId} LIMIT 1
      `;

      if (existingWallet.length === 0) {
        const walletId = makeId(getModelPrefix('Wallet'));
        await prisma.$executeRaw`
          INSERT INTO wallets (id, "userId", balance, currency, status, "frozenAmount", version, "createdAt", "updatedAt")
          VALUES (
            ${walletId},
            ${userId},
            ${user.walletBalance},
            ${CURRENCY},
            'ACTIVE',
            0,
            0,
            NOW(),
            NOW()
          )
        `;

        if (user.walletBalance > 0) {
          const txId = makeId(getModelPrefix('Wallet_Transaction'));
          await prisma.$executeRaw`
            INSERT INTO wallet_transactions (
              id, "walletId", "userId", type, amount, currency,
              "balanceBefore", "balanceAfter",
              "frozenAmountBefore", "frozenAmountAfter",
              description, reason,
              "initiatedBy", "initiatedByType",
              "isReversed", "isCODRelated", "codConfirmationRequired",
              "idempotencyKey", "correlationId",
              "createdAt"
            ) VALUES (
              ${txId}, ${walletId}, ${userId},
              'CREDIT', ${user.walletBalance}, ${CURRENCY},
              0, ${user.walletBalance},
              0, 0,
              'Initial seed credit', 'SEED_CREDIT',
              'seed-script', 'SERVICE',
              false, false, false,
              ${'seed-' + userId + '-initial'},
              ${require('crypto').randomUUID()},
              NOW()
            )
          `;
          log(`✓ Wallet created — ${user.walletBalance.toLocaleString()} TZS`);
        } else {
          log('✓ Wallet created — zero balance');
        }
      } else {
        log(`✓ Wallet already exists (id: ${existingWallet[0].id})`);
      }
    }

    // ── 5. Seed COD trust score for buyers ────────────────────────────────
    if (user.role === 'buyer') {
      await (prisma as any).order_CODTrustScore.upsert({
        where: { buyerId: userId },
        create: { buyerId: userId, score: 0, tier: 'NEW_BUYER' },
        update: {},
      });
      log('✓ COD trust score initialised (score: 0, tier: NEW_BUYER)');
    }

    seededUsers.push({ email: user.email, role: user.role, id: userId });
    log('✓ Done');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                        Seed Complete ✓                               ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  Role       Email                        Password                   ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  for (const u of seededUsers) {
    const role = u.role.padEnd(10);
    const email = u.email.padEnd(36);
    console.log(`║  ${role} ${email} ${DEFAULT_PASSWORD}         ║`);
  }
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  User IDs:                                                           ║');
  for (const u of seededUsers) {
    const role = u.role.padEnd(10);
    console.log(`║  ${role} ${u.id.padEnd(56)} ║`);
  }
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Seed failed:', err.message);
    if (process.env.DEBUG_SEED) console.error(err.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
