import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';

// Pool-parameter normalization (connection_limit, pool_timeout, sslmode) is now applied
// inside createPrismaClient() in shared/database/prisma-client.ts, so every service
// that calls createPrismaClient() receives the same bounded pool regardless of which
// module initialises globalThis.prisma first. No manual URL manipulation needed here.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
