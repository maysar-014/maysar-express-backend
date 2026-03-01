import { OutboxRepository } from './outbox.repository';
import { IEventBus } from './event-bus.interface';
import { outboxDelay, outboxPublished, outboxFailed } from '../../../../../shared/outbox/outbox.processor';

export class OutboxProcessor {
    private intervalId: ReturnType<typeof setInterval> | null = null;

    constructor(
        private readonly outboxRepository: OutboxRepository,
        private readonly eventBus: IEventBus
    ) { }

    async process(): Promise<void> {
        const entries = await this.outboxRepository.findUnprocessed();
        for (const entry of entries) {
            try {
                const delay = (Date.now() - new Date(entry.createdAt).getTime()) / 1000;
                outboxDelay.labels('payment-service').observe(delay);

                await this.eventBus.publish(entry.eventType, entry.eventData, {
                    eventId: entry.eventId
                });
                await this.outboxRepository.markAsProcessed(entry.id);
                outboxPublished.labels('payment-service').inc();
            } catch (error) {
                console.error(`Failed to process outbox entry ${entry.id}:`, error);
                outboxFailed.labels('payment-service', 'false').inc();
            }
        }
    }

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
