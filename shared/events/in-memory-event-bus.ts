import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface EventEnvelope {
    eventType: string;
    data: any;
    metadata?: {
        correlationId?: string;
        eventId?: string;
        timestamp?: string;
        [key: string]: any;
    };
}

export type EventHandler = (envelope: EventEnvelope) => Promise<void>;

export class InMemoryEventBus {
    private emitter: EventEmitter;
    private logger: typeof console;

    constructor() {
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100);
        this.logger = console;
    }

    async publish(eventType: string, data: any, metadata: any = {}): Promise<void> {
        const envelope: EventEnvelope = {
            eventType,
            data,
            metadata: {
                eventId: uuidv4(),
                timestamp: new Date().toISOString(),
                ...metadata
            }
        };

        this.logger.log(`[InMemoryEventBus] Publishing event: ${eventType}`, {
            eventId: envelope.metadata?.eventId,
            correlationId: envelope.metadata?.correlationId
        });

        // Emit event asynchronously to decouple publisher from subscribers
        setImmediate(() => {
            this.emitter.emit(eventType, envelope);
        });
    }

    async subscribe(eventType: string, handler: EventHandler): Promise<void> {
        this.logger.log(`[InMemoryEventBus] Subscribing to: ${eventType}`);

        this.emitter.on(eventType, async (envelope: EventEnvelope) => {
            try {
                await this.handleWithRetry(eventType, envelope, handler);
            } catch (error) {
                this.logger.error(`[InMemoryEventBus] Final failure for event ${eventType}:`, error);
            }
        });
    }

    private async handleWithRetry(
        eventType: string,
        envelope: EventEnvelope,
        handler: EventHandler,
        retries: number = 3
    ): Promise<void> {
        let lastError: any;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await handler(envelope);
                return;
            } catch (error) {
                lastError = error;
                this.logger.warn(`[InMemoryEventBus] Attempt ${attempt} failed for ${eventType}:`, error);
                if (attempt < retries) {
                    // Exponential backoff: 100ms, 200ms, 400ms
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 50));
                }
            }
        }

        throw lastError;
    }

    // Utility to clear all listeners (useful for testing)
    clear(): void {
        this.emitter.removeAllListeners();
    }
}

export const inMemoryEventBus = new InMemoryEventBus();
