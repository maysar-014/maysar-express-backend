/**
 * Prisma Database Client
 * Checkout service database connectivity
 */

import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient({
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

