import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';

const prisma = createPrismaClient();

export default prisma;
