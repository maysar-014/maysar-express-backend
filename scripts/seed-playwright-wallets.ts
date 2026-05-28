import { PrismaClient } from '@prisma/client';
import { makeId, getModelPrefix } from '../shared/ids/id';

const prisma = new PrismaClient();

const USERS_TO_SEED_WALLETS = [
  { id: 'usr_01KSGE6X98QF3CBR5AVD0XRG24', balance: 100000 }, // buyer
  { id: 'usr_01KSGE71FYGDX7JG9WEQAXN3D6', balance: 50000 },  // seller
  { id: 'usr_01KSGE75DEKNYK70FZNXCTQB8G', balance: 10000 },  // enabler
  { id: 'usr_01KSGE79GK9X92TR8AQC4PHT8M', balance: 0 },      // supplier
  { id: 'usr_01KSGE7DWT26N2WWWNBRM97QMQ', balance: 0 },      // courier
  { id: 'usr_01KS80725GQ97YM4A4HDDAZHFW', balance: 0 },      // admin
];

async function main() {
  console.log('Seeding wallets for Playwright users...');
  for (const user of USERS_TO_SEED_WALLETS) {
    const existingWallet = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM wallets WHERE "userId"::text = ${user.id} LIMIT 1
    `;

    if (existingWallet.length === 0) {
      const walletId = makeId(getModelPrefix('Wallet'));
      await prisma.$executeRaw`
        INSERT INTO wallets (id, "userId", balance, currency, status, "frozenAmount", version, "createdAt", "updatedAt")
        VALUES (
          ${walletId},
          ${user.id},
          ${user.balance},
          'TZS',
          'ACTIVE',
          0,
          0,
          NOW(),
          NOW()
        )
      `;
      console.log(`Created wallet ${walletId} for user ${user.id} with balance ${user.balance}`);
    } else {
      console.log(`Wallet already exists for user ${user.id}: ${existingWallet[0].id}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
