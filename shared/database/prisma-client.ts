import { Prisma, PrismaClient } from '@prisma/client';
import { applyIdMiddleware } from './prisma-id-middleware';

export const createPrismaClient = (options?: Prisma.PrismaClientOptions): PrismaClient => {
  const client = new PrismaClient(options);
  return applyIdMiddleware(client);
};
