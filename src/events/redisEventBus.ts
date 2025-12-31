import { Redis } from 'ioredis';

// Event data structure with type safety
export interface EventData {
  eventId: string;
  eventType: string;
  timestamp: Date;
  source: string; // Service that published the event
  version: string; // Event schema version
  payload: any;
  metadata?: {
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    retryCount?: number;
  };
}

// Event handler function type
export type EventHandler = (event: EventData) => Promise<void> | void;

// Redis Event Bus configuration
export interface RedisEventBusConfig {
  redisUrl?: string;
  redisPassword?: string;
  maxRetries?: number;
  retryDelay?: number;
  deadLetterQueue?: string;
  eventPrefix?: string;
}

/**
 * Redis-based Distributed Event Bus
 * Provides reliable, scalable event publishing and subscription across services
 */
export class RedisEventBus {
  private redis: Redis;
  private subscriber: Redis;
  private config: Required<RedisEventBusConfig>;
  private subscribers: Map<string, EventHandler[]> = new Map();
  private isConnected = false;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(config: RedisEventBusConfig = {}) {
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      redisPassword: config.redisPassword || process.env.REDIS_PASSWORD || undefined,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      deadLetterQueue: config.deadLetterQueue || 'events:dead-letter',
      eventPrefix: config.eventPrefix || 'events'
    };

    // Publisher connection
    this.redis = new Redis(this.config.redisUrl, {
      password: this.config.redisPassword,
      retryDelayOnFailover: this.config.retryDelay,
      maxRetriesPerRequest: this.config.maxRetries,
      lazyConnect: true
    });

    // Subscriber connection (separate connection for pub/sub)
    this.subscriber = new Redis(this.config.redisUrl, {
      password: this.config.redisPassword,
      retryDelayOnFailover: this.config.retryDelay,
      maxRetriesPerRequest: this.config.maxRetries,
      lazyConnect: true
    });

    this.setupEventHandlers();
    this.connect();
  }

  /**
   * Setup Redis connection event handlers
   */
  private setupEventHandlers(): void {
    // Publisher events
    this.redis.on('connect', () => {
      console.log('🔗 Redis EventBus Publisher connected');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis EventBus Publisher error:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    });

    this.redis.on('close', () => {
      console.log('🔌 Redis EventBus Publisher disconnected');
      this.isConnected = false;
    });

    // Subscriber events
    this.subscriber.on('connect', () => {
      console.log('🔗 Redis EventBus Subscriber connected');
    });

    this.subscriber.on('error', (error) => {
      console.error('❌ Redis EventBus Subscriber error:', error);
    });

    this.subscriber.on('close', () => {
      console.log('🔌 Redis EventBus Subscriber disconnected');
    });

    // Message handler for subscribed events
    this.subscriber.on('message', async (channel: string, message: string) => {
      try {
        const event: EventData = JSON.parse(message);
        await this.handleEvent(channel, event);
      } catch (error) {
        console.error(`❌ Failed to parse event from channel ${channel}:`, error);
        await this.moveToDeadLetterQueue(channel, message, error);
      }
    });
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    try {
      await Promise.all([
        this.redis.connect(),
        this.subscriber.connect()
      ]);
      this.isConnected = true;
      console.log('✅ Redis EventBus fully connected');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      console.log('🔄 Attempting to reconnect to Redis...');
      this.reconnectTimer = undefined;
      await this.connect();
    }, this.config.retryDelay);
  }

  /**
   * Publish an event to a channel
   */
  async publish(eventType: string, payload: any, metadata?: EventData['metadata']): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis EventBus is not connected');
    }

    const event: EventData = {
      eventId: this.generateEventId(),
      eventType,
      timestamp: new Date(),
      source: process.env.SERVICE_NAME || 'unknown-service',
      version: '1.0',
      payload,
      metadata
    };

    try {
      const channel = `${this.config.eventPrefix}:${eventType}`;
      const message = JSON.stringify(event);

      await this.redis.publish(channel, message);
      console.log(`📤 Published event: ${eventType} (ID: ${event.eventId})`);

      // Store event for debugging/auditing (optional)
      await this.storeEventForAudit(event);

    } catch (error) {
      console.error(`❌ Failed to publish event ${eventType}:`, error);
      await this.moveToDeadLetterQueue(eventType, JSON.stringify(event), error);
      throw error;
    }
  }

  /**
   * Subscribe to events of a specific type
   */
  subscribe(eventType: string, handler: EventHandler): void {
    const channel = `${this.config.eventPrefix}:${eventType}`;

    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, []);
      // Subscribe to the Redis channel
      this.subscriber.subscribe(channel);
      console.log(`📡 Subscribed to events: ${eventType}`);
    }

    this.subscribers.get(channel)!.push(handler);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string, handler?: EventHandler): void {
    const channel = `${this.config.eventPrefix}:${eventType}`;
    const handlers = this.subscribers.get(channel);

    if (!handlers) return;

    if (handler) {
      // Remove specific handler
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      // Remove all handlers for this event type
      handlers.length = 0;
    }

    if (handlers.length === 0) {
      this.subscribers.delete(channel);
      this.subscriber.unsubscribe(channel);
      console.log(`🚫 Unsubscribed from events: ${eventType}`);
    }
  }

  /**
   * Handle incoming event messages
   */
  private async handleEvent(channel: string, event: EventData): Promise<void> {
    const handlers = this.subscribers.get(channel);
    if (!handlers || handlers.length === 0) return;

    console.log(`📥 Processing event: ${event.eventType} (ID: ${event.eventId})`);

    // Process all handlers for this event type
    const promises = handlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`❌ Event handler failed for ${event.eventType}:`, error);

        // Increment retry count
        const retryCount = (event.metadata?.retryCount || 0) + 1;

        if (retryCount <= this.config.maxRetries) {
          // Retry the event
          console.log(`🔄 Retrying event ${event.eventType} (attempt ${retryCount})`);
          setTimeout(() => {
            this.publish(event.eventType, event.payload, {
              ...event.metadata,
              retryCount
            });
          }, this.config.retryDelay * retryCount);
        } else {
          // Move to dead letter queue
          await this.moveToDeadLetterQueue(channel, JSON.stringify(event), error);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Store event for auditing/debugging purposes
   */
  private async storeEventForAudit(event: EventData): Promise<void> {
    try {
      const auditKey = `audit:events:${event.eventType}`;
      const auditData = {
        eventId: event.eventId,
        timestamp: event.timestamp.toISOString(),
        source: event.source,
        payload: JSON.stringify(event.payload)
      };

      // Keep only last 1000 events per type (configurable)
      await this.redis.lpush(auditKey, JSON.stringify(auditData));
      await this.redis.ltrim(auditKey, 0, 999);
    } catch (error) {
      // Don't fail the publish if audit fails
      console.warn('⚠️ Failed to store event for audit:', error);
    }
  }

  /**
   * Move failed events to dead letter queue
   */
  private async moveToDeadLetterQueue(channel: string, message: string, error: any): Promise<void> {
    try {
      const deadLetterData = {
        channel,
        message,
        error: error.message,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };

      await this.redis.lpush(this.config.deadLetterQueue, JSON.stringify(deadLetterData));
      console.log(`⚰️ Moved failed event to dead letter queue: ${channel}`);
    } catch (dlqError) {
      console.error('❌ Failed to move event to dead letter queue:', dlqError);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const service = process.env.SERVICE_NAME || 'unknown';
    return `${service}-${timestamp}-${random}`;
  }

  /**
   * Get connection status
   */
  isHealthy(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }

  /**
   * Get subscriber count for a specific event type
   */
  getSubscriberCount(eventType: string): number {
    const channel = `${this.config.eventPrefix}:${eventType}`;
    return this.subscribers.get(channel)?.length || 0;
  }

  /**
   * Get all subscribed event types
   */
  getSubscribedEvents(): string[] {
    return Array.from(this.subscribers.keys()).map(channel =>
      channel.replace(`${this.config.eventPrefix}:`, '')
    );
  }

  /**
   * Gracefully close connections
   */
  async close(): Promise<void> {
    console.log('🔌 Closing Redis EventBus connections...');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.subscribers.clear();

    await Promise.allSettled([
      this.redis.quit(),
      this.subscriber.quit()
    ]);

    this.isConnected = false;
    console.log('✅ Redis EventBus connections closed');
  }
}

// Export singleton instance for application-wide use
let eventBusInstance: RedisEventBus | null = null;

export const getEventBus = (config?: RedisEventBusConfig): RedisEventBus => {
  if (!eventBusInstance) {
    eventBusInstance = new RedisEventBus(config);
  }
  return eventBusInstance;
};

export const closeEventBus = async (): Promise<void> => {
  if (eventBusInstance) {
    await eventBusInstance.close();
    eventBusInstance = null;
  }
};
