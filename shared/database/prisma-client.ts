import { Prisma, PrismaClient } from '@prisma/client';
import { applyIdMiddleware } from './prisma-id-middleware';

const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

/**
 * Normalise the database URL:
 *   - Disable SSL for local connections (avoids certificate errors in dev/test).
 *   - Append connection_limit and pool_timeout if not already present, so every
 *     createPrismaClient() call inherits the same bounded pool regardless of which
 *     service initialises globalThis.prisma first in the monolith.
 */
const normalizeDatabaseUrl = (url?: string): { url?: string; disableSsl?: boolean } => {
  if (!url) return { url };
  try {
    const parsed = new URL(url);
    if (isLocalHost(parsed.hostname) && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'disable');
    }
    // Pool sizing — these are Prisma Data Proxy / query-engine parameters.
    // connection_limit: max connections per engine process (default is unconstrained).
    // pool_timeout: seconds to wait for a free connection before throwing.
    if (!parsed.searchParams.has('connection_limit')) {
      const limit = process.env.DB_CONNECTION_LIMIT || '50';
      parsed.searchParams.set('connection_limit', limit);
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      const timeout = process.env.DB_POOL_TIMEOUT || '30';
      parsed.searchParams.set('pool_timeout', timeout);
    }
    return { url: parsed.toString(), disableSsl: isLocalHost(parsed.hostname) };
  } catch {
    return { url };
  }
};

export const createPrismaClient = (options?: Prisma.PrismaClientOptions): PrismaClient => {
  const normalizedOptions: Prisma.PrismaClientOptions = { ...(options ?? {}) };
  const urlSource =
    options?.datasources?.db?.url ??
    (options as Prisma.PrismaClientOptions | undefined)?.datasourceUrl ??
    process.env.DATABASE_URL;
  const { url, disableSsl } = normalizeDatabaseUrl(urlSource);
  if (disableSsl && !process.env.PGSSLMODE) {
    process.env.PGSSLMODE = 'disable';
  }
  if (url) {
    if (normalizedOptions.datasourceUrl) {
      normalizedOptions.datasourceUrl = url;
    } else {
      normalizedOptions.datasources = {
        ...(normalizedOptions.datasources ?? {}),
        db: {
          ...(normalizedOptions.datasources?.db ?? {}),
          url
        }
      };
    }
  }
  const client = new PrismaClient(normalizedOptions);
  return applyIdMiddleware(client);
};
