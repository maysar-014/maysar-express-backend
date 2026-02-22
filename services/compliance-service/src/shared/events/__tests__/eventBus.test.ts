import { EventBus, Event } from '../eventBus';

describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = new EventBus();
    });

    describe('onEvent', () => {
        it('should register event handler', () => {
            const handler = jest.fn();
            eventBus.onEvent('TestEvent', handler);

            expect(eventBus.getHandlerCount('TestEvent')).toBe(1);
        });

        it('should register multiple handlers for same event', () => {
            eventBus.onEvent('TestEvent', jest.fn());
            eventBus.onEvent('TestEvent', jest.fn());

            expect(eventBus.getHandlerCount('TestEvent')).toBe(2);
        });
    });

    describe('publish', () => {
        it('should publish event with full Event object', async () => {
            const handler = jest.fn();
            eventBus.onEvent('TestEvent', handler);

            const event: Event = {
                eventId: 'evt-123',
                eventType: 'TestEvent',
                eventVersion: 1,
                producer: 'test',
                timestamp: new Date().toISOString(),
                entityType: 'test',
                entityId: 'e1',
                userId: 'u1',
                payload: { data: 'test' }
            };

            await eventBus.publish(event);

            expect(handler).toHaveBeenCalledWith(event);
        });

        it('should publish event with eventType and payload', async () => {
            const handler = jest.fn();
            eventBus.onEvent('TestEvent', handler);

            await eventBus.publish('TestEvent', { userId: 'u1', data: 'test' });

            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                eventType: 'TestEvent',
                payload: { userId: 'u1', data: 'test' }
            }));
        });

        it('should call all registered handlers', async () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            eventBus.onEvent('TestEvent', handler1);
            eventBus.onEvent('TestEvent', handler2);

            await eventBus.publish('TestEvent', {});

            expect(handler1).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });

        it('should handle handler errors gracefully', async () => {
            const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
            const successHandler = jest.fn();
            eventBus.onEvent('TestEvent', errorHandler);
            eventBus.onEvent('TestEvent', successHandler);

            await eventBus.publish('TestEvent', {});

            expect(errorHandler).toHaveBeenCalled();
            expect(successHandler).toHaveBeenCalled();
        });

        it('should not throw when no handlers registered', async () => {
            await expect(eventBus.publish('UnknownEvent', {})).resolves.not.toThrow();
        });
    });

    describe('getRegisteredEventTypes', () => {
        it('should return all registered event types', () => {
            eventBus.onEvent('Event1', jest.fn());
            eventBus.onEvent('Event2', jest.fn());

            const types = eventBus.getRegisteredEventTypes();

            expect(types).toContain('Event1');
            expect(types).toContain('Event2');
            expect(types).toHaveLength(2);
        });
    });

    describe('removeAllHandlers', () => {
        it('should remove all handlers for event type', () => {
            eventBus.onEvent('TestEvent', jest.fn());
            eventBus.onEvent('TestEvent', jest.fn());

            eventBus.removeAllHandlers('TestEvent');

            expect(eventBus.getHandlerCount('TestEvent')).toBe(0);
        });
    });

    describe('clearAllHandlers', () => {
        it('should clear all handlers', () => {
            eventBus.onEvent('Event1', jest.fn());
            eventBus.onEvent('Event2', jest.fn());

            eventBus.clearAllHandlers();

            expect(eventBus.getRegisteredEventTypes()).toHaveLength(0);
        });
    });
});
