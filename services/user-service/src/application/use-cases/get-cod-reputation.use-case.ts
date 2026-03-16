import { IUserRepository } from '../../domain/repositories';

export class GetCODReputationUseCase {
    constructor(private readonly userRepository: IUserRepository) { }

    async execute(userId: string) {
        // In a real implementation, userRepository would be typed and fetch from database
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        return {
            userId: user.id,
            codEnabled: user.codEnabled || false,
            reputationScore: user.codReputationScore || 0,
            successfulOrders: user.codSuccessfulOrders || 0,
            failedOrders: user.codFailedOrders || 0,
            totalOrders: user.codTotalOrders || 0,
            lastOrderAt: user.codLastOrderAt,
            suspendedUntil: user.codSuspendedUntil,
            permanentlyDisabled: user.codPermanentlyDisabled || false
        };
    }
}
