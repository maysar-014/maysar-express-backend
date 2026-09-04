import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';

let _fallbackPrisma: PrismaClient | null = null;

/**
 * Returns the shared global Prisma singleton if available (monolith mode),
 * otherwise lazily creates a dedicated client (standalone/test mode).
 * Using a lazy getter avoids connection pool exhaustion in the monolith.
 */
const getPrisma = (): PrismaClient => {
  const g = globalThis as unknown as { prisma?: PrismaClient };
  if (g.prisma) {
    return g.prisma;
  }
  if (!_fallbackPrisma) {
    _fallbackPrisma = createPrismaClient();
  }
  return _fallbackPrisma;
};

// Export a proxy so all repository calls go through the lazy getter
const prismaProxy = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export default prismaProxy as PrismaClient;
