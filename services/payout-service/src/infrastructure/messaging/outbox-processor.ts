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
                    timestamp: entry.createdAt
                });
                await this.outboxRepository.markAsProcessed(entry.id);
            } catch (error) {
                console.error(`Failed to process outbox entry ${entry.id}:`, error);
            }
        }
    }

    private intervalId: ReturnType<typeof setInterval> | null = null;

    start(intervalMs: number = 5000): void {
        this.intervalId = setInterval(() => this.process(), intervalMs);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
