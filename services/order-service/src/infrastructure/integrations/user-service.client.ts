import { createPrismaClient } from '@shared/database/prisma-client';
import { IUserServiceClient } from '../../domain/engines/cod-eligibility.engine';

let prismaClient: ReturnType<typeof createPrismaClient> | null = null;

function getPrismaClient(): ReturnType<typeof createPrismaClient> {
    if (!prismaClient) {
        prismaClient = createPrismaClient();
    }
    return prismaClient;
}

export class UserServiceClient implements IUserServiceClient {
    async getCODReputation(userId: string): Promise<{
        score: number;
        successfulOrders: number;
        suspendedUntil?: Date;
        permanentlyDisabled?: boolean;
    }> {
        const bypass = process.env.ORDER_BYPASS_USER_VERIFICATION === 'true';
        if (bypass) {
            // eslint-disable-next-line no-console
            console.log(`[UserServiceClient] Bypassing COD reputation for user ${userId} (explicit override).`);
            return { score: 100, successfulOrders: 0 };
        }

        const prisma = getPrismaClient() as any;
        const user = await prisma.user_User.findUnique({
            where: { id: userId },
            select: {
                codReputationScore: true,
                codSuccessfulOrders: true,
                codSuspendedUntil: true,
                codPermanentlyDisabled: true
            }
        });

        return {
            score: Number(user?.codReputationScore ?? 0),
            successfulOrders: Number(user?.codSuccessfulOrders ?? 0),
            suspendedUntil: user?.codSuspendedUntil ?? undefined,
            permanentlyDisabled: Boolean(user?.codPermanentlyDisabled ?? false)
        };
    }
}
