import { IEventBus, EventEnvelope } from '../../../../shared/events/eventBus';

export class EventBusAdapter implements IEventBus {
    async publish(eventTypeOrObject: string | { type?: string; event?: string; data?: any; payload?: any }, data?: any, metadata?: any): Promise<void> {
        if (typeof eventTypeOrObject === 'string') {
            const { eventBus } = await import('../../../../shared/events/eventBus');
            await eventBus.publish(eventTypeOrObject, data, metadata);
        } else {
            const { eventBus } = await import('../../../../shared/events/eventBus');
            await eventBus.publish(eventTypeOrObject);
        }
    }

    async subscribe(eventType: string, handlerOrOptions: ((envelope: EventEnvelope) => Promise<void>) | { name: string; handler: (envelope: EventEnvelope) => Promise<void> }): Promise<void> {
        const { eventBus } = await import('../../../../shared/events/eventBus');
        await eventBus.subscribe(eventType, handlerOrOptions);
    }
}
