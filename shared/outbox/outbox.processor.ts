import { PrismaClient } from '@prisma/client';
import { EventEnvelope, EventBus } from '../events/eventBus';
import { OutboxEntry, OutboxStatus, TransactionalOutbox } from './outboxPattern';

export class OutboxProcessor {
    private isRunning = false;
    private intervalId?: NodeJS.Timeout;

    constructor(
        private prisma: PrismaClient,
        private outbox: TransactionalOutbox,
        private eventPublisher: EventBus,
        private config = {
            pollInterval: 5000,
            batchSize: 50,
            maxRetries: 5,
            retryDelayMs: 30000
        }
    ) { }

    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.processOutboxEvents().catch(console.error);
        }, this.config.pollInterval);

        console.log('Outbox processor started');
    }

    stop(): void {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        console.log('Outbox processor stopped');
    }

    private async processOutboxEvents(): Promise<void> {
        const events = await this.outbox.getPendingEvents(this.config.batchSize);

        for (const event of events) {
            try {
                await this.outbox.markAsProcessing(event.eventId);

                const envelope = event.eventData as EventEnvelope;
                await this.eventPublisher.publish(envelope.eventType, envelope.data, envelope.metadata);

                await this.outbox.markAsSent(event.eventId);
                console.log(`Outbox published event ${event.eventId} to Kafka`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                if (event.attempts >= this.config.maxRetries) {
                    await this.outbox.markAsDeadLetter(event.eventId, errorMessage);
                    console.error(`Outbox event ${event.eventId} failed permanently: ${errorMessage}`);
                } else {
                    const nextRetryAt = new Date(Date.now() + this.config.retryDelayMs);
                    await this.outbox.markAsFailed(event.eventId, errorMessage, nextRetryAt);
                    console.warn(`Outbox event ${event.eventId} failed, retry at ${nextRetryAt}: ${errorMessage}`);
                }
            }
        }
    }
}
