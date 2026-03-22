import { Prisma, PrismaClient } from '@prisma/client';
import { applyIdMiddleware } from './prisma-id-middleware';

const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

const normalizeDatabaseUrl = (url?: string): { url?: string; disableSsl?: boolean } => {
  if (!url) return { url };
  try {
    const parsed = new URL(url);
    if (isLocalHost(parsed.hostname) && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'disable');
      return { url: parsed.toString(), disableSsl: true };
    }
    return { url: parsed.toString() };
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
