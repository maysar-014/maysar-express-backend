import { PrismaClient } from '@prisma/client';
import { EventEnvelope, IEventPublisher } from '../events/eventBus';
import { TransactionalOutbox } from './outboxPattern';
import { Counter, Histogram } from 'prom-client';
import { metricsRegistry } from '../metrics/metrics.factory';
import { createLogger } from '../logger/logger';
import { isOutboxProcessorEnabled } from '../runtime/background-workers';

export const outboxDelay = new Histogram({
    name: 'outbox_event_processing_delay_seconds',
    help: 'Delay between event creation and processing in seconds',
    labelNames: ['service'],
    buckets: [1, 5, 10, 30, 60, 300],
    registers: [metricsRegistry]
});

export const outboxPublished = new Counter({
    name: 'outbox_events_published_total',
    help: 'Total number of events published from outbox',
    labelNames: ['service'],
    registers: [metricsRegistry]
});

export const outboxFailed = new Counter({
    name: 'outbox_events_failed_total',
    help: 'Total number of events that failed during outbox processing',
    labelNames: ['service', 'permanent'],
    registers: [metricsRegistry]
});

interface OutboxProcessorConfig {
    pollInterval: number;
    batchSize: number;
    maxRetries: number;
    retryDelayMs: number;
    infrastructureBackoffMs: number;
}

export class OutboxProcessor {
    private isRunning = false;
    private isProcessing = false;
    private intervalId?: NodeJS.Timeout;
    private logger: ReturnType<typeof createLogger>;
    private serviceName: string;
    private pauseUntil = 0;

    constructor(
        private prisma: PrismaClient,
        private outbox: TransactionalOutbox,
        private eventPublisher: IEventPublisher,
        serviceName?: string,
        private config: OutboxProcessorConfig = {
            pollInterval: 5000,
            batchSize: 50,
            maxRetries: 5,
            retryDelayMs: 30000,
            infrastructureBackoffMs: 60000
        }
    ) {
        this.serviceName = serviceName || process.env.SERVICE_NAME || 'unknown';
        this.logger = createLogger('OutboxProcessor', this.serviceName);
    }

    start(): void {
        if (!isOutboxProcessorEnabled()) {
            this.logger.info('Outbox processor disabled via configuration');
            return;
        }

        if (this.isRunning) return;

        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.runProcessingLoop().catch(err => this.logger.error('Error in outbox processing loop', err));
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

    private async runProcessingLoop(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        if (Date.now() < this.pauseUntil) {
            return;
        }

        this.isProcessing = true;
        try {
            await this.processOutboxEvents();
        } catch (error) {
            if (this.isInfrastructureError(error)) {
                this.pauseUntil = Date.now() + this.config.infrastructureBackoffMs;
                this.logger.error('Error in outbox processing loop', error);
                this.logger.warn(
                    `Outbox processor paused for ${this.config.infrastructureBackoffMs}ms after infrastructure error`,
                    { resumeAt: new Date(this.pauseUntil).toISOString() }
                );
                return;
            }

            throw error;
        } finally {
            this.isProcessing = false;
        }
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

                const envelope = this.toEventEnvelope(event.eventData, event.eventId);
                await this.eventPublisher.publish(envelope);

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

    private toEventEnvelope(eventData: unknown, eventId: string): EventEnvelope {
        if (typeof eventData !== 'object' || eventData === null) {
            throw new Error(`Outbox event ${eventId} has invalid payload`);
        }

        return eventData as EventEnvelope;
    }

    private isInfrastructureError(error: unknown): boolean {
        const message = error instanceof Error ? error.message : String(error);
        const name = error instanceof Error ? error.name : '';
        const normalizedMessage = message.toLowerCase();
        const normalizedName = name.toLowerCase();

        return (
            normalizedName.includes('prismaclientinitializationerror')
            || normalizedMessage.includes("can't reach database server")
            || normalizedMessage.includes('database server')
            || normalizedMessage.includes('econnrefused')
            || normalizedMessage.includes('connect etimedout')
        );
    }
}
