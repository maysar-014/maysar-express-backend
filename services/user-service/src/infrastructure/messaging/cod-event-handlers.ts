import { eventBus, EventEnvelope } from '@shared/events/eventBus';
import { UpdateCODReputationUseCase, UpdateCODReputationInput } from '../../application/use-cases/update-cod-reputation.use-case';
import { CODAction } from '../../domain/engines/cod-reputation.engine';
import { logger } from '../../infrastructure/services/logger.service';

export class CODEventHandler {
    constructor(
        private readonly updateCODReputationUseCase: UpdateCODReputationUseCase
    ) { }

    /**
     * Initialize all subscriptions for COD reputation tracking
     */
    public setupSubscriptions(): void {
        logger.info('📡 Setting up COD Reputation Event Subscriptions...');

        // 1. Successful Delivery -> Increment Score
        eventBus.subscribe('Delivery.Success.v1', async (envelope: EventEnvelope) => {
            const event = envelope.data;
            if (event.isCOD || event.paymentMethod === 'COD') {
                logger.info(`[Event] COD Delivery Success: ${event.orderId}`);
                await this.updateCODReputationUseCase.execute({
                    userId: event.buyerId,
                    orderId: event.orderId,
                    action: CODAction.DELIVERY_CONFIRMED
                });
            }
        });

        // 2. Refused Delivery -> Decrement Score / Suspend
        eventBus.subscribe('Delivery.Failure.v1', async (envelope: EventEnvelope) => {
            const event = envelope.data;
            const isRefusal = event.reason === 'REFUSED_BY_CUSTOMER' || event.reason === 'REFUSED_BY_BUYER';
            if ((event.isCOD || event.paymentMethod === 'COD') && isRefusal) {
                logger.info(`[Event] COD Delivery Refused: ${event.orderId}`);
                await this.updateCODReputationUseCase.execute({
                    userId: event.buyerId,
                    orderId: event.orderId,
                    action: CODAction.DELIVERY_REFUSED
                });
            }
        });

        // 3. Alternative: DeliveryDelivered event (if used)
        eventBus.subscribe('DeliveryDelivered', async (envelope: EventEnvelope) => {
            const event = envelope.data;
            if (event.isCOD || event.paymentMethod === 'COD') {
                logger.info(`[Event] COD Delivery Delivered: ${event.orderId}`);
                await this.updateCODReputationUseCase.execute({
                    userId: event.buyerId,
                    orderId: event.orderId,
                    action: CODAction.DELIVERY_CONFIRMED
                });
            }
        });

        // 4. Dispute Resolution -> Correct Standing
        eventBus.subscribe('COD_DISPUTE_RESOLVED', async (envelope: EventEnvelope) => {
            const event = envelope.data;
            logger.info(`[Event] COD Dispute Resolved: ${event.disputeId} with ${event.decision}`);

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
