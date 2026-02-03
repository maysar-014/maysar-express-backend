import { IEventBus } from '../../domain/interfaces/IEventBus';
import { eventBus } from '../../../../shared/events/eventBus';

export class EventBusAdapter implements IEventBus {
    async publish(event: { type: string; data: any }): Promise<void> {
        await eventBus.publish(event.type, event.data);
    }

    subscribe(eventType: string, handler: (event: any) => Promise<void>): void {
        eventBus.subscribe(eventType, {
            name: 'analytics-service',
            handler: async (envelope) => {
                await handler({
                    type: envelope.eventType,
                    data: envelope.data,
                    // If sagaId is part of data, it will be passed. If it's separate in envelope, we need to map it.
                    // The domain expects generic event object.
                    ...envelope
                });
            }
        });
    }
}
