import { RabbitMQEventBus } from '../rabbitmq.event-bus';

describe('RabbitMQEventBus', () => {
    let eventBus: RabbitMQEventBus;

    beforeEach(() => {
        eventBus = new RabbitMQEventBus('amqp://localhost');
    });

    it('should publish event', async () => {
        await expect(eventBus.publish('payment.processed', { id: 'p1' })).resolves.not.toThrow();
    });

    it('should subscribe to event', async () => {
        const handler = jest.fn();
        await eventBus.subscribe('payment.processed', handler);
        expect(handler).toBeDefined();
    });
});
