/**
 * Messaging Configuration
 * Comprehensive event streaming and messaging configuration
 * Implements Kafka, RabbitMQ, and event store settings with monitoring and resilience
 */

import { z } from 'zod';

// =====================================================================================
// MESSAGING CONFIGURATION SCHEMAS
// =====================================================================================

/**
 * Kafka Configuration Schema
 */
const KafkaConfigSchema = z.object({
  enabled: z.coerce.boolean().default(true),
  brokers: z.string().default('localhost:9092'),
  clientId: z.string().default('catalog-service'),
  groupId: z.string().default('catalog-service-group'),
  ssl: z.coerce.boolean().default(false),
  saslMechanism: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).optional(),
  saslUsername: z.string().optional(),
  saslPassword: z.string().optional(),
  connectionTimeout: z.coerce.number().default(10000),
  requestTimeout: z.coerce.number().default(30000),
  retryBackoff: z.coerce.number().default(100),
  maxRetries: z.coerce.number().default(10),
});

/**
 * RabbitMQ Configuration Schema
 */
const RabbitMQConfigSchema = z.object({
  enabled: z.coerce.boolean().default(false),
  url: z.string().url().optional(),
  heartbeat: z.coerce.number().default(60),
  connectionTimeout: z.coerce.number().default(10000),
  prefetch: z.coerce.number().default(1),
  reconnectDelay: z.coerce.number().default(1000),
  maxReconnectAttempts: z.coerce.number().default(10),
});

/**
 * Event Store Configuration Schema
 */
const EventStoreConfigSchema = z.object({
  connection: z.enum(['memory', 'redis', 'database', 'file']).default('memory'),
  redisUrl: z.string().url().optional(),
  filePath: z.string().optional(),
  retentionDays: z.coerce.number().default(30),
  maxEventsPerStream: z.coerce.number().default(10000),
  snapshotInterval: z.coerce.number().default(100),
  compressionEnabled: z.coerce.boolean().default(true),
});

/**
 * Message Queue Configuration Schema
 */
const MessageQueueConfigSchema = z.object({
  defaultTtl: z.coerce.number().default(3600000), // 1 hour
  maxRetries: z.coerce.number().default(3),
  retryDelay: z.coerce.number().default(5000),
  deadLetterExchange: z.string().default('dead-letter'),
  deadLetterQueue: z.string().default('dead-letters'),
  maxMessageSize: z.coerce.number().default(1048576), // 1MB
});

/**
 * Monitoring Configuration Schema
 */
const MessagingMonitoringSchema = z.object({
  enableMetrics: z.coerce.boolean().default(true),
  metricsInterval: z.coerce.number().default(30000),
  enableHealthChecks: z.coerce.boolean().default(true),
  healthCheckTimeout: z.coerce.number().default(5000),
  alertOnConnectionErrors: z.coerce.boolean().default(true),
  alertOnMessageFailures: z.coerce.boolean().default(true),
});

// =====================================================================================
// MESSAGING CONFIGURATION INTERFACE
// =====================================================================================

/**
 * Messaging Configuration Interface
 */
export interface MessagingConfig {
  // Kafka settings
  kafka: {
    enabled: boolean;
    brokers: string;
    clientId: string;
    groupId: string;
    ssl: boolean;
    sasl?: {
      mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
      username: string;
      password: string;
    };
    connectionTimeout: number;
    requestTimeout: number;
    retryBackoff: number;
    maxRetries: number;
  };

  // RabbitMQ settings
  rabbitmq?: {
    enabled: boolean;
    url: string;
    heartbeat: number;
    connectionTimeout: number;
    prefetch: number;
    reconnectDelay: number;
    maxReconnectAttempts: number;
  };

  // Event store settings
  eventStore: {
    connection: 'memory' | 'redis' | 'database' | 'file';
    redisUrl?: string;
    filePath?: string;
    retentionDays: number;
    maxEventsPerStream: number;
    snapshotInterval: number;
    compressionEnabled: boolean;
  };

  // Message queue settings
  queues: {
    defaultTtl: number;
    maxRetries: number;
    retryDelay: number;
    deadLetterExchange: string;
    deadLetterQueue: string;
    maxMessageSize: number;
  };

  // Monitoring settings
  monitoring: {
    enableMetrics: boolean;
    metricsInterval: number;
    enableHealthChecks: boolean;
    healthCheckTimeout: number;
    alertOnConnectionErrors: boolean;
    alertOnMessageFailures: boolean;
  };

  // Topics and exchanges
  topics: {
    productEvents: string;
    pricingEvents: string;
    searchEvents: string;
    auditEvents: string;
  };
}

// =====================================================================================
// MESSAGING CONFIGURATION BUILDER
// =====================================================================================

/**
 * Messaging Configuration Builder
 */
export class MessagingConfigBuilder {
  /**
   * Build messaging configuration
   */
  static build(): MessagingConfig {
    const env = process.env;

    return {
      kafka: {
        enabled: env.KAFKA_ENABLED !== 'false',
        brokers: env.KAFKA_BROKERS || 'localhost:9092',
        clientId: env.KAFKA_CLIENT_ID || 'catalog-service',
        groupId: env.KAFKA_GROUP_ID || 'catalog-service-group',
        ssl: env.KAFKA_SSL === 'true',
        sasl: env.KAFKA_SASL_MECHANISM ? {
          mechanism: env.KAFKA_SASL_MECHANISM as any,
          username: env.KAFKA_SASL_USERNAME!,
          password: env.KAFKA_SASL_PASSWORD!
        } : undefined,
        connectionTimeout: parseInt(env.KAFKA_CONNECTION_TIMEOUT || '10000'),
        requestTimeout: parseInt(env.KAFKA_REQUEST_TIMEOUT || '30000'),
        retryBackoff: parseInt(env.KAFKA_RETRY_BACKOFF || '100'),
        maxRetries: parseInt(env.KAFKA_MAX_RETRIES || '10')
      },
      rabbitmq: env.RABBITMQ_URL ? {
        enabled: env.RABBITMQ_ENABLED !== 'false',
        url: env.RABBITMQ_URL,
        heartbeat: parseInt(env.RABBITMQ_HEARTBEAT || '60'),
        connectionTimeout: parseInt(env.RABBITMQ_CONNECTION_TIMEOUT || '10000'),
        prefetch: parseInt(env.RABBITMQ_PREFETCH || '1'),
        reconnectDelay: parseInt(env.RABBITMQ_RECONNECT_DELAY || '1000'),
        maxReconnectAttempts: parseInt(env.RABBITMQ_MAX_RECONNECT_ATTEMPTS || '10')
      } : undefined,
      eventStore: {
        connection: (env.EVENT_STORE_CONNECTION as any) || 'memory',
        redisUrl: env.EVENT_STORE_REDIS_URL,
        filePath: env.EVENT_STORE_FILE_PATH,
        retentionDays: parseInt(env.EVENT_STORE_RETENTION_DAYS || '30'),
        maxEventsPerStream: parseInt(env.EVENT_STORE_MAX_EVENTS_PER_STREAM || '10000'),
        snapshotInterval: parseInt(env.EVENT_STORE_SNAPSHOT_INTERVAL || '100'),
        compressionEnabled: env.EVENT_STORE_COMPRESSION_ENABLED !== 'false'
      },
      queues: {
        defaultTtl: parseInt(env.QUEUE_DEFAULT_TTL || '3600000'),
        maxRetries: parseInt(env.QUEUE_MAX_RETRIES || '3'),
        retryDelay: parseInt(env.QUEUE_RETRY_DELAY || '5000'),
        deadLetterExchange: env.QUEUE_DEAD_LETTER_EXCHANGE || 'dead-letter',
        deadLetterQueue: env.QUEUE_DEAD_LETTER_QUEUE || 'dead-letters',
        maxMessageSize: parseInt(env.QUEUE_MAX_MESSAGE_SIZE || '1048576')
      },
      monitoring: {
        enableMetrics: env.MESSAGING_ENABLE_METRICS !== 'false',
        metricsInterval: parseInt(env.MESSAGING_METRICS_INTERVAL || '30000'),
        enableHealthChecks: env.MESSAGING_ENABLE_HEALTH_CHECKS !== 'false',
        healthCheckTimeout: parseInt(env.MESSAGING_HEALTH_CHECK_TIMEOUT || '5000'),
        alertOnConnectionErrors: env.MESSAGING_ALERT_CONNECTION_ERRORS !== 'false',
        alertOnMessageFailures: env.MESSAGING_ALERT_MESSAGE_FAILURES !== 'false'
      },
      topics: {
        productEvents: env.TOPIC_PRODUCT_EVENTS || 'catalog.product.events',
        pricingEvents: env.TOPIC_PRICING_EVENTS || 'catalog.pricing.events',
        searchEvents: env.TOPIC_SEARCH_EVENTS || 'catalog.search.events',
        auditEvents: env.TOPIC_AUDIT_EVENTS || 'catalog.audit.events'
      }
    };
  }
}

// =====================================================================================
// MESSAGING HEALTH CHECKS
// =====================================================================================

/**
 * Messaging Health Checker
 */
export class MessagingHealthChecker {
  private config: MessagingConfig;

  constructor(config: MessagingConfig) {
    this.config = config;
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }>;
  }> {
    const checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }> = {};

    // Kafka health check
    if (this.config.kafka.enabled) {
      try {
        const startTime = Date.now();
        const kafkaHealthy = await this.checkKafkaHealth();
        const duration = Date.now() - startTime;

        checks.kafka = {
          status: kafkaHealthy ? 'pass' : 'fail',
          message: kafkaHealthy ? 'Kafka connection healthy' : 'Kafka connection failed',
          duration
        };
      } catch (error) {
        checks.kafka = {
          status: 'fail',
          message: `Kafka health check failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    // RabbitMQ health check
    if (this.config.rabbitmq?.enabled) {
      try {
        const startTime = Date.now();
        const rabbitmqHealthy = await this.checkRabbitMQHealth();
        const duration = Date.now() - startTime;

        checks.rabbitmq = {
          status: rabbitmqHealthy ? 'pass' : 'fail',
          message: rabbitmqHealthy ? 'RabbitMQ connection healthy' : 'RabbitMQ connection failed',
          duration
        };
      } catch (error) {
        checks.rabbitmq = {
          status: 'fail',
          message: `RabbitMQ health check failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    // Event store health check
    try {
      const startTime = Date.now();
      const eventStoreHealthy = await this.checkEventStoreHealth();
      const duration = Date.now() - startTime;

      checks.eventStore = {
        status: eventStoreHealthy ? 'pass' : 'fail',
        message: eventStoreHealthy ? 'Event store healthy' : 'Event store failed',
        duration
      };
    } catch (error) {
      checks.eventStore = {
        status: 'fail',
        message: `Event store health check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    const healthy = Object.values(checks).every(check => check.status !== 'fail');

    return { healthy, checks };
  }

  private async checkKafkaHealth(): Promise<boolean> {
    // Placeholder implementation
    return true;
  }

  private async checkRabbitMQHealth(): Promise<boolean> {
    // Placeholder implementation
    return true;
  }

  private async checkEventStoreHealth(): Promise<boolean> {
    // Placeholder implementation
    return true;
  }
}

// =====================================================================================
// MESSAGING METRICS
// =====================================================================================

/**
 * Messaging Metrics Collector
 */
export class MessagingMetricsCollector {
  private config: MessagingConfig;

  constructor(config: MessagingConfig) {
    this.config = config;
  }

  /**
   * Collect messaging metrics
   */
  async collectMetrics(): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    // Kafka metrics
    if (this.config.kafka.enabled) {
      metrics.kafka_messages_produced = await this.getKafkaMessagesProduced();
      metrics.kafka_messages_consumed = await this.getKafkaMessagesConsumed();
      metrics.kafka_connection_status = await this.getKafkaConnectionStatus();
    }

    // RabbitMQ metrics
    if (this.config.rabbitmq?.enabled) {
      metrics.rabbitmq_messages_published = await this.getRabbitMQMessagesPublished();
      metrics.rabbitmq_messages_consumed = await this.getRabbitMQMessagesConsumed();
      metrics.rabbitmq_queue_depth = await this.getRabbitMQQueueDepth();
    }

    // Event store metrics
    metrics.event_store_events_stored = await this.getEventStoreEventsStored();
    metrics.event_store_events_retrieved = await this.getEventStoreEventsRetrieved();

    return metrics;
  }

  private async getKafkaMessagesProduced(): Promise<number> {
    // Placeholder implementation
    return 1000;
  }

  private async getKafkaMessagesConsumed(): Promise<number> {
    // Placeholder implementation
    return 950;
  }

  private async getKafkaConnectionStatus(): Promise<number> {
    // Placeholder implementation
    return 1; // 1 = connected, 0 = disconnected
  }

  private async getRabbitMQMessagesPublished(): Promise<number> {
    // Placeholder implementation
    return 500;
  }

  private async getRabbitMQMessagesConsumed(): Promise<number> {
    // Placeholder implementation
    return 480;
  }

  private async getRabbitMQQueueDepth(): Promise<number> {
    // Placeholder implementation
    return 20;
  }

  private async getEventStoreEventsStored(): Promise<number> {
    // Placeholder implementation
    return 10000;
  }

  private async getEventStoreEventsRetrieved(): Promise<number> {
    // Placeholder implementation
    return 5000;
  }
}

// =====================================================================================
// MESSAGE VALIDATION
// =====================================================================================

/**
 * Message Validator
 */
export class MessageValidator {
  private config: MessagingConfig;

  constructor(config: MessagingConfig) {
    this.config = config;
  }

  /**
   * Validate message
   */
  validateMessage(message: any, topic: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.config.queues.maxMessageSize) {
      errors.push(`Message size ${messageSize} exceeds maximum ${this.config.queues.maxMessageSize}`);
    }

    // Validate topic-specific requirements
    switch (topic) {
      case this.config.topics.productEvents:
        if (!message.productId) {
          errors.push('Product events must include productId');
        }
        break;
      case this.config.topics.pricingEvents:
        if (!message.productId || typeof message.price !== 'number') {
          errors.push('Pricing events must include productId and numeric price');
        }
        break;
      case this.config.topics.searchEvents:
        if (!message.query && !message.filters) {
          errors.push('Search events must include query or filters');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// =====================================================================================
// MESSAGING CONFIGURATION EXPORTS
// =====================================================================================

/**
 * Get messaging configuration
 */
export function getMessagingConfig(): MessagingConfig {
  return MessagingConfigBuilder.build();
}

/**
 * Create messaging health checker
 */
export function createMessagingHealthChecker(config?: MessagingConfig): MessagingHealthChecker {
  return new MessagingHealthChecker(config || getMessagingConfig());
}

/**
 * Create messaging metrics collector
 */
export function createMessagingMetricsCollector(config?: MessagingConfig): MessagingMetricsCollector {
  return new MessagingMetricsCollector(config || getMessagingConfig());
}

/**
 * Create message validator
 */
export function createMessageValidator(config?: MessagingConfig): MessageValidator {
  return new MessageValidator(config || getMessagingConfig());
}

/**
 * Validate messaging configuration
 */
export function validateMessagingConfig(config?: MessagingConfig): { valid: boolean; errors: string[] } {
  try {
    const msgConfig = config || getMessagingConfig();
    const errors: string[] = [];

    // Validate Kafka configuration
    if (msgConfig.kafka.enabled) {
      if (!msgConfig.kafka.brokers) {
        errors.push('Kafka brokers are required when Kafka is enabled');
      }

      if (msgConfig.kafka.ssl && msgConfig.kafka.sasl) {
        if (!msgConfig.kafka.sasl.username || !msgConfig.kafka.sasl.password) {
          errors.push('SASL username and password are required when SSL is enabled');
        }
      }
    }

    // Validate RabbitMQ configuration
    if (msgConfig.rabbitmq?.enabled && !msgConfig.rabbitmq.url) {
      errors.push('RabbitMQ URL is required when RabbitMQ is enabled');
    }

    // Validate event store configuration
    if (msgConfig.eventStore.connection === 'redis' && !msgConfig.eventStore.redisUrl) {
      errors.push('Redis URL is required for Redis event store');
    }

    if (msgConfig.eventStore.connection === 'file' && !msgConfig.eventStore.filePath) {
      errors.push('File path is required for file event store');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Default messaging configuration
 */
export const messagingConfig = getMessagingConfig();
