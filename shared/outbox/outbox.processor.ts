import { PrismaClient } from '@prisma/client';
import { EventEnvelope, IEventPublisher } from '../events/eventBus';
import { OutboxEntry, OutboxStatus, TransactionalOutbox } from './outboxPattern';
import { Counter, Histogram } from 'prom-client';
import { metricsRegistry } from '../metrics/metrics.factory';
import { createLogger } from '../logger/logger';

export const outboxDelay = new Histogram({
    name: 'outbox_event_processing_delay_seconds',
    help: 'Delay between event creation and processing in seconds',
    labelNames: ['service'],
    buckets: [1, 5, 10, 30, 60, 300],
    registers: [metricsRegistry]
}) as any;

export const outboxPublished = new Counter({
    name: 'outbox_events_published_total',
    help: 'Total number of events published from outbox',
    labelNames: ['service'],
    registers: [metricsRegistry]
}) as any;

export const outboxFailed = new Counter({
    name: 'outbox_events_failed_total',
    help: 'Total number of events that failed during outbox processing',
    labelNames: ['service', 'permanent'],
    registers: [metricsRegistry]
}) as any;

export class OutboxProcessor {
    private isRunning = false;
    private intervalId?: NodeJS.Timeout;
    private logger: any;
    private serviceName: string;

    constructor(
        private prisma: PrismaClient,
        private outbox: TransactionalOutbox,
        private eventPublisher: IEventPublisher,
        serviceName?: string,
        private config = {
            pollInterval: 5000,
            batchSize: 50,
            maxRetries: 5,
            retryDelayMs: 30000
        }
    ) {
        this.serviceName = serviceName || process.env.SERVICE_NAME || 'unknown';
        this.logger = createLogger('OutboxProcessor', this.serviceName);
    }

    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.processOutboxEvents().catch(err => this.logger.error('Error in outbox processing loop', err));
        }, this.config.pollInterval);

        this.logger.info('Outbox processor started');
    }

    stop(): void {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.logger.info('Outbox processor stopped');
    }

    private async processOutboxEvents(): Promise<void> {
        const events = await this.outbox.getPendingEvents(this.config.batchSize);

        for (const event of events) {
            try {
                await this.outbox.markAsProcessing(event.eventId);

                // Record delay metric
                const createdAt = new Date(event.createdAt).getTime();
                const delay = (Date.now() - createdAt) / 1000;
                outboxDelay.labels(this.serviceName).observe(delay);

                const envelope = event.eventData as EventEnvelope;
                await this.eventPublisher.publish(envelope.eventType, envelope.data, envelope.metadata);

                await this.outbox.markAsSent(event.eventId);
                outboxPublished.labels(this.serviceName).inc();
                this.logger.info(`Outbox published event ${event.eventId}`, { eventId: event.eventId });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                if (event.attempts >= this.config.maxRetries) {
                    await this.outbox.markAsDeadLetter(event.eventId, errorMessage);
                    outboxFailed.labels(this.serviceName, 'true').inc();
                    this.logger.error(`Outbox event ${event.eventId} failed permanently: ${errorMessage}`, error, { eventId: event.eventId });
                } else {
                    const nextRetryAt = new Date(Date.now() + this.config.retryDelayMs);
                    await this.outbox.markAsFailed(event.eventId, errorMessage, nextRetryAt);
                    outboxFailed.labels(this.serviceName, 'false').inc();
                    this.logger.warn(`Outbox event ${event.eventId} failed, retry at ${nextRetryAt}: ${errorMessage}`, { eventId: event.eventId, nextRetryAt });
                }
            }
        }
    }
}
