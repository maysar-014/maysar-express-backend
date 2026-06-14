import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';
import { IAuthServiceClient } from '../../domain/engines/cod-eligibility.engine';

function getPrismaClient(): PrismaClient {
    // Reuse the global Prisma singleton to avoid creating a separate connection pool
    const global = globalThis as unknown as { prisma?: PrismaClient };
    if (!global.prisma) {
        global.prisma = createPrismaClient();
    }
    return global.prisma;
}

export class AuthServiceClient implements IAuthServiceClient {
    async isUserVerified(userId: string): Promise<boolean> {
        const bypass = process.env.ORDER_BYPASS_USER_VERIFICATION === 'true';
        if (bypass) {
            // eslint-disable-next-line no-console
            console.log(`[AuthServiceClient] Bypassing verification for user ${userId} (explicit override).`);
            return true;
        }

        const prisma = getPrismaClient() as any;
        const user = await prisma.user_User.findUnique({
            where: { id: userId },
            select: { isPhoneVerified: true, status: true }
        });

        return Boolean(user?.isPhoneVerified);
    }
}
