const mockEventBusPublish = jest.fn();
const mockEventBusSubscribe = jest.fn();

jest.mock(
    '@shared-events/eventBus',
    () => ({
        eventBus: {
            publish: mockEventBusPublish,
            subscribe: mockEventBusSubscribe
        }
    }),
    { virtual: true }
);

import { EventBusAdapter } from '../EventBusAdapter';

describe('EventBusAdapter', () => {
    let adapter: EventBusAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEventBusPublish.mockResolvedValue(undefined);
        mockEventBusSubscribe.mockResolvedValue(undefined);
        adapter = new EventBusAdapter();
    });

    it('publishes string event payloads as envelopes', async () => {
        await adapter.publish('order.created', { id: 'ord-1' }, { correlationId: 'corr-1' });

        expect(mockEventBusPublish).toHaveBeenCalledTimes(1);
        expect(mockEventBusPublish).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'order.created',
                data: { id: 'ord-1' },
                metadata: { correlationId: 'corr-1' },
                correlationId: 'corr-1'
            })
        );
    });

    it('normalizes legacy event objects', async () => {
        await adapter.publish({
            type: 'legacy.event',
            payload: { ok: true },
            metadata: { source: 'legacy' }
        });

        expect(mockEventBusPublish).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'legacy.event',
                data: { ok: true },
                metadata: { source: 'legacy' }
            })
        );
    });

    it('throws when event type is missing', async () => {
        await expect(adapter.publish({ data: { invalid: true } } as any)).rejects.toThrow(
            'Event type is required for publishing'
        );
    });

    it('proxies subscriptions for both handler and option signatures', async () => {
        const handler = jest.fn().mockResolvedValue(undefined);
        await adapter.subscribe('event.a', handler);
        await adapter.subscribe('event.b', { name: 'sub-1', handler });

        expect(mockEventBusSubscribe).toHaveBeenNthCalledWith(1, 'event.a', handler);
        expect(mockEventBusSubscribe).toHaveBeenNthCalledWith(2, 'event.b', {
            name: 'sub-1',
            handler
        });
    });
});
