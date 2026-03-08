
import { EventEnvelope, SubscriptionOptions } from '@shared-events/eventBus';

export interface IEventBus {
    publish(envelope: EventEnvelope): Promise<void>;
    publish(eventType: string, data: any, metadata?: any): Promise<void>;
    emit(envelope: EventEnvelope): Promise<void>;
    emit(eventType: string, data: any, metadata?: any): Promise<void>;
    subscribe(eventType: string, handler: (envelope: any) => Promise<void>): Promise<void>;
    subscribe(eventType: string, options: SubscriptionOptions): Promise<void>;
}

