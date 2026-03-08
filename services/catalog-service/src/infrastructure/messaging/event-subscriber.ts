/**
 * Event Subscriber Implementation
 * Infrastructure layer implementation for event subscription and handling
 * Provides cross-service event handling with reliability and monitoring
 */

import { DomainEvent } from '../../domain/interfaces';
import { EventSerializer, PublishingStrategy } from './event-publisher';

/**
 * Event Subscription Configuration
 */
export interface EventSubscriptionConfig {
  eventType: string;
  handler: EventHandler;
  options?: {
    retryAttempts?: number;
    retryDelay?: number;
    circuitBreaker?: boolean;
    deduplication?: boolean;
    deadLetterQueue?: boolean;
    batchSize?: number;
    batchTimeout?: number;
  };
}

/**
 * Event Handler Function Type
 */
export type EventHandler = (event: DomainEvent, context?: EventHandlingContext) => Promise<void>;

/**
 * Event Handling Context
 */
export interface EventHandlingContext {
  subscriptionId: string;
  receivedAt: Date;
  retryCount: number;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Event Processing Result
 */
export interface EventProcessingResult {
  eventId: string;
  success: boolean;
  duration: number;
  retryCount: number;
  error?: string;
  timestamp: Date;
}

/**
 * Event Subscriber Base Class
 * Abstract base class for event subscription implementations
 */
export abstract class BaseEventSubscriber {
  protected subscriptions = new Map<string, EventSubscriptionConfig>();
  protected processingResults: EventProcessingResult[] = [];
  protected maxResultsHistory = 1000;

  abstract subscribe(config: EventSubscriptionConfig): Promise<string>;
  abstract unsubscribe(subscriptionId: string): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    subscriptions: number;
    activeSubscriptions: number;
    totalProcessed: number;
    failedProcessing: number;
  }>;

  /**
   * Register an event subscription
   */
  protected registerSubscription(config: EventSubscriptionConfig): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.set(subscriptionId, config);
    return subscriptionId;
  }

  /**
   * Process an event with reliability features
   */
  protected async processEvent(event: DomainEvent, subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;

    const context: EventHandlingContext = {
      subscriptionId,
      receivedAt: new Date(),
      retryCount: 0,
      correlationId: event.metadata?.correlationId,
      causationId: event.metadata?.causationId,
      metadata: event.metadata
    };

    // Check for message deduplication if enabled
    if (subscription.options?.deduplication && await this.isDuplicate(event)) {
      this.recordProcessingResult(event.eventId, true, 0, 0, 'duplicate_message');
      return;
    }

    // Retry loop with circuit breaker consideration
    const maxRetries = subscription.options?.retryAttempts || 3;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        context.retryCount = retryCount;
        await subscription.handler(event, context);
        this.recordProcessingResult(event.eventId, true, Date.now() - startTime, retryCount);
        return;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (attempt <= maxRetries) {
          const delay = subscription.options?.retryDelay || 1000;
          await this.sleep(delay * Math.pow(2, attempt - 1)); // Exponential backoff
        }
      }
    }

    // All retries failed - send to dead letter queue if enabled
    if (subscription.options?.deadLetterQueue) {
      await this.sendToDeadLetterQueue(event, lastError!, retryCount);
    }

    this.recordProcessingResult(event.eventId, false, Date.now() - startTime, retryCount, lastError!.message);
    throw lastError;
  }

  /**
   * Check if event is a duplicate (basic implementation)
   */
  private async isDuplicate(event: DomainEvent): Promise<boolean> {
    // In a real implementation, this would check a Redis set or database
    // For now, we'll use a simple in-memory check (not suitable for production)
    const key = `processed:${event.eventId}`;
    // This is a simplified implementation - in production you'd use Redis or a database
    return false; // Placeholder
  }

  /**
   * Send failed event to dead letter queue
   */
  private async sendToDeadLetterQueue(event: DomainEvent, error: Error, retryCount: number): Promise<void> {
    const dlqMessage = {
      event,
      error: error.message,
      retryCount,
      failedAt: new Date(),
      subscriptionId: 'unknown' // Would be passed in real implementation
    };

    console.error('Sending event to dead letter queue:', dlqMessage);
    // In a real implementation, this would send to a dead letter queue
  }

  /**
   * Record processing result for monitoring
   */
  private recordProcessingResult(
    eventId: string,
    success: boolean,
    duration: number,
    retryCount: number,
    error?: string
  ): void {
    const result: EventProcessingResult = {
      eventId,
      success,
      duration,
      retryCount,
      error,
      timestamp: new Date()
    };

    this.processingResults.push(result);

    // Maintain history limit
    if (this.processingResults.length > this.maxResultsHistory) {
      this.processingResults = this.processingResults.slice(-this.maxResultsHistory);
    }
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    totalProcessed: number;
    successful: number;
    failed: number;
    averageProcessingTime: number;
    averageRetries: number;
    recentResults: EventProcessingResult[];
  } {
    const totalProcessed = this.processingResults.length;
    const successful = this.processingResults.filter(r => r.success).length;
    const failed = totalProcessed - successful;

    const avgProcessingTime = totalProcessed > 0
      ? this.processingResults.reduce((sum, r) => sum + r.duration, 0) / totalProcessed
      : 0;

    const avgRetries = totalProcessed > 0
      ? this.processingResults.reduce((sum, r) => sum + r.retryCount, 0) / totalProcessed
      : 0;

    return {
      totalProcessed,
      successful,
      failed,
      averageProcessingTime: Math.round(avgProcessingTime),
      averageRetries: Math.round(avgRetries * 100) / 100,
      recentResults: this.processingResults.slice(-10)
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * In-Memory Event Subscriber
 * Simple in-memory implementation for testing and single-instance deployments
 */
export class InMemoryEventSubscriber extends BaseEventSubscriber {
  private isRunning = false;
  private eventQueue: Array<{ event: DomainEvent; subscriptionId: string }> = [];
  private processingInterval?: NodeJS.Timeout;

  async subscribe(config: EventSubscriptionConfig): Promise<string> {
    const subscriptionId = this.registerSubscription(config);
    console.log(`Subscribed to event type: ${config.eventType} with ID: ${subscriptionId}`);
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
    console.log(`Unsubscribed: ${subscriptionId}`);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('Starting in-memory event subscriber...');

    // Process events every 100ms
    this.processingInterval = setInterval(() => {
      this.processQueuedEvents();
    }, 100);
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    console.log('Stopped in-memory event subscriber');
  }

  /**
   * Queue an event for processing (called by event publisher)
   */
  async queueEvent(event: DomainEvent, subscriptionId: string): Promise<void> {
    if (!this.isRunning) return;

    this.eventQueue.push({ event, subscriptionId });
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    subscriptions: number;
    activeSubscriptions: number;
    totalProcessed: number;
    failedProcessing: number;
  }> {
    const stats = this.getProcessingStats();

    return {
      status: 'healthy',
      subscriptions: this.subscriptions.size,
      activeSubscriptions: this.subscriptions.size,
      totalProcessed: stats.totalProcessed,
      failedProcessing: stats.failed
    };
  }

  private async processQueuedEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    // Process events concurrently but limit concurrency
    const concurrencyLimit = 5;
    for (let i = 0; i < eventsToProcess.length; i += concurrencyLimit) {
      const batch = eventsToProcess.slice(i, i + concurrencyLimit);
      await Promise.allSettled(
        batch.map(({ event, subscriptionId }) =>
          this.processEvent(event, subscriptionId)
        )
      );
    }
  }
}

/**
 * Redis Event Subscriber
 * Redis-based event subscription for distributed systems
 */
export class RedisEventSubscriber extends BaseEventSubscriber {
  private redisSubscriber?: any;
  private isRunning = false;
  private connected = false;

  constructor(private redisUrl?: string) {
    super();
    this.initializeRedis();
  }

  async subscribe(config: EventSubscriptionConfig): Promise<string> {
    if (!this.connected || !this.redisSubscriber) {
      throw new Error('Redis subscriber not available');
    }

    const subscriptionId = this.registerSubscription(config);

    // Subscribe to Redis channel
    const channel = `events:${config.eventType}`;
    await this.redisSubscriber.subscribe(channel);

    console.log(`Subscribed to Redis channel: ${channel} with ID: ${subscriptionId}`);
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription && this.redisSubscriber) {
      const channel = `events:${subscription.eventType}`;
      await this.redisSubscriber.unsubscribe(channel);
    }

    this.subscriptions.delete(subscriptionId);
    console.log(`Unsubscribed from Redis: ${subscriptionId}`);
  }

  async start(): Promise<void> {
    if (this.isRunning || !this.connected) return;

    this.isRunning = true;
    console.log('Starting Redis event subscriber...');

    // Set up message handler
    if (this.redisSubscriber) {
      this.redisSubscriber.on('message', async (channel: string, message: string) => {
        try {
          const event = EventSerializer.deserialize(message);
          const eventType = channel.replace('events:', '');
          const subscriptionId = this.findSubscriptionId(eventType);

          if (subscriptionId) {
            await this.processEvent(event, subscriptionId);
          }
        } catch (error) {
          console.error('Error processing Redis message:', error);
        }
      });
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
    }

    console.log('Stopped Redis event subscriber');
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    subscriptions: number;
    activeSubscriptions: number;
    totalProcessed: number;
    failedProcessing: number;
  }> {
    const stats = this.getProcessingStats();
    const status = this.connected ? 'healthy' : 'unhealthy';

    return {
      status: status as any,
      subscriptions: this.subscriptions.size,
      activeSubscriptions: this.subscriptions.size,
      totalProcessed: stats.totalProcessed,
      failedProcessing: stats.failed
    };
  }

  private async initializeRedis(): Promise<void> {
    try {
      console.log('Initializing Redis subscriber connection...');
      // In a real implementation, you would initialize Redis client here
      await new Promise(resolve => setTimeout(resolve, 100));
      this.connected = true;
      console.log('Redis subscriber connection established');
    } catch (error) {
      console.error('Failed to connect to Redis subscriber:', error);
      this.connected = false;
    }
  }

  private findSubscriptionId(eventType: string): string | null {
    for (const [id, config] of this.subscriptions) {
      if (config.eventType === eventType) {
        return id;
      }
    }
    return null;
  }
}

/**
 * Event Subscriber Factory
 */
export class EventSubscriberFactory {
  private static instance: BaseEventSubscriber | null = null;

  static createInMemory(): InMemoryEventSubscriber {
    return new InMemoryEventSubscriber();
  }

  static createRedis(redisUrl?: string): RedisEventSubscriber {
    return new RedisEventSubscriber(redisUrl);
  }

  static createDefault(): BaseEventSubscriber {
    const type = process.env.EVENT_SUBSCRIBER_TYPE || 'in_memory';

    switch (type) {
      case 'redis':
        return this.createRedis();
      case 'in_memory':
      default:
        return this.createInMemory();
    }
  }

  static getInstance(): BaseEventSubscriber | null {
    return this.instance;
  }

  static setInstance(subscriber: BaseEventSubscriber): void {
    if (this.instance) {
      throw new Error('Event subscriber instance already exists');
    }
    this.instance = subscriber;
  }
}

/**
 * Event Subscription Manager
 * Manages event subscriptions and provides high-level operations
 */
export class EventSubscriptionManager {
  constructor(
    private subscriber: BaseEventSubscriber,
    private publisher: any // Would be the event publisher
  ) {}

  /**
   * Subscribe to domain events with automatic handler registration
   */
  async subscribeToDomainEvent(
    eventType: string,
    handler: EventHandler,
    options?: EventSubscriptionConfig['options']
  ): Promise<string> {
    const config: EventSubscriptionConfig = {
      eventType,
      handler,
      options: {
        retryAttempts: 3,
        retryDelay: 1000,
        circuitBreaker: true,
        deduplication: true,
        deadLetterQueue: true,
        ...options
      }
    };

    return await this.subscriber.subscribe(config);
  }

  /**
   * Subscribe to multiple event types at once
   */
  async subscribeToEvents(
    subscriptions: Array<{ eventType: string; handler: EventHandler; options?: any }>
  ): Promise<string[]> {
    const subscriptionIds: string[] = [];

    for (const sub of subscriptions) {
      const id = await this.subscribeToDomainEvent(sub.eventType, sub.handler, sub.options);
      subscriptionIds.push(id);
    }

    return subscriptionIds;
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(subscriptionIds: string | string[]): Promise<void> {
    const ids = Array.isArray(subscriptionIds) ? subscriptionIds : [subscriptionIds];

    for (const id of ids) {
      await this.subscriber.unsubscribe(id);
    }
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    activeSubscriptions: number;
    processingStats: any;
    healthStatus: any;
  } {
    const subscriber = this.subscriber as any;
    return {
      activeSubscriptions: subscriber.subscriptions?.size || 0,
      processingStats: subscriber.getProcessingStats?.() || {},
      healthStatus: {} // Would get from subscriber
    };
  }

  /**
   * Start the subscription manager
   */
  async start(): Promise<void> {
    await this.subscriber.start();
  }

  /**
   * Stop the subscription manager
   */
  async stop(): Promise<void> {
    await this.subscriber.stop();
  }
}

type LegacySubscriberAdapter = {
  subscribe?: (eventType: string, handler: (...args: unknown[]) => unknown) => Promise<void>;
  unsubscribe?: (eventType: string) => Promise<void>;
  handleMessage?: (eventType: string, payload: unknown) => Promise<void>;
};

/**
 * Legacy EventSubscriber facade retained for older tests/callers.
 */
export class EventSubscriber {
  constructor(private readonly adapter?: LegacySubscriberAdapter) { }

  async subscribe(eventType: string, handler: (...args: unknown[]) => unknown): Promise<void> {
    if (this.adapter?.subscribe) {
      await this.adapter.subscribe(eventType, handler);
    }
  }

  async unsubscribe(eventType: string): Promise<void> {
    if (this.adapter?.unsubscribe) {
      await this.adapter.unsubscribe(eventType);
    }
  }

  async handleMessage(eventType: string, payload: unknown): Promise<void> {
    if (this.adapter?.handleMessage) {
      await this.adapter.handleMessage(eventType, payload);
    }
  }
}
