
import { PaymentProcessingSaga } from '../../application/sagas/payment-processing.saga';
import { IEventBus } from '../../infrastructure/messaging/event-bus.interface';
import { v4 as uuidv4 } from 'uuid';

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
        console.log('SagaEventHandler: Handling OrderCreated event', event);

        // Handle both envelope and raw payload
        const payload = event.data || event;
        const metadata = event.metadata || {};

        const initialState = {
            paymentId: `pay_${Date.now()}`,
            orderId: payload.orderId,
            userId: payload.userId,
            amount: payload.totalAmount, // Map totalAmount to amount
            currency: payload.currency || 'TZS',
            method: payload.paymentMethod || 'MOBILE_MONEY'
        };

        const correlationId = metadata.correlationId || uuidv4();

        // Start the saga
        await this.saga.start(initialState, correlationId);
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
