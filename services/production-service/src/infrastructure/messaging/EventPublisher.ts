
import { IEventBus } from '../../domain/interfaces/IEventBus';

export class EventPublisher {
    constructor(private readonly eventBus: IEventBus) { }

    async publishProductionScheduled(orderId: string): Promise<void> {
        await this.eventBus.publish({
            type: 'ProductionScheduled',
            payload: { orderId, timestamp: new Date() }
        });
    }

    async publishProductionCompleted(orderId: string, producedQty: number): Promise<void> {
        await this.eventBus.publish({
            type: 'ProductionCompleted',
            payload: { orderId, producedQty, timestamp: new Date() }
        });
    }

    // Add methods for other events
}
