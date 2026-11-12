
import { PaymentProcessingSaga } from '../../application/sagas/payment-processing.saga';
import { IEventBus } from '../../infrastructure/messaging/event-bus.interface';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { makeId, getModelPrefix } from '../../../../../shared/ids/id';

// NOTE: Do NOT capture the prisma client at module load time — at that point
// globalThis.prisma may not yet be set by the monolith bootstrap. Resolve it
// lazily inside each handler to always get the shared singleton.
function getPrisma(): any {
    return (globalThis as any).prisma ?? new PrismaClient();
}

export class SagaEventHandler {
    constructor(
        private readonly saga: PaymentProcessingSaga,
        private readonly eventBus: IEventBus
    ) { }

    async setupSubscriptions(): Promise<void> {
        // Subscribe to events that trigger the saga
        await this.eventBus.subscribe('OrderCreated', this.handleOrderCreated.bind(this));
        await this.eventBus.subscribe('PaymentRetryRequested', this.handlePaymentRetry.bind(this));

        // Subscribe to Wallet Service events
        await this.eventBus.subscribe('WalletPaymentProcessed', this.handleWalletPaymentProcessed.bind(this));
        await this.eventBus.subscribe('WalletPaymentFailed', this.handleWalletPaymentFailed.bind(this));
    }

    private async handleOrderCreated(event: any): Promise<void> {
        console.log('[SagaEventHandler] Handling OrderCreated event', JSON.stringify(event?.data || event)?.slice(0, 200));

        // Handle both envelope and raw payload
        const payload = event.data || event;
        const metadata = event.metadata || {};

        if (!payload?.orderId) {
            console.error('[SagaEventHandler] OrderCreated event missing orderId — skipping payment creation');
            return;
        }

        const paymentId = makeId(getModelPrefix('Payment_Payment'));
        const initialState = {
            paymentId,
            orderId: payload.orderId,
            userId: payload.userId,
            amount: payload.totalAmount,
            currency: payload.currency || 'TZS',
            method: payload.paymentMethod || 'MOBILE_MONEY'
        };

        const correlationId = metadata.correlationId || uuidv4();

        // Create a payment record so the payment is queryable by orderId
        // This runs before the saga processes — the saga will update the
        // status as wallet/payment gateway processing completes.
        try {
            await getPrisma().payment_Payment.create({
                data: {
                    id: paymentId,
                    orderId: payload.orderId,
                    userId: payload.userId,
                    amount: Number(payload.totalAmount ?? 0),
                    currency: payload.currency || 'TZS',
                    method: payload.paymentMethod || 'WALLET',
                    // Map payment method to correct PaymentProvider enum value
                    provider: (payload.paymentMethod || 'WALLET') === 'WALLET'
                        ? 'INTERNAL_WALLET'
                        : (payload.paymentMethod || 'WALLET') === 'BANK_TRANSFER'
                            ? 'INTERNAL_BANK_TRANSFER'
                            : 'PAYMENT_GATEWAY',
                    status: 'PENDING',
                    environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
                    metadata: { correlationId, source: 'saga-event-handler' },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });
            console.log(`[SagaEventHandler] Payment record created: ${paymentId} for order ${payload.orderId}`);
        } catch (err: any) {
            console.error('[SagaEventHandler] Payment record creation FAILED:', err?.message, err?.code);
        }

        // Start the saga — non-fatal: a failed saga MUST NOT roll back the payment record.
        // The record was already persisted above; the saga is best-effort processing.
        try {
            await this.saga.start(initialState, correlationId);
        } catch (sagaErr: any) {
            console.warn('[SagaEventHandler] Saga start failed (non-fatal, payment record already created):', sagaErr?.message);
        }
    }

    private async handlePaymentRetry(event: any): Promise<void> {
        console.log('SagaEventHandler: Handling PaymentRetryRequested event', event);
        // Implementation for retrying payment
    }

    private async handleWalletPaymentProcessed(event: any): Promise<void> {
        console.log('SagaEventHandler: Handling WalletPaymentProcessed event');
        const payload = event.data || event;
        const metadata = event.metadata || {};
        const sagaId = metadata.sagaId || metadata.correlationId;

        if (!sagaId) {
            console.error('Missing sagaId/correlationId in WalletPaymentProcessed event');
            return;
        }

        await this.saga.handleWalletPaymentProcessed(sagaId);
    }

    private async handleWalletPaymentFailed(event: any): Promise<void> {
        console.log('SagaEventHandler: Handling WalletPaymentFailed event');
        const payload = event.data || event;
        const metadata = event.metadata || {};
        const sagaId = metadata.sagaId || metadata.correlationId;

        if (!sagaId) {
            console.error('Missing sagaId/correlationId in WalletPaymentFailed event');
            return;
        }

        const error = payload.error || payload.message || 'Wallet payment failed';
        await this.saga.handleWalletPaymentFailed(sagaId, error);
    }
}
