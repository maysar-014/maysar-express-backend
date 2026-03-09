import { EventSubscriber } from '../EventSubscriber';
import { EventBusAdapter } from '../EventBusAdapter';
import { ProcessAnalyticsEventUseCase } from '../../../application/use-cases/ProcessAnalyticsEventUseCase';

describe('EventSubscriber', () => {
    it('registers order/payment handlers and forwards normalized payloads', async () => {
        const eventBus = {
            subscribe: jest.fn().mockResolvedValue(undefined)
        } as unknown as EventBusAdapter;

        const processUseCase = {
            execute: jest.fn().mockResolvedValue(undefined)
        } as unknown as ProcessAnalyticsEventUseCase;

        const subscriber = new EventSubscriber(eventBus, processUseCase);
        subscriber.initialize();

        expect((eventBus.subscribe as jest.Mock).mock.calls.map(call => call[0])).toEqual([
            'order.created',
            'payment.processed'
        ]);

        const orderHandler = (eventBus.subscribe as jest.Mock).mock.calls[0][1];
        await orderHandler({ data: { sellerId: 'seller-1', amount: 100 } });
        expect((processUseCase.execute as jest.Mock).mock.calls[0][0]).toEqual(
            expect.objectContaining({
                eventType: 'order',
                data: { sellerId: 'seller-1', amount: 100 },
                context: {
                    channel: 'unknown',
                    source: 'order-service',
                    sellerId: 'seller-1'
                }
            })
        );

        const paymentHandler = (eventBus.subscribe as jest.Mock).mock.calls[1][1];
        await paymentHandler({ data: 'not-an-object' });
        expect((processUseCase.execute as jest.Mock).mock.calls[1][0]).toEqual(
            expect.objectContaining({
                eventType: 'payment',
                data: {},
                context: {
                    channel: 'unknown',
                    source: 'payment-service',
                    sellerId: undefined
                }
            })
        );
    });
});
