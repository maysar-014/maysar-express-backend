import { EventEnvelope } from '../../../shared-contracts/types';

export interface IEventBus {
    publish(eventType: string, data: Record<string, unknown>, metadata?: Record<string, unknown>): Promise<void>;
    subscribe(eventType: string, handler: (envelope: EventEnvelope) => Promise<void>): Promise<void>;
}

