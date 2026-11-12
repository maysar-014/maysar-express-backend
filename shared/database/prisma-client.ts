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
export const normalizeDatabaseUrl = (url?: string): { url?: string; disableSsl?: boolean } => {
  if (!url) return { url };
  try {
    const parsed = new URL(url);
    if (isLocalHost(parsed.hostname) && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'disable');
    }
    // Pool sizing — these are Prisma Data Proxy / query-engine parameters.
    // connection_limit: max connections per engine process (default is unconstrained).
    // pool_timeout: seconds to wait for a free connection before throwing.
    // Pool sizing — these are Prisma Data Proxy / query-engine parameters.
    // connection_limit: max connections per engine process (default is unconstrained).
    // pool_timeout: seconds to wait for a free connection before throwing.
    //
    // DB_CONNECTION_LIMIT / DB_POOL_TIMEOUT are authoritative when set. They were
    // previously only consulted when the URL had no such parameter, so a URL
    // carrying `connection_limit=50` (as .env does) silently made both knobs dead.
    // That matters because the monolith opens more than one engine pool: 3 pools x
    // 50 = 150 requested against Postgres max_connections=100, so the excess was
    // refused and every affected request failed with P1001/P2024 after a 30s wait.
    // Setting the variable therefore *is* how you size the pool; it must not be
    // silently ignored just because the URL also carries a value.
    const envLimit = process.env.DB_CONNECTION_LIMIT?.trim();
    if (envLimit) {
      parsed.searchParams.set('connection_limit', envLimit);
    } else if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '50');
    }
    const envTimeout = process.env.DB_POOL_TIMEOUT?.trim();
    if (envTimeout) {
      parsed.searchParams.set('pool_timeout', envTimeout);
    } else if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '30');
    }
    // Statement timeout to prevent long-running queries from holding connections
    // PostgreSQL requires options in format: -c statement_timeout=5000 (raw space, URLSearchParams handles encoding)
    const envStatementTimeout = process.env.DB_STATEMENT_TIMEOUT?.trim();
    if (envStatementTimeout) {
      parsed.searchParams.set('options', `-c statement_timeout=${envStatementTimeout}`);
    } else if (!parsed.searchParams.has('options')) {
      parsed.searchParams.set('options', '-c statement_timeout=5000');
    } else if (!parsed.searchParams.get('options')?.includes('statement_timeout')) {
      const existingOptions = parsed.searchParams.get('options') || '';
      parsed.searchParams.set('options', `${existingOptions} -c statement_timeout=5000`);
    }
    return { url: parsed.toString(), disableSsl: isLocalHost(parsed.hostname) };
  } catch {
    return { url };
  }
};

export const createPrismaClient = (options?: Prisma.PrismaClientOptions): PrismaClient => {
  // Singleton enforcement: when called without custom options (the common monolith case),
  // reuse the single global client instead of opening a new connection pool.
  // This eliminates the "Can't reach database server" race errors caused by services
  // creating independent pools that haven't finished handshaking at startup.
  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
  if (!options && globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

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
  const withMiddleware = applyIdMiddleware(client);

  // Store the first no-options instance as the global singleton
  if (!options && !globalForPrisma.prisma) {
    globalForPrisma.prisma = withMiddleware;
  }

  return withMiddleware;
};
