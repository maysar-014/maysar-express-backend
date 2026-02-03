/**
 * External Messaging Adapter Implementation
 * Infrastructure layer implementation for external message brokers
 * Provides Kafka, RabbitMQ, and other external messaging integrations
 */

import { DomainEvent } from '../../domain/interfaces';
import { EventSerializer } from './event-publisher';
import { BaseEventSubscriber, EventSubscriptionConfig, EventHandler } from './event-subscriber';

/**
 * External Messaging Provider Types
 */
export enum MessagingProvider {
  KAFKA = 'kafka',
  RABBITMQ = 'rabbitmq',
  AWS_SQS = 'aws_sqs',
  AZURE_SERVICE_BUS = 'azure_service_bus',
  GOOGLE_PUBSUB = 'google_pubsub'
}

/**
 * External Messaging Configuration
 */
export interface ExternalMessagingConfig {
  provider: MessagingProvider;
  brokers?: string[]; // Kafka brokers
  url?: string; // RabbitMQ URL, SQS endpoint, etc.
  clientId?: string;
  groupId?: string;
  topics?: Record<string, string>; // Event type to topic mapping
  queues?: Record<string, string>; // Event type to queue mapping
  exchange?: string; // RabbitMQ exchange
  routingKeys?: Record<string, string>; // Event type to routing key mapping
  region?: string; // AWS region
  accessKeyId?: string;
  secretAccessKey?: string;
  connectionPool?: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
  retryConfig?: {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
  };
  monitoring?: {
    enabled: boolean;
    metricsPrefix: string;
  };
}

/**
 * Message Delivery Result
 */
export interface MessageDeliveryResult {
  messageId: string;
  eventId: string;
  success: boolean;
  deliveryTime: number;
  partition?: number;
  offset?: string;
  error?: string;
  retryCount: number;
  timestamp: Date;
}

/**
 * Dead Letter Queue Message
 */
export interface DeadLetterMessage {
  originalMessage: any;
  eventId: string;
  error: string;
  retryCount: number;
  failedAt: Date;
  routingKey?: string;
  topic?: string;
  queue?: string;
}

/**
 * Message Deduplication Store
 */
interface DeduplicationEntry {
  eventId: string;
  processedAt: Date;
  ttl: number;
}

/**
 * External Messaging Adapter Base Class
 */
export abstract class BaseExternalMessagingAdapter {
  protected config: ExternalMessagingConfig;
  protected connected = false;
  protected deliveryResults: MessageDeliveryResult[] = [];
  protected maxResultsHistory = 10000;
  protected deduplicationStore = new Map<string, DeduplicationEntry>();
  protected deadLetterQueue: DeadLetterMessage[] = [];

  constructor(config: ExternalMessagingConfig) {
    this.config = config;
  }

  /**
   * Connect to the external messaging system
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the external messaging system
   */
  abstract disconnect(): Promise<void>;

  /**
   * Publish an event to the external messaging system
   */
  abstract publish(event: DomainEvent): Promise<MessageDeliveryResult>;

  /**
   * Subscribe to events from the external messaging system
   */
  abstract subscribe(
    subscription: EventSubscriptionConfig,
    subscriber: BaseEventSubscriber
  ): Promise<string>;

  /**
   * Unsubscribe from events
   */
  abstract unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Get connection health status
   */
  abstract getHealthStatus(): Promise<{
    connected: boolean;
    messageCount?: number;
    consumerLag?: number;
    errorRate?: number;
  }>;

  /**
   * Publish event with reliability features
   */
  protected async publishWithReliability(event: DomainEvent): Promise<MessageDeliveryResult> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = this.config.retryConfig?.maxRetries || 3;

    // Check for message deduplication
    if (await this.isDuplicate(event)) {
      return {
        messageId: `dup_${event.eventId}`,
        eventId: event.eventId,
        success: true,
        deliveryTime: 0,
        retryCount: 0,
        timestamp: new Date()
      };
    }

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await this.publish(event);
        this.recordDeliveryResult(result);

        // Store for deduplication
        this.storeForDeduplication(event);

        return result;
      } catch (error) {
        retryCount++;

        if (attempt <= maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        } else {
          // Send to dead letter queue
          await this.sendToDeadLetterQueue(event, error as Error, retryCount);

          const failedResult: MessageDeliveryResult = {
            messageId: `failed_${event.eventId}`,
            eventId: event.eventId,
            success: false,
            deliveryTime: Date.now() - startTime,
            retryCount,
            error: (error as Error).message,
            timestamp: new Date()
          };

          this.recordDeliveryResult(failedResult);
          return failedResult;
        }
      }
    }

    throw new Error('Unexpected error in publishWithReliability');
  }

  /**
   * Get topic/queue for event type
   */
  protected getDestination(eventType: string): string {
    // Check topics first (Kafka)
    if (this.config.topics?.[eventType]) {
      return this.config.topics[eventType];
    }

    // Check queues (RabbitMQ, SQS)
    if (this.config.queues?.[eventType]) {
      return this.config.queues[eventType];
    }

    // Default mapping
    return eventType.toLowerCase().replace(/\./g, '-');
  }

  /**
   * Get routing key for event type (RabbitMQ)
   */
  protected getRoutingKey(eventType: string): string {
    return this.config.routingKeys?.[eventType] || eventType.toLowerCase();
  }

  /**
   * Check if event is a duplicate
   */
  private async isDuplicate(event: DomainEvent): Promise<boolean> {
    const entry = this.deduplicationStore.get(event.eventId);
    if (!entry) return false;

    // Check if TTL has expired
    if (Date.now() - entry.processedAt.getTime() > entry.ttl * 1000) {
      this.deduplicationStore.delete(event.eventId);
      return false;
    }

    return true;
  }

  /**
   * Store event for deduplication
   */
  private storeForDeduplication(event: DomainEvent): void {
    const ttl = 300; // 5 minutes default
    this.deduplicationStore.set(event.eventId, {
      eventId: event.eventId,
      processedAt: new Date(),
      ttl
    });

    // Clean up expired entries periodically
    if (this.deduplicationStore.size > 10000) {
      this.cleanupExpiredDeduplicationEntries();
    }
  }

  /**
   * Send failed message to dead letter queue
   */
  private async sendToDeadLetterQueue(event: DomainEvent, error: Error, retryCount: number): Promise<void> {
    const dlqMessage: DeadLetterMessage = {
      originalMessage: EventSerializer.serialize(event),
      eventId: event.eventId,
      error: error.message,
      retryCount,
      failedAt: new Date(),
      topic: this.config.topics?.[event.eventType],
      queue: this.config.queues?.[event.eventType],
      routingKey: this.config.routingKeys?.[event.eventType]
    };

    this.deadLetterQueue.push(dlqMessage);

    // Keep DLQ size manageable
    if (this.deadLetterQueue.length > 1000) {
      this.deadLetterQueue = this.deadLetterQueue.slice(-1000);
    }

    console.error('Message sent to dead letter queue:', dlqMessage);
  }

  /**
   * Record delivery result for monitoring
   */
  private recordDeliveryResult(result: MessageDeliveryResult): void {
    this.deliveryResults.push(result);

    if (this.deliveryResults.length > this.maxResultsHistory) {
      this.deliveryResults = this.deliveryResults.slice(-this.maxResultsHistory);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const initialDelay = this.config.retryConfig?.initialDelay || 1000;
    const maxDelay = this.config.retryConfig?.maxDelay || 30000;

    const delay = initialDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Clean up expired deduplication entries
   */
  private cleanupExpiredDeduplicationEntries(): void {
    const now = Date.now();
    for (const [eventId, entry] of this.deduplicationStore) {
      if (now - entry.processedAt.getTime() > entry.ttl * 1000) {
        this.deduplicationStore.delete(eventId);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(): {
    totalDelivered: number;
    totalFailed: number;
    averageDeliveryTime: number;
    successRate: number;
    deadLetterQueueSize: number;
    recentResults: MessageDeliveryResult[];
  } {
    const totalDelivered = this.deliveryResults.filter(r => r.success).length;
    const totalFailed = this.deliveryResults.filter(r => !r.success).length;
    const successRate = this.deliveryResults.length > 0 ? totalDelivered / this.deliveryResults.length : 0;

    const avgDeliveryTime = this.deliveryResults.length > 0
      ? this.deliveryResults.reduce((sum, r) => sum + r.deliveryTime, 0) / this.deliveryResults.length
      : 0;

    return {
      totalDelivered,
      totalFailed,
      averageDeliveryTime: Math.round(avgDeliveryTime),
      successRate: Math.round(successRate * 100) / 100,
      deadLetterQueueSize: this.deadLetterQueue.length,
      recentResults: this.deliveryResults.slice(-10)
    };
  }

  /**
   * Get dead letter queue messages
   */
  getDeadLetterMessages(limit = 50): DeadLetterMessage[] {
    return this.deadLetterQueue.slice(-limit);
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }
}

/**
 * Kafka Messaging Adapter
 */
export class KafkaMessagingAdapter extends BaseExternalMessagingAdapter {
  private producer?: any;
  private consumer?: any;

  constructor(config: ExternalMessagingConfig) {
    super({ ...config, provider: MessagingProvider.KAFKA });
  }

  async connect(): Promise<void> {
    try {
      // In a real implementation, you would initialize Kafka producer and consumer
      // For now, we'll simulate the connection
      console.log('Connecting to Kafka...');

      await new Promise(resolve => setTimeout(resolve, 200));
      this.connected = true;

      console.log('Kafka connection established');
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;

    if (this.producer) {
      // await this.producer.disconnect();
    }

    if (this.consumer) {
      // await this.consumer.disconnect();
    }

    console.log('Kafka connection closed');
  }

  async publish(event: DomainEvent): Promise<MessageDeliveryResult> {
    if (!this.connected || !this.producer) {
      throw new Error('Kafka producer not available');
    }

    const topic = this.getDestination(event.eventType);
    const message = {
      key: event.eventId,
      value: EventSerializer.serialize(event),
      headers: {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        correlationId: event.metadata?.correlationId
      }
    };

    try {
      const startTime = Date.now();
      // const result = await this.producer.send({ topic, messages: [message] });

      // Simulate successful delivery
      const deliveryResult: MessageDeliveryResult = {
        messageId: `kafka_${event.eventId}_${Date.now()}`,
        eventId: event.eventId,
        success: true,
        deliveryTime: Date.now() - startTime,
        partition: 0, // result.partition,
        offset: '0', // result.offset,
        retryCount: 0,
        timestamp: new Date()
      };

      return deliveryResult;
    } catch (error) {
      throw new Error(`Kafka publish failed: ${(error as Error).message}`);
    }
  }

  async subscribe(
    subscription: EventSubscriptionConfig,
    subscriber: BaseEventSubscriber
  ): Promise<string> {
    if (!this.connected || !this.consumer) {
      throw new Error('Kafka consumer not available');
    }

    const topic = this.getDestination(subscription.eventType);

    // Subscribe to topic
    // await this.consumer.subscribe({ topic });

    // Set up message handler
    // this.consumer.run({
    //   eachMessage: async ({ message }) => {
    //     try {
    //       const event = EventSerializer.deserialize(message.value.toString());
    //       // Process through subscriber
    //     } catch (error) {
    //       console.error('Error processing Kafka message:', error);
    //     }
    //   }
    // });

    return `kafka_sub_${subscription.eventType}_${Date.now()}`;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    // Unsubscribe logic would go here
    console.log(`Unsubscribed from Kafka: ${subscriptionId}`);
  }

  async getHealthStatus(): Promise<{
    connected: boolean;
    messageCount?: number;
    consumerLag?: number;
    errorRate?: number;
  }> {
    const stats = this.getDeliveryStats();
    const errorRate = stats.totalDelivered + stats.totalFailed > 0
      ? stats.totalFailed / (stats.totalDelivered + stats.totalFailed)
      : 0;

    return {
      connected: this.connected,
      messageCount: stats.totalDelivered,
      consumerLag: 0, // Would get from Kafka consumer metrics
      errorRate
    };
  }
}

/**
 * RabbitMQ Messaging Adapter
 */
export class RabbitMQMessagingAdapter extends BaseExternalMessagingAdapter {
  private connection?: any;
  private channel?: any;

  constructor(config: ExternalMessagingConfig) {
    super({ ...config, provider: MessagingProvider.RABBITMQ });
  }

  async connect(): Promise<void> {
    try {
      console.log('Connecting to RabbitMQ...');

      // In a real implementation, you would connect to RabbitMQ
      await new Promise(resolve => setTimeout(resolve, 200));
      this.connected = true;

      console.log('RabbitMQ connection established');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;

    if (this.channel) {
      // await this.channel.close();
    }

    if (this.connection) {
      // await this.connection.close();
    }

    console.log('RabbitMQ connection closed');
  }

  async publish(event: DomainEvent): Promise<MessageDeliveryResult> {
    if (!this.connected || !this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    const exchange = this.config.exchange || 'events';
    const routingKey = this.getRoutingKey(event.eventType);
    const message = EventSerializer.serialize(event);

    try {
      const startTime = Date.now();
      // await this.channel.publish(exchange, routingKey, Buffer.from(message), {
      //   messageId: event.eventId,
      //   timestamp: event.timestamp.getTime(),
      //   headers: {
      //     eventType: event.eventType,
      //     aggregateId: event.aggregateId
      //   }
      // });

      const deliveryResult: MessageDeliveryResult = {
        messageId: `rabbitmq_${event.eventId}_${Date.now()}`,
        eventId: event.eventId,
        success: true,
        deliveryTime: Date.now() - startTime,
        retryCount: 0,
        timestamp: new Date()
      };

      return deliveryResult;
    } catch (error) {
      throw new Error(`RabbitMQ publish failed: ${(error as Error).message}`);
    }
  }

  async subscribe(
    subscription: EventSubscriptionConfig,
    subscriber: BaseEventSubscriber
  ): Promise<string> {
    if (!this.connected || !this.channel) {
      throw new Error('RabbitMQ channel not available');
    }

    const queue = this.getDestination(subscription.eventType);
    const exchange = this.config.exchange || 'events';
    const routingKey = this.getRoutingKey(subscription.eventType);

    // Assert queue and bind to exchange
    // await this.channel.assertQueue(queue);
    // await this.channel.bindQueue(queue, exchange, routingKey);

    // Set up consumer
    // await this.channel.consume(queue, async (msg) => {
    //   if (msg) {
    //     try {
    //       const event = EventSerializer.deserialize(msg.content.toString());
    //       // Process through subscriber
    //       // this.channel.ack(msg);
    //     } catch (error) {
    //       console.error('Error processing RabbitMQ message:', error);
    //       // this.channel.nack(msg, false, false);
    //     }
    //   }
    // });

    return `rabbitmq_sub_${subscription.eventType}_${Date.now()}`;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    // Unsubscribe logic would go here
    console.log(`Unsubscribed from RabbitMQ: ${subscriptionId}`);
  }

  async getHealthStatus(): Promise<{
    connected: boolean;
    messageCount?: number;
    consumerLag?: number;
    errorRate?: number;
  }> {
    const stats = this.getDeliveryStats();
    const errorRate = stats.totalDelivered + stats.totalFailed > 0
      ? stats.totalFailed / (stats.totalDelivered + stats.totalFailed)
      : 0;

    return {
      connected: this.connected,
      messageCount: stats.totalDelivered,
      consumerLag: 0, // Would get from RabbitMQ management API
      errorRate
    };
  }
}

/**
 * AWS SQS Messaging Adapter
 */
export class SQSMessagingAdapter extends BaseExternalMessagingAdapter {
  private sqsClient?: any;

  constructor(config: ExternalMessagingConfig) {
    super({ ...config, provider: MessagingProvider.AWS_SQS });
  }

  async connect(): Promise<void> {
    try {
      console.log('Connecting to AWS SQS...');

      // In a real implementation, you would initialize SQS client
      await new Promise(resolve => setTimeout(resolve, 200));
      this.connected = true;

      console.log('SQS connection established');
    } catch (error) {
      console.error('Failed to connect to SQS:', error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('SQS connection closed');
  }

  async publish(event: DomainEvent): Promise<MessageDeliveryResult> {
    if (!this.connected || !this.sqsClient) {
      throw new Error('SQS client not available');
    }

    const queueUrl = this.getDestination(event.eventType);
    const message = EventSerializer.serialize(event);

    try {
      const startTime = Date.now();
      // const result = await this.sqsClient.sendMessage({
      //   QueueUrl: queueUrl,
      //   MessageBody: message,
      //   MessageAttributes: {
      //     EventType: { DataType: 'String', StringValue: event.eventType },
      //     AggregateId: { DataType: 'String', StringValue: event.aggregateId }
      //   }
      // });

      const deliveryResult: MessageDeliveryResult = {
        messageId: `sqs_${event.eventId}_${Date.now()}`,
        eventId: event.eventId,
        success: true,
        deliveryTime: Date.now() - startTime,
        retryCount: 0,
        timestamp: new Date()
      };

      return deliveryResult;
    } catch (error) {
      throw new Error(`SQS publish failed: ${(error as Error).message}`);
    }
  }

  async subscribe(
    subscription: EventSubscriptionConfig,
    subscriber: BaseEventSubscriber
  ): Promise<string> {
    if (!this.connected || !this.sqsClient) {
      throw new Error('SQS client not available');
    }

    const queueUrl = this.getDestination(subscription.eventType);

    // Set up long polling consumer
    // const pollMessages = async () => {
    //   try {
    //     const response = await this.sqsClient.receiveMessage({
    //       QueueUrl: queueUrl,
    //       MaxNumberOfMessages: 10,
    //       WaitTimeSeconds: 20
    //     });

    //     if (response.Messages) {
    //       for (const msg of response.Messages) {
    //         try {
    //           const event = EventSerializer.deserialize(msg.Body);
    //           // Process through subscriber
    //           // await this.sqsClient.deleteMessage({ QueueUrl: queueUrl, ReceiptHandle: msg.ReceiptHandle });
    //         } catch (error) {
    //           console.error('Error processing SQS message:', error);
    //         }
    //       }
    //     }
    //   } catch (error) {
    //     console.error('Error polling SQS:', error);
    //   }

    //   // Continue polling
    //   setTimeout(pollMessages, 1000);
    // };

    // pollMessages();

    return `sqs_sub_${subscription.eventType}_${Date.now()}`;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    // Stop polling for this subscription
    console.log(`Unsubscribed from SQS: ${subscriptionId}`);
  }

  async getHealthStatus(): Promise<{
    connected: boolean;
    messageCount?: number;
    consumerLag?: number;
    errorRate?: number;
  }> {
    const stats = this.getDeliveryStats();
    const errorRate = stats.totalDelivered + stats.totalFailed > 0
      ? stats.totalFailed / (stats.totalDelivered + stats.totalFailed)
      : 0;

    return {
      connected: this.connected,
      messageCount: stats.totalDelivered,
      consumerLag: 0, // SQS doesn't have consumer lag concept
      errorRate
    };
  }
}

/**
 * External Messaging Adapter Factory
 */
export class ExternalMessagingAdapterFactory {
  private static instance: BaseExternalMessagingAdapter | null = null;

  static createKafka(config: ExternalMessagingConfig): KafkaMessagingAdapter {
    return new KafkaMessagingAdapter(config);
  }

  static createRabbitMQ(config: ExternalMessagingConfig): RabbitMQMessagingAdapter {
    return new RabbitMQMessagingAdapter(config);
  }

  static createSQS(config: ExternalMessagingConfig): SQSMessagingAdapter {
    return new SQSMessagingAdapter(config);
  }

  static createDefault(config: ExternalMessagingConfig): BaseExternalMessagingAdapter {
    const provider = config.provider || MessagingProvider.KAFKA;

    switch (provider) {
      case MessagingProvider.KAFKA:
        return this.createKafka(config);
      case MessagingProvider.RABBITMQ:
        return this.createRabbitMQ(config);
      case MessagingProvider.AWS_SQS:
        return this.createSQS(config);
      default:
        return this.createKafka(config);
    }
  }

  static getInstance(): BaseExternalMessagingAdapter | null {
    return this.instance;
  }

  static setInstance(adapter: BaseExternalMessagingAdapter): void {
    if (this.instance) {
      throw new Error('External messaging adapter instance already exists');
    }
    this.instance = adapter;
  }
}

/**
 * Message Broker Health Monitor
 */
export class MessageBrokerHealthMonitor {
  constructor(private adapters: BaseExternalMessagingAdapter[]) {}

  async getOverallHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    adapters: Array<{
      provider: MessagingProvider;
      status: 'healthy' | 'degraded' | 'unhealthy';
      details: any;
    }>;
    timestamp: Date;
  }> {
    const adapterHealth = await Promise.all(
      this.adapters.map(async (adapter) => {
        try {
          const health = await adapter.getHealthStatus();
          const status = health.connected ? 'healthy' : 'unhealthy';

          return {
            provider: (adapter as any).config.provider,
            status: status as any,
            details: health
          };
        } catch (error) {
          return {
            provider: (adapter as any).config.provider,
            status: 'unhealthy' as any,
            details: { error: (error as Error).message }
          };
        }
      })
    );

    const healthyCount = adapterHealth.filter(a => a.status === 'healthy').length;
    const overallStatus = healthyCount === this.adapters.length ? 'healthy'
                         : healthyCount > 0 ? 'degraded' : 'unhealthy';

    return {
      status: overallStatus as any,
      adapters: adapterHealth,
      timestamp: new Date()
    };
  }

  async getAggregatedMetrics(): Promise<{
    totalMessagesPublished: number;
    totalMessagesFailed: number;
    averageDeliveryTime: number;
    deadLetterQueueSize: number;
    adapters: Array<{
      provider: MessagingProvider;
      stats: any;
    }>;
  }> {
    const adapterMetrics = this.adapters.map(adapter => ({
      provider: (adapter as any).config.provider,
      stats: adapter.getDeliveryStats()
    }));

    const totalPublished = adapterMetrics.reduce((sum, a) => sum + a.stats.totalDelivered, 0);
    const totalFailed = adapterMetrics.reduce((sum, a) => sum + a.stats.totalFailed, 0);
    const totalDeliveryTime = adapterMetrics.reduce((sum, a) => sum + (a.stats.averageDeliveryTime * (a.stats.totalDelivered + a.stats.totalFailed)), 0);
    const totalMessages = totalPublished + totalFailed;
    const averageDeliveryTime = totalMessages > 0 ? totalDeliveryTime / totalMessages : 0;

    const totalDLQSize = adapterMetrics.reduce((sum, a) => sum + a.stats.deadLetterQueueSize, 0);

    return {
      totalMessagesPublished: totalPublished,
      totalMessagesFailed: totalFailed,
      averageDeliveryTime: Math.round(averageDeliveryTime),
      deadLetterQueueSize: totalDLQSize,
      adapters: adapterMetrics
    };
  }
}
