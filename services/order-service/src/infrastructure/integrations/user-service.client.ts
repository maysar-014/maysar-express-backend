import { IUserServiceClient } from '../../domain/engines/cod-eligibility.engine';

export class UserServiceClient implements IUserServiceClient {
    async getCODReputation(userId: string): Promise<{
        score: number;
        successfulOrders: number;
        suspendedUntil?: Date;
        permanentlyDisabled?: boolean;
    }> {
        const bypass =
            process.env.ORDER_BYPASS_USER_VERIFICATION === 'true' ||
            process.env.NODE_ENV !== 'production';
        if (bypass) {
            // eslint-disable-next-line no-console
            console.log(`[UserServiceClient] Bypassing COD reputation for user ${userId} (non-production).`);
            return { score: 100, successfulOrders: 0 };
        }
        // eslint-disable-next-line no-console
        console.log(`[UserServiceClient] Fetching COD reputation for user ${userId}`);
        throw new Error('UserServiceClient.getCODReputation is not implemented. Configure user-service integration.');
    }
}
