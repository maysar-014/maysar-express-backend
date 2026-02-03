import { OutboxRepository } from './outbox.repository';
import { IEventBus } from './event-bus.interface';

export class OutboxProcessor {
    constructor(
        private readonly outboxRepository: OutboxRepository,
        private readonly eventBus: IEventBus
    ) { }

    async process(): Promise<void> {
        const entries = await this.outboxRepository.findUnprocessed();
        for (const entry of entries) {
            try {
                await this.eventBus.publish({
                    eventType: entry.eventType,
                    aggregateId: entry.eventId,
                    aggregateType: 'Outbox',
                    payload: entry.eventData,
                    occurredAt: entry.createdAt
                });
                await this.outboxRepository.markAsProcessed(entry.id);
            } catch (error) {
                console.error(`Failed to process outbox entry ${entry.id}:`, error);
            }
        }
    }

    start(intervalMs: number = 5000): void {
        setInterval(() => this.process(), intervalMs);
    }
}
