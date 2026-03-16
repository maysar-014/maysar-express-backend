import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';

export const prisma = createPrismaClient({
    log: ['query', 'error', 'info', 'warn']
});
