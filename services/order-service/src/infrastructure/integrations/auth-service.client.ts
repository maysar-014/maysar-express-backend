import { createPrismaClient } from '@shared/database/prisma-client';
import { IAuthServiceClient } from '../../domain/engines/cod-eligibility.engine';

let prismaClient: ReturnType<typeof createPrismaClient> | null = null;

function getPrismaClient(): ReturnType<typeof createPrismaClient> {
    if (!prismaClient) {
        prismaClient = createPrismaClient();
    }
    return prismaClient;
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
