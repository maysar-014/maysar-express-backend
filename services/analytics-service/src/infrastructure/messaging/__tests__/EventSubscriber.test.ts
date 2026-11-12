import { EventSubscriber } from '../EventSubscriber';
import { EventBusAdapter } from '../EventBusAdapter';
import { ProcessAnalyticsEventUseCase } from '../../../application/use-cases/ProcessAnalyticsEventUseCase';

describe('EventSubscriber', () => {
    const buildSubscriber = () => {
        const eventBus = {
            subscribe: jest.fn().mockResolvedValue(undefined)
        } as unknown as EventBusAdapter;

        const processUseCase = {
            execute: jest.fn().mockResolvedValue(undefined)
        } as unknown as ProcessAnalyticsEventUseCase;

        const subscriber = new EventSubscriber(eventBus, processUseCase);
        subscriber.initialize();

        return { eventBus, processUseCase };
    };

    it('subscribes to the real shared-bus order and payment events', () => {
        const { eventBus } = buildSubscriber();

        expect((eventBus.subscribe as jest.Mock).mock.calls.map(call => call[0])).toEqual([
            'OrderCreatedEvent',
            'order.pending_seller_verification',
            'OrderDelivered',
            'PaymentCompleted.v1',
            'PaymentFailed.v1'
        ]);
    });

    it('unwraps the nested OrderCreatedEvent payload and derives seller/amount', async () => {
        const { eventBus, processUseCase } = buildSubscriber();

        const handler = (eventBus.subscribe as jest.Mock).mock.calls[0][1];
        await handler({
            data: {
                order: { sellerId: 'seller-1', totalAmount: 250, id: 'ord-1' },
                timestamp: '2026-01-01T00:00:00.000Z'
            }
        });

        expect((processUseCase.execute as jest.Mock).mock.calls[0][0]).toEqual(
            expect.objectContaining({
                eventType: 'order',
                data: expect.objectContaining({ sellerId: 'seller-1', totalAmount: 250, amount: 250 }),
                context: {
                    channel: 'unknown',
                    source: 'order-service',
                    sellerId: 'seller-1'
                }
            })
        );
    });

    it('normalizes flat payloads and maps totalAmount to amount', async () => {
        const { eventBus, processUseCase } = buildSubscriber();

        const handler = (eventBus.subscribe as jest.Mock).mock.calls[2][1];
        await handler({ data: { sellerId: 'seller-2', totalAmount: 99.5 } });

        expect((processUseCase.execute as jest.Mock).mock.calls[0][0]).toEqual(
            expect.objectContaining({
                eventType: 'order',
                data: expect.objectContaining({ amount: 99.5 }),
                context: expect.objectContaining({ sellerId: 'seller-2' })
            })
        );
    });

    it('coerces non-object payloads to an empty record without throwing', async () => {
        const { eventBus, processUseCase } = buildSubscriber();

        const handler = (eventBus.subscribe as jest.Mock).mock.calls[2][1];
        await handler({ data: 'not-an-object' });

        expect((processUseCase.execute as jest.Mock).mock.calls[0][0]).toEqual(
            expect.objectContaining({
                eventType: 'order',
                data: {},
                context: expect.objectContaining({ sellerId: undefined })
            })
        );
    });

    it('records completed payments as payment events with revenue amount', async () => {
        const { eventBus, processUseCase } = buildSubscriber();

        const handler = (eventBus.subscribe as jest.Mock).mock.calls[3][1];
        await handler({ data: { paymentId: 'pay-1', orderId: 'ord-1', amount: 750, currency: 'TZS' } });

        expect((processUseCase.execute as jest.Mock).mock.calls[0][0]).toEqual(
            expect.objectContaining({
                eventType: 'payment',
                data: expect.objectContaining({ amount: 750 }),
                context: expect.objectContaining({ source: 'payment-service', sellerId: undefined })
            })
        );
    });

    it('records failed payments as payment_failed so they never inflate revenue', async () => {
        const { eventBus, processUseCase } = buildSubscriber();

        const handler = (eventBus.subscribe as jest.Mock).mock.calls[4][1];
        await handler({ data: { paymentId: 'pay-2', amount: 100, failureReason: 'declined' } });

        expect((processUseCase.execute as jest.Mock).mock.calls[0][0]).toEqual(
            expect.objectContaining({
                eventType: 'payment_failed',
                data: expect.objectContaining({ amount: 100 })
            })
        );
    });

    it('swallows processing errors so analytics never breaks the publisher', async () => {
        const eventBus = {
            subscribe: jest.fn().mockResolvedValue(undefined)
        } as unknown as EventBusAdapter;

        const processUseCase = {
            execute: jest.fn().mockRejectedValue(new Error('db down'))
        } as unknown as ProcessAnalyticsEventUseCase;

        const subscriber = new EventSubscriber(eventBus, processUseCase);
        subscriber.initialize();

        const handler = (eventBus.subscribe as jest.Mock).mock.calls[0][1];
        await expect(handler({ data: { order: { sellerId: 's1', totalAmount: 1 } } })).resolves.toBeUndefined();
    });
});
