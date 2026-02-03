import { EventPublisherPort } from '../../domain/engines/ports/event-publisher.port';
import { IOutboxRepository, OutboxStatus } from '../../../../shared/outbox/outbox.repository';

export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventData: any;
  timestamp: Date;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
  };
}

export interface EventSubscription {
  eventType: string;
  handler: (event: DomainEvent) => Promise<void>;
  options?: {
    retryPolicy?: {
      maxRetries: number;
      backoffMs: number;
    };
    filter?: (event: DomainEvent) => boolean;
  };
}

export class EventPublisher implements EventPublisherPort {
  private subscriptions = new Map<string, EventSubscription[]>();
  private eventStore: DomainEvent[] = [];
  private deadLetterQueue: DomainEvent[] = [];

  constructor(
    private readonly outboxRepository: IOutboxRepository,
    private eventStoreEnabled: boolean = true
  ) { }

  async publish(event: DomainEvent, transaction?: any): Promise<void> {
    try {
      // Store event if persistence is enabled
      if (this.eventStoreEnabled) {
        this.eventStore.push(event);
      }

      // Publish to Outbox
      await this.outboxRepository.save({
        eventId: event.eventId,
        eventType: event.eventType,
        eventData: event.eventData,
        status: OutboxStatus.PENDING
      }, transaction);

      // Publish to local subscribers
      const subscribers = this.subscriptions.get(event.eventType) || [];
      const publishPromises = subscribers.map(sub => this.publishToSubscriber(event, sub));

      await Promise.allSettled(publishPromises);

      console.log(`Event saved to Outbox and published to local subscribers: ${event.eventType} (${event.eventId})`);

    } catch (error) {
      console.error('Error saving event to Outbox:', error);
      // Add to dead letter queue for retry
      this.deadLetterQueue.push(event);
      throw new Error('Failed to publish event');
    }
  }

  async publishBatch(events: DomainEvent[], transaction?: any): Promise<void> {
    try {
      const publishPromises = events.map(event => this.publish(event, transaction));
      await Promise.allSettled(publishPromises);

      console.log(`Batch published: ${events.length} events`);

    } catch (error) {
      console.error('Error publishing batch:', error);
      throw new Error('Failed to publish event batch');
    }
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push({
      eventType,
      handler
    });

    console.log(`Subscribed to event: ${eventType}`);
  }

  unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    const subscribers = this.subscriptions.get(eventType);
    if (subscribers) {
      const index = subscribers.findIndex(sub => sub.handler === handler);
      if (index > -1) {
        subscribers.splice(index, 1);
        console.log(`Unsubscribed from event: ${eventType}`);
      }
    }
  }

  async replayEvents(eventType?: string, fromEventId?: string): Promise<void> {
    try {
      if (!this.eventStoreEnabled) {
        throw new Error('Event store is not enabled');
      }

      let eventsToReplay = this.eventStore;

      // Filter by event type if specified
      if (eventType) {
        eventsToReplay = eventsToReplay.filter(event => event.eventType === eventType);
      }

      // Filter from specific event ID if specified
      if (fromEventId) {
        const startIndex = eventsToReplay.findIndex(event => event.eventId === fromEventId);
        if (startIndex > -1) {
          eventsToReplay = eventsToReplay.slice(startIndex);
        }
      }

      // Replay events to current subscribers
      for (const event of eventsToReplay) {
        await this.publish(event);
      }

      console.log(`Replayed ${eventsToReplay.length} events`);

    } catch (error) {
      console.error('Error replaying events:', error);
      throw new Error('Failed to replay events');
    }
  }

  getEventHistory(eventType?: string, limit: number = 100): DomainEvent[] {
    try {
      if (!this.eventStoreEnabled) {
        return [];
      }

      let events = this.eventStore;

      if (eventType) {
        events = events.filter(event => event.eventType === eventType);
      }

      // Return most recent events first
      return events.slice(-limit).reverse();

    } catch (error) {
      console.error('Error getting event history:', error);
      return [];
    }
  }

  getDeadLetterQueue(): DomainEvent[] {
    return [...this.deadLetterQueue];
  }

  async retryDeadLetterEvents(): Promise<void> {
    try {
      const eventsToRetry = [...this.deadLetterQueue];
      this.deadLetterQueue = [];

      for (const event of eventsToRetry) {
        try {
          await this.publish(event);
        } catch (retryError) {
          console.error('Failed to retry event:', retryError);
          // Put back in dead letter queue if retry fails
          this.deadLetterQueue.push(event);
        }
      }

      console.log(`Retried ${eventsToRetry.length} dead letter events`);

    } catch (error) {
      console.error('Error retrying dead letter events:', error);
      throw new Error('Failed to retry dead letter events');
    }
  }

  private async publishToSubscriber(event: DomainEvent, subscription: EventSubscription): Promise<void> {
    try {
      // Apply filter if specified
      if (subscription.options?.filter && !subscription.options.filter(event)) {
        return; // Skip this subscriber
      }

      // Publish with retry logic
      const maxRetries = subscription.options?.retryPolicy?.maxRetries || 3;
      const backoffMs = subscription.options?.retryPolicy?.backoffMs || 1000;

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await subscription.handler(event);
          return; // Success
        } catch (error) {
          lastError = error as Error;
          console.warn(`Event handler failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

          if (attempt < maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
          }
        }
      }

      // All retries failed
      throw lastError || new Error('Event handler failed after all retries');

    } catch (error) {
      console.error('Error publishing to subscriber:', error);
      // Add to dead letter queue
      this.deadLetterQueue.push(event);
      throw error;
    }
  }

  // Health check methods
  getStats(): {
    totalEventsPublished: number;
    totalSubscribers: number;
    deadLetterQueueSize: number;
    eventStoreSize: number;
  } {
    const totalSubscribers = Array.from(this.subscriptions.values())
      .reduce((sum, subs) => sum + subs.length, 0);

    return {
      totalEventsPublished: this.eventStore.length,
      totalSubscribers,
      deadLetterQueueSize: this.deadLetterQueue.length,
      eventStoreSize: this.eventStore.length
    };
  }

  // Cleanup old events (for memory management)
  cleanupOldEvents(olderThanHours: number = 24): void {
    if (!this.eventStoreEnabled) return;

    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.eventStore = this.eventStore.filter(event => event.timestamp > cutoffTime);

    console.log(`Cleaned up events older than ${olderThanHours} hours`);
  }
}
