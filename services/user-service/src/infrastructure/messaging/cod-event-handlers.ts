import { eventBus } from '@shared/events/eventBus';
import { UpdateCODReputationUseCase, UpdateCODReputationInput } from '../../application/use-cases/update-cod-reputation.use-case';
import { CODAction } from '../../domain/engines/cod-reputation.engine';

export class CODEventHandler {
    constructor(
        private readonly updateCODReputationUseCase: UpdateCODReputationUseCase
    ) { }

    /**
     * Initialize all subscriptions for COD reputation tracking
     */
    public setupSubscriptions(): void {
        console.log('📡 Setting up COD Reputation Event Subscriptions...');

        // 1. Successful Delivery -> Increment Score
        eventBus.subscribe('Delivery.Delivered', async (event: any) => {
            if (event.isCOD || event.paymentMethod === 'COD') {
                console.log(`[Event] COD Delivery Success: ${event.orderId}`);
                await this.updateCODReputationUseCase.execute({
                    userId: event.buyerId,
                    orderId: event.orderId,
                    action: CODAction.DELIVERY_CONFIRMED
                });
            }
        });

        // 2. Refused Delivery -> Decrement Score / Suspend
        eventBus.subscribe('Delivery.Failed', async (event: any) => {
            const isRefusal = event.reason === 'REFUSED_BY_CUSTOMER' || event.reason === 'REFUSED_BY_BUYER';
            if ((event.isCOD || event.paymentMethod === 'COD') && isRefusal) {
                console.log(`[Event] COD Delivery Refused: ${event.orderId}`);
                await this.updateCODReputationUseCase.execute({
                    userId: event.buyerId,
                    orderId: event.orderId,
                    action: CODAction.DELIVERY_REFUSED
                });
            }
        });

        // 3. Dispute Resolution -> Correct Standing
        eventBus.subscribe('COD_DISPUTE_RESOLVED', async (event: any) => {
            console.log(`[Event] COD Dispute Resolved: ${event.disputeId} with ${event.decision}`);

            if (event.decision === 'FORFEIT_COMMITMENT' || event.decision === 'PENALIZE_BOTH') {
                await this.updateCODReputationUseCase.execute({
                    userId: event.buyerId,
                    orderId: event.orderId,
                    action: CODAction.DELIVERY_REFUSED // Treat as refusal if commitment forfeited
                });
            }
        });
    }
}
