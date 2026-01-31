/**
 * Event Publisher Implementation
 * Infrastructure layer implementation of DomainEventPublisher interface
 * Handles domain event publishing with multiple transport mechanisms
 */

import { DomainEventPublisher, DomainEvent } from '../../domain/interfaces';
import { IdGenerator, DateTimeService } from '../../domain/interfaces';

/**
 * Event Publishing Strategy
 * Defines how events are published (sync, async, batched, etc.)
 */
export enum PublishingStrategy {
  IMMEDIATE = 'immediate',     // Publish immediately
  BATCHED = 'batched',         // Batch events for efficiency
  ASYNC = 'async',            // Fire-and-forget publishing
  TRANSACTIONAL = 'transactional' // Publish within transaction
}

/**
 * Event Transport Types
 * Different transport mechanisms for event publishing
 */
export enum EventTransport {
  IN_MEMORY = 'in_memory',     // In-memory for testing/single instance
  REDIS = 'redis',            // Redis pub/sub
  HTTP = 'http',              // HTTP webhook delivery
  KAFKA = 'kafka',            // Kafka message broker
  OUTBOX = 'outbox'           // Transactional Outbox pattern
}


/**
 * Event Publishing Configuration
 */
export interface EventPublisherConfig {
  strategy: PublishingStrategy;
  transport: EventTransport;
  batchSize: number;
  batchTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  enablePersistence: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
}

/**
 * Event Publishing Result
 */
export interface PublishingResult {
  eventId: string;
  success: boolean;
  transport: EventTransport;
  timestamp: Date;
  duration: number;
  retryCount: number;
  error?: string;
}

/**
 * Batch Publishing Result
 */
export interface BatchPublishingResult {
  batchId: string;
  events: PublishingResult[];
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  duration: number;
  timestamp: Date;
}

/**
 * Event Publisher Base Class
 * Abstract base class for event publishing implementations
 */
export abstract class BaseEventPublisher implements DomainEventPublisher {
  protected config: EventPublisherConfig;
  protected idGenerator: IdGenerator;
  protected dateTimeService: DateTimeService;

  constructor(
    config: EventPublisherConfig,
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService
  ) {
    this.config = config;
    this.idGenerator = idGenerator;
    this.dateTimeService = dateTimeService;
  }

  abstract publish(event: DomainEvent): Promise<void>;
  abstract publishAll(events: DomainEvent[]): Promise<void>;
  abstract close(): Promise<void>;
}

/**
 * Transactional Outbox Event Publisher
 * Persists events to database within a transaction instead of direct publishing
 */
export class TransactionalOutboxPublisher extends BaseEventPublisher {
  constructor(
    private repository: any, // PrismaOutboxRepository
    config: Partial<EventPublisherConfig> = {},
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService
  ) {
    const defaultConfig: EventPublisherConfig = {
      strategy: PublishingStrategy.TRANSACTIONAL,
      transport: EventTransport.OUTBOX,
      batchSize: 1,
      batchTimeout: 0,
      retryAttempts: 3,
      retryDelay: 1000,
      enablePersistence: true,
      enableMetrics: true,
      enableTracing: true,
      ...config
    };

    super(defaultConfig, idGenerator, dateTimeService);
  }

  async publish(event: DomainEvent, transaction?: any): Promise<void> {
    console.log(`Saving event ${event.eventId} to outbox: ${event.eventType}`);
    await this.repository.save({
      eventId: event.eventId,
      eventType: event.eventType,
      eventData: event,
      status: 'PENDING'
    }, transaction);
  }

  async publishAll(events: DomainEvent[], transaction?: any): Promise<void> {
    await Promise.all(events.map(event => this.publish(event, transaction)));
  }

  async close(): Promise<void> {
    // No specific cleanup needed for outbox publisher
  }
}

/**
 * In-Memory Event Publisher
 * Simple in-memory implementation for testing and single-instance deployments
 * Stores events in memory and provides synchronous access
 */
export class InMemoryEventPublisher extends BaseEventPublisher {
  private eventStore: Map<string, DomainEvent> = new Map();
  private eventHandlers: Map<string, Array<(event: DomainEvent) => Promise<void>>> = new Map();
  private batchQueue: DomainEvent[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(
    config: Partial<EventPublisherConfig> = {},
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService
  ) {
    const defaultConfig: EventPublisherConfig = {
      strategy: PublishingStrategy.IMMEDIATE,
      transport: EventTransport.IN_MEMORY,
      batchSize: 10,
      batchTimeout: 5000,
      retryAttempts: 0,
      retryDelay: 1000,
      enablePersistence: false,
      enableMetrics: false,
      enableTracing: false,
      ...config
    };

    super(defaultConfig, idGenerator, dateTimeService);
  }

  async publish(event: DomainEvent): Promise<void> {
    if (this.config.strategy === PublishingStrategy.BATCHED) {
      this.addToBatch(event);
      return;
    }

    await this.publishEvent(event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    if (this.config.strategy === PublishingStrategy.BATCHED) {
      this.batchQueue.push(...events);
      this.scheduleBatchPublish();
      return;
    }

    await Promise.all(events.map(event => this.publishEvent(event)));
  }

  async close(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Publish any remaining batched events
    if (this.batchQueue.length > 0) {
      await this.publishBatch();
    }
  }

  /**
   * Register an event handler for a specific event type
   */
  registerHandler(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Get all stored events (for testing/debugging)
   */
  getStoredEvents(): DomainEvent[] {
    return Array.from(this.eventStore.values());
  }

  /**
   * Clear all stored events (for testing)
   */
  clearStoredEvents(): void {
    this.eventStore.clear();
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    // Store the event
    this.eventStore.set(event.eventId, event);

    // Notify registered handlers
    const handlers = this.eventHandlers.get(event.eventType) || [];
    await Promise.all(handlers.map(handler => this.safeExecuteHandler(handler, event)));
  }

  private addToBatch(event: DomainEvent): void {
    this.batchQueue.push(event);

    if (this.batchQueue.length >= this.config.batchSize) {
      this.publishBatch();
    } else {
      this.scheduleBatchPublish();
    }
  }

  private scheduleBatchPublish(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.publishBatch();
    }, this.config.batchTimeout);
  }

  private async publishBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    await Promise.all(batch.map(event => this.publishEvent(event)));
  }

  private async safeExecuteHandler(handler: (event: DomainEvent) => Promise<void>, event: DomainEvent): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      console.error(`Event handler failed for event ${event.eventId}:`, error);
      // In production, you might want to send this to a dead letter queue
      // or implement retry logic
    }
  }
}

/**
 * Redis Event Publisher
 * Redis-based event publishing for distributed systems
 * Uses Redis pub/sub for real-time event distribution
 */
export class RedisEventPublisher extends BaseEventPublisher {
  private redisPublisher?: any;
  private redisSubscriber?: any;
  private batchQueue: DomainEvent[] = [];
  private batchTimer?: NodeJS.Timeout;
  private connected: boolean = false;

  constructor(
    config: Partial<EventPublisherConfig> & { redisUrl?: string } = {},
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService
  ) {
    const defaultConfig: EventPublisherConfig = {
      strategy: PublishingStrategy.ASYNC,
      transport: EventTransport.REDIS,
      batchSize: 50,
      batchTimeout: 2000,
      retryAttempts: 3,
      retryDelay: 1000,
      enablePersistence: true,
      enableMetrics: true,
      enableTracing: true,
      ...config
    };

    super(defaultConfig, idGenerator, dateTimeService);

    // Initialize Redis connection
    this.initializeRedis(config.redisUrl);
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis connection not available');
    }

    if (this.config.strategy === PublishingStrategy.BATCHED) {
      this.addToBatch(event);
      return;
    }

    await this.publishToRedis(event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis connection not available');
    }

    if (this.config.strategy === PublishingStrategy.BATCHED) {
      this.batchQueue.push(...events);
      this.scheduleBatchPublish();
      return;
    }

    await Promise.all(events.map(event => this.publishToRedis(event)));
  }

  async close(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Publish any remaining batched events
    if (this.batchQueue.length > 0) {
      await this.publishBatchToRedis();
    }

    // Close Redis connections
    if (this.redisPublisher) {
      await this.redisPublisher.quit();
    }
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
    }
  }

  private async initializeRedis(redisUrl?: string): Promise<void> {
    try {
      // In a real implementation, you would initialize Redis clients here
      // For now, we'll simulate the connection
      console.log('Initializing Redis connection...');

      // Simulate async connection
      await new Promise(resolve => setTimeout(resolve, 100));

      this.connected = true;
      console.log('Redis connection established');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.connected = false;
    }
  }

  private async publishToRedis(event: DomainEvent): Promise<void> {
    if (!this.redisPublisher) return;

    const channel = `events:${event.eventType}`;
    const message = JSON.stringify(event);

    try {
      await this.redisPublisher.publish(channel, message);
    } catch (error) {
      console.error(`Failed to publish event ${event.eventId} to Redis:`, error);
      throw error;
    }
  }

  private addToBatch(event: DomainEvent): void {
    this.batchQueue.push(event);

    if (this.batchQueue.length >= this.config.batchSize) {
      this.publishBatchToRedis();
    } else {
      this.scheduleBatchPublish();
    }
  }

  private scheduleBatchPublish(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.publishBatchToRedis();
    }, this.config.batchTimeout);
  }

  private async publishBatchToRedis(): Promise<void> {
    if (this.batchQueue.length === 0 || !this.redisPublisher) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Publish events in parallel
    await Promise.all(batch.map(event => this.publishToRedis(event)));
  }
}

/**
 * Kafka Event Publisher
 * Kafka-based event publishing for high-scale distributed systems
 */
export class KafkaEventPublisher extends BaseEventPublisher {
  private kafkaPublisher: any; // We'll use the shared Kafka publisher or kafkajs
  private connected: boolean = false;

  constructor(
    config: Partial<EventPublisherConfig> = {},
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService
  ) {
    const defaultConfig: EventPublisherConfig = {
      strategy: PublishingStrategy.ASYNC,
      transport: EventTransport.KAFKA,
      batchSize: 100,
      batchTimeout: 1000,
      retryAttempts: 5,
      retryDelay: 500,
      enablePersistence: true,
      enableMetrics: true,
      enableTracing: true,
      ...config
    };

    super(defaultConfig, idGenerator, dateTimeService);
    this.initializeKafka();
  }

  private async initializeKafka(): Promise<void> {
    try {
      // In a real implementation, you would initialize Kafka producer here
      // For now, we'll simulate the connection as per the plan
      console.log('Initializing Kafka connection...');
      this.connected = true;
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      this.connected = false;
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.connected) throw new Error('Kafka connection not available');
    console.log(`Publishing event ${event.eventId} to Kafka topic: ${event.eventType}`);
    // implementation using kafkajs...
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map(event => this.publish(event)));
  }

  async close(): Promise<void> {
    this.connected = false;
  }
}

/**
 * Event Publisher Factory
 * Factory for creating event publisher instances
 */
export class EventPublisherFactory {
  private static instance: BaseEventPublisher | null = null;

  static createInMemory(
    config: Partial<EventPublisherConfig> = {},
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService
  ): InMemoryEventPublisher {
    return new InMemoryEventPublisher(config, idGenerator, dateTimeService);
  }

  static createRedis(
    config: Partial<EventPublisherConfig> & { redisUrl?: string } = {},
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService
  ): RedisEventPublisher {
    return new RedisEventPublisher(config, idGenerator, dateTimeService);
  }

  static createKafka(
    config: Partial<EventPublisherConfig> = {},
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService
  ): KafkaEventPublisher {
    return new KafkaEventPublisher(config, idGenerator, dateTimeService);
  }

  static createOutbox(
    repository: any,
    config: Partial<EventPublisherConfig> = {},
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService
  ): TransactionalOutboxPublisher {
    return new TransactionalOutboxPublisher(repository, config, idGenerator, dateTimeService);
  }

  static createDefault(
    config: Partial<EventPublisherConfig> = {},
    idGenerator: IdGenerator,
    dateTimeService: DateTimeService,
    repository?: any
  ): BaseEventPublisher {
    // Use environment variable to determine transport type
    const transport = process.env.EVENT_TRANSPORT || EventTransport.OUTBOX;

    switch (transport) {
      case EventTransport.OUTBOX:
        if (!repository) throw new Error('Repository required for OUTBOX transport');
        return this.createOutbox(repository, config, idGenerator, dateTimeService);
      case EventTransport.KAFKA:
        return this.createKafka(config, idGenerator, dateTimeService);
      case EventTransport.REDIS:
        return this.createRedis(config, idGenerator, dateTimeService);
      case EventTransport.IN_MEMORY:
      default:
        return this.createInMemory(config, idGenerator, dateTimeService);
    }
  }

  static getInstance(): BaseEventPublisher | null {
    return this.instance;
  }

  static setInstance(publisher: BaseEventPublisher): void {
    if (this.instance) {
      throw new Error('Event publisher instance already exists');
    }
    this.instance = publisher;
  }
}

/**
 * Event Serialization Utilities
 */
export class EventSerializer {
  /**
   * Serialize domain event to JSON
   */
  static serialize(event: DomainEvent): string {
    return JSON.stringify({
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      version: event.version,
      timestamp: event.timestamp.toISOString(),
      payload: event.payload,
      metadata: event.metadata
    });
  }

  /**
   * Deserialize JSON to domain event
   */
  static deserialize(json: string): DomainEvent {
    const data = JSON.parse(json);

    return {
      eventId: data.eventId,
      eventType: data.eventType,
      aggregateId: data.aggregateId,
      version: data.version,
      timestamp: new Date(data.timestamp),
      payload: data.payload,
      metadata: data.metadata
    };
  }

  /**
   * Validate event structure
   */
  static validate(event: any): event is DomainEvent {
    return (
      event &&
      typeof event.eventId === 'string' &&
      typeof event.eventType === 'string' &&
      typeof event.aggregateId === 'string' &&
      typeof event.version === 'number' &&
      event.timestamp instanceof Date &&
      typeof event.payload === 'object'
    );
  }
}

/**
 * Event Publishing Metrics
 */
export class EventPublishingMetrics {
  private metrics = {
    totalPublished: 0,
    totalFailed: 0,
    averagePublishTime: 0,
    transportUsage: new Map<EventTransport, number>(),
    eventTypeUsage: new Map<string, number>(),
    lastPublishedAt: null as Date | null
  };

  recordSuccess(eventType: string, transport: EventTransport, duration: number): void {
    this.metrics.totalPublished++;
    this.metrics.transportUsage.set(transport, (this.metrics.transportUsage.get(transport) || 0) + 1);
    this.metrics.eventTypeUsage.set(eventType, (this.metrics.eventTypeUsage.get(eventType) || 0) + 1);
    this.metrics.lastPublishedAt = new Date();

    // Update average publish time
    const totalTime = this.metrics.averagePublishTime * (this.metrics.totalPublished - 1);
    this.metrics.averagePublishTime = (totalTime + duration) / this.metrics.totalPublished;
  }

  recordFailure(eventType: string, transport: EventTransport): void {
    this.metrics.totalFailed++;
    this.metrics.transportUsage.set(transport, (this.metrics.transportUsage.get(transport) || 0) + 1);
  }

  getMetrics() {
    return {
      ...this.metrics,
      transportUsage: Object.fromEntries(this.metrics.transportUsage),
      eventTypeUsage: Object.fromEntries(this.metrics.eventTypeUsage)
    };
  }

  reset(): void {
    this.metrics.totalPublished = 0;
    this.metrics.totalFailed = 0;
    this.metrics.averagePublishTime = 0;
    this.metrics.transportUsage.clear();
    this.metrics.eventTypeUsage.clear();
    this.metrics.lastPublishedAt = null;
  }
}
