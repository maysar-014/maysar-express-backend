import { eventBus, EventEnvelope } from '@shared/events/eventBus';
import { UpdateCODReputationUseCase, UpdateCODReputationInput } from '../../application/use-cases/update-cod-reputation.use-case';
import { CODAction } from '../../domain/engines/cod-reputation.engine';
import { logger } from '../../infrastructure/services/logger.service';

interface CODDeliveryEventPayload {
    orderId?: string;
    buyerId?: string;
    isCOD?: boolean;
    paymentMethod?: string;
    reason?: string;
}

interface CODDisputeResolvedPayload {
    disputeId?: string;
    decision?: string;
    orderId?: string;
    buyerId?: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const asDeliveryPayload = (value: unknown): CODDeliveryEventPayload => {
    const parsed = asRecord(value);
    return {
        orderId: typeof parsed.orderId === 'string' ? parsed.orderId : undefined,
        buyerId: typeof parsed.buyerId === 'string' ? parsed.buyerId : undefined,
        isCOD: typeof parsed.isCOD === 'boolean' ? parsed.isCOD : undefined,
        paymentMethod: typeof parsed.paymentMethod === 'string' ? parsed.paymentMethod : undefined,
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined
    };
};

const asDisputePayload = (value: unknown): CODDisputeResolvedPayload => {
    const parsed = asRecord(value);
    return {
        disputeId: typeof parsed.disputeId === 'string' ? parsed.disputeId : undefined,
        decision: typeof parsed.decision === 'string' ? parsed.decision : undefined,
        orderId: typeof parsed.orderId === 'string' ? parsed.orderId : undefined,
        buyerId: typeof parsed.buyerId === 'string' ? parsed.buyerId : undefined
    };
};

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
            const event = asDeliveryPayload(envelope.data);
            if (event.isCOD || event.paymentMethod === 'COD') {
                logger.info(`[Event] COD Delivery Success: ${event.orderId}`);
                if (!event.buyerId || !event.orderId) {
                    logger.warn('Skipping COD Delivery Success event due to missing buyerId/orderId');
                    return;
                }
                const payload: UpdateCODReputationInput = {
                    userId: event.buyerId,
                    orderId: event.orderId,
                    action: CODAction.DELIVERY_CONFIRMED
                };
                await this.updateCODReputationUseCase.execute(payload);
            }
        });

        // 2. Refused Delivery -> Decrement Score / Suspend
        eventBus.subscribe('Delivery.Failure.v1', async (envelope: EventEnvelope) => {
            const event = asDeliveryPayload(envelope.data);
            const isRefusal = event.reason === 'REFUSED_BY_CUSTOMER' || event.reason === 'REFUSED_BY_BUYER';
            if ((event.isCOD || event.paymentMethod === 'COD') && isRefusal) {
                logger.info(`[Event] COD Delivery Refused: ${event.orderId}`);
                if (!event.buyerId || !event.orderId) {
                    logger.warn('Skipping COD Delivery Failure event due to missing buyerId/orderId');
                    return;
                }
                const payload: UpdateCODReputationInput = {
                    userId: event.buyerId,
                    orderId: event.orderId,
                    action: CODAction.DELIVERY_REFUSED
                };
                await this.updateCODReputationUseCase.execute(payload);
            }
        });

        // 3. Alternative: DeliveryDelivered event (if used)
        eventBus.subscribe('DeliveryDelivered', async (envelope: EventEnvelope) => {
            const event = asDeliveryPayload(envelope.data);
            if (event.isCOD || event.paymentMethod === 'COD') {
                logger.info(`[Event] COD Delivery Delivered: ${event.orderId}`);
                if (!event.buyerId || !event.orderId) {
                    logger.warn('Skipping DeliveryDelivered event due to missing buyerId/orderId');
                    return;
                }
                const payload: UpdateCODReputationInput = {
                    userId: event.buyerId,
                    orderId: event.orderId,
                    action: CODAction.DELIVERY_CONFIRMED
                };
                await this.updateCODReputationUseCase.execute(payload);
            }
        });

        // 4. Dispute Resolution -> Correct Standing
        eventBus.subscribe('COD_DISPUTE_RESOLVED', async (envelope: EventEnvelope) => {
            const event = asDisputePayload(envelope.data);
            logger.info(`[Event] COD Dispute Resolved: ${event.disputeId} with ${event.decision}`);

            if (event.decision === 'FORFEIT_COMMITMENT' || event.decision === 'PENALIZE_BOTH') {
                if (!event.buyerId || !event.orderId) {
                    logger.warn('Skipping COD_DISPUTE_RESOLVED event due to missing buyerId/orderId');
                    return;
                }
                const payload: UpdateCODReputationInput = {
                    userId: event.buyerId,
                    orderId: event.orderId,
                    action: CODAction.DELIVERY_REFUSED // Treat as refusal if commitment forfeited
                };
                await this.updateCODReputationUseCase.execute(payload);
            }
        });
    }
}
