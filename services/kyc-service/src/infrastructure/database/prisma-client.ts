import { createPrismaClient } from '@shared/database/prisma-client';
import { PrismaClient } from '@prisma/client';

// Reuse the global singleton to avoid exhausting the Postgres connection pool.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
