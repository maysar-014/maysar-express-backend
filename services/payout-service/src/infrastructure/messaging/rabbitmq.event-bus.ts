import { IEventBus } from './event-bus.interface';
import { KafkaEventBus, getKafkaEventBus } from '../../../../../shared/events/kafka.event-bus';

export class RabbitMQEventBus implements IEventBus {
    private kafka: KafkaEventBus;

    constructor() {
        this.kafka = getKafkaEventBus({
            clientId: 'payout-service',
            groupId: 'payout-service-group'
        });
    }

    async publish(eventType: string, data: any, metadata?: any): Promise<void> {
        await this.kafka.publish(eventType, data, metadata);
    }

    async subscribe(eventType: string, handler: (envelope: any) => Promise<void>): Promise<void> {
        await this.kafka.subscribe(eventType, handler);
    }
}
