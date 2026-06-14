import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';

// Reuse the shared global Prisma singleton so enabler-service does not open
// its own independent connection pool, preventing Postgres max_connections exhaustion.
// Pattern mirrors kyc-service and support-service.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
