
import { PaymentProcessingSaga } from '../../application/sagas/payment-processing.saga';
import { IEventBus } from '../../infrastructure/messaging/event-bus.interface';

export class SagaEventHandler {
    constructor(
        private readonly saga: PaymentProcessingSaga,
        private readonly eventBus: IEventBus
    ) { }

    async setupSubscriptions(): Promise<void> {
        // Subscribe to events that trigger the saga
        await this.eventBus.subscribe('OrderCreated', this.handleOrderCreated.bind(this));
        await this.eventBus.subscribe('PaymentRetryRequested', this.handlePaymentRetry.bind(this));
    }

    private async handleOrderCreated(event: any): Promise<void> {
        console.log('SagaEventHandler: Handling OrderCreated event', event);

        const initialState = {
            paymentId: `pay_${Date.now()}`,
            orderId: event.orderId,
            userId: event.userId,
            amount: event.totalAmount,
            currency: event.currency || 'TZS',
            method: event.paymentMethod || 'MOBILE_MONEY'
        };

        await this.saga.execute(initialState);
    }

    private async handlePaymentRetry(event: any): Promise<void> {
        console.log('SagaEventHandler: Handling PaymentRetryRequested event', event);
        // Implementation for retrying payment
    }
}
