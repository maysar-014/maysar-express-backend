import { CODReputationEngine, CODAction } from '../../domain/engines/cod-reputation.engine';

export interface UpdateCODReputationInput {
    userId: string;
    orderId: string;
    action: CODAction;
}

export class UpdateCODReputationUseCase {
    constructor(
        private readonly userRepository: any,
        private readonly reputationEngine: CODReputationEngine
    ) { }

    async execute(input: UpdateCODReputationInput) {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new Error(`User ${input.userId} not found`);
        }

        const isFirstSuccess = (user.codSuccessfulOrders || 0) === 0 && input.action === CODAction.DELIVERY_CONFIRMED;

        const result = this.reputationEngine.calculateNewScore(
            user.codReputationScore || 0,
            input.action,
            isFirstSuccess
        );

        // Update User standing
        const updates = {
            codReputationScore: result.newScore,
            codSuspendedUntil: result.suspendedUntil,
            codPermanentlyDisabled: result.permanentlyDisabled,
            codLastOrderAt: new Date(),
            codTotalOrders: (user.codTotalOrders || 0) + 1
        };

        if (input.action === CODAction.DELIVERY_CONFIRMED) {
            (updates as any).codSuccessfulOrders = (user.codSuccessfulOrders || 0) + 1;
            (updates as any).codEnabled = true; // Unlock COD if it was first success
        } else if (input.action === CODAction.DELIVERY_REFUSED) {
            (updates as any).codFailedOrders = (user.codFailedOrders || 0) + 1;
        }

        await this.userRepository.update(input.userId, updates);

        // Record History in User_CODHistory
        await this.userRepository.saveCODHistory({
            userId: input.userId,
            orderId: input.orderId,
            action: input.action,
            reputationChange: result.change,
            reputationAfter: result.newScore,
            reason: result.reason
        });

        console.log(`[Reputation] Updated user ${input.userId}: ${result.change > 0 ? '+' : ''}${result.change} (${result.newScore})`);
    }
}
