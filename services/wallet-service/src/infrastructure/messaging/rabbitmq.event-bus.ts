import { IEventBus } from './event-bus.interface';
import { KafkaEventBus, getKafkaEventBus } from '../../../../../shared/events/kafka.event-bus';
import { EventEnvelope } from '../../../shared-contracts/types';

export class RabbitMQEventBus implements IEventBus {
    private kafka: KafkaEventBus;

    constructor() {
        this.kafka = getKafkaEventBus({
            clientId: 'wallet-service',
            groupId: 'wallet-service-group'
        });
    }

    async publish(eventType: string, data: Record<string, unknown>, metadata?: Record<string, unknown>): Promise<void> {
        await this.kafka.publish(eventType, data, metadata);
    }

    async subscribe(eventType: string, handler: (envelope: EventEnvelope) => Promise<void>): Promise<void> {
        await this.kafka.subscribe(eventType, handler);
    }
}
