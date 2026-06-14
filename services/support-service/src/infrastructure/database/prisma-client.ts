import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';

// Reuse the global singleton to avoid creating independent connection pools
// that exhaust the Postgres max_connections limit in the monolith.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
