import { IUserServiceClient } from '../../domain/engines/cod-eligibility.engine';

export class UserServiceClient implements IUserServiceClient {
    async getCODReputation(userId: string): Promise<{
        score: number;
        successfulOrders: number;
        suspendedUntil?: Date;
        permanentlyDisabled?: boolean;
    }> {
        console.log(`[UserServiceClient] Fetching COD reputation for user ${userId}`);
        throw new Error('UserServiceClient.getCODReputation is not implemented. Configure user-service integration.');
    }
}
