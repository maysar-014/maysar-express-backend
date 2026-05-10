import { IUserRepository } from '../../domain/repositories';
import { CODReputationEngine } from '../../domain/engines/cod-reputation.engine';

export class GetCODReputationUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly reputationEngine: CODReputationEngine = new CODReputationEngine()
    ) { }

    async execute(userId: string) {
        // In a real implementation, userRepository would be typed and fetch from database
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        const reputationScore = user.codReputationScore || 0;
        const successfulOrders = user.codSuccessfulOrders || 0;
        const failedOrders = user.codFailedOrders || 0;
        const totalOrders = user.codTotalOrders || 0;
        const suspendedUntil = user.codSuspendedUntil;
        const permanentlyDisabled = user.codPermanentlyDisabled || false;
        const eligibility = this.reputationEngine.isEligible(
            reputationScore,
            successfulOrders,
            suspendedUntil,
            permanentlyDisabled
        );

        return {
            userId: user.id,
            codEnabled: user.codEnabled || false,
            reputationScore,
            successfulOrders,
            failedOrders,
            totalOrders,
            lastOrderAt: user.codLastOrderAt,
            suspendedUntil,
            permanentlyDisabled,
            eligible: eligibility.eligible,
            eligibilityReason: eligibility.reason
        };
    }
}
