import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '../../../shared/database/prisma-client';

export const prisma = createPrismaClient();

export const resetDatabase = async (): Promise<void> => {
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'"
  );

  if (!tables.length) {
    return;
  }

  const tableNames = tables.map(table => `"${table.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
};

export const seedDatabase = async (seedFn?: (client: PrismaClient) => Promise<void>): Promise<void> => {
  if (seedFn) {
    await seedFn(prisma);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
