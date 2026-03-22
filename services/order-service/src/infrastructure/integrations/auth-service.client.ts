import { IAuthServiceClient } from '../../domain/engines/cod-eligibility.engine';

export class AuthServiceClient implements IAuthServiceClient {
    async isUserVerified(userId: string): Promise<boolean> {
        // In a real distributed system, this should call the Auth service.
        const bypass =
            process.env.ORDER_BYPASS_USER_VERIFICATION === 'true' ||
            process.env.NODE_ENV !== 'production';
        if (bypass) {
            // eslint-disable-next-line no-console
            console.log(`[AuthServiceClient] Bypassing verification for user ${userId} (non-production).`);
            return true;
        }
        // eslint-disable-next-line no-console
        console.log(`[AuthServiceClient] Checking verification for user ${userId}`);
        throw new Error('AuthServiceClient.isUserVerified is not implemented. Configure auth-service integration.');
    }
}
