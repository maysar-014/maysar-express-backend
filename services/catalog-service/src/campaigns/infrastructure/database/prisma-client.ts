import { createPrismaClient } from '@shared/database/prisma-client';

export const prisma = createPrismaClient({
    log: ['warn', 'error']
});
