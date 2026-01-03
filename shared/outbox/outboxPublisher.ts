import { TransactionalOutbox, OutboxStatus } from './outboxPattern';
import { enhancedEventBus } from '../../src/events/eventBus';
import { PrismaClient } from '@prisma/client';

export class OutboxPublisher {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  
  constructor(
    private outbox: TransactionalOutbox,
    private eventBus: typeof enhancedEventBus,
    private config = {
      pollInterval: 5000,
      batchSize: 50,
      maxRetries: 5,
      retryDelayMs: 30000
    }
  ) {}

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.processOutboxEvents().catch(console.error);
    }, this.config.pollInterval);
    
    console.log('Outbox publisher started');
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    console.log('Outbox publisher stopped');
  }

  private async processOutboxEvents(): Promise<void> {
    const events = await this.outbox.getPendingEvents(this.config.batchSize);
    
    for (const event of events) {
      try {
        await this.outbox.markAsProcessing(event.eventId);
        await this.eventBus.publish(event.eventData);
        await this.outbox.markAsSent(event.eventId);
        
        console.log(`Published event ${event.eventId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (event.attempts >= this.config.maxRetries) {
          await this.outbox.markAsFailed(event.eventId, errorMessage);
          console.error(`Event ${event.eventId} failed permanently: ${errorMessage}`);
        } else {
          const nextRetryAt = new Date(Date.now() + this.config.retryDelayMs);
          await this.outbox.markAsFailed(event.eventId, errorMessage, nextRetryAt);
          console.warn(`Event ${event.eventId} failed, retry at ${nextRetryAt}: ${errorMessage}`);
        }
      }
    }
  }

  async getStats(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
  }> {
    const prisma = new PrismaClient();
    
    const [pending, processing, sent, failed] = await Promise.all([
      prisma.outboxEvent.count({ where: { status: OutboxStatus.PENDING } }),
      prisma.outboxEvent.count({ where: { status: OutboxStatus.PROCESSING } }),
      prisma.outboxEvent.count({ where: { status: OutboxStatus.SENT } }),
      prisma.outboxEvent.count({ where: { status: OutboxStatus.FAILED } })
    ]);

    return { pending, processing, sent, failed };
  }
}