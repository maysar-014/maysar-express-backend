/**
 * Infrastructure Messaging Index
 * Central export point for messaging infrastructure
 * Event publishing, event sourcing, and message handling
 */

// Event Publisher
export * from './event-publisher';

// Event Store
export * from './event-store';

// Event Subscriber
export * from './event-subscriber';

// Message Bus
export * from './message-bus';

// External Messaging Adapter
export * from './external-messaging.adapter';

/**
 * Messaging Infrastructure Overview
 *
 * This module provides the messaging infrastructure for the catalog service:
 * - Event publishing for domain events and sagas
 * - Event sourcing for audit trails and state reconstruction
 * - Message serialization and transport mechanisms
 * - Event routing and correlation
 *
 * Key Features:
 * - Multiple transport mechanisms (In-memory, Redis, Kafka, etc.)
 * - Event serialization and validation
 * - Batch processing and optimization
 * - Error handling and retry logic
 * - Monitoring and metrics collection
 *
 * Architecture Principles:
 * - Async-first design for scalability
 * - Transport abstraction for flexibility
 * - Event versioning and schema evolution
 * - Correlation ID tracking for observability
 * - Circuit breaker pattern for resilience
 */

/**
 * Messaging Configuration
 * Configuration options for messaging infrastructure
 */
export interface MessagingConfig {
  // Event Publisher settings
  publisher: {
    strategy: 'immediate' | 'batched' | 'async' | 'transactional';
    transport: 'in_memory' | 'http' | 'outbox';
    batchSize: number;
    batchTimeout: number;
    retryAttempts: number;
    retryDelay: number;
    enableMetrics: boolean;
    enableTracing: boolean;
  };


  // Event Store settings
  eventStore: {
    type: 'prisma' | 'in_memory';
    enableSnapshots: boolean;
    snapshotFrequency: number;
    maxEventsPerAggregate: number;
    retentionDays: number;
    enableCompression: boolean;
    enableEncryption: boolean;
    batchSize: number;
  };

  // General messaging settings
  enableMessageValidation: boolean;
  maxMessageSize: number; // bytes
  defaultTimeout: number; // milliseconds
  enableDeadLetterQueue: boolean;
  monitoringEnabled: boolean;
}

/**
 * Default Messaging Configuration
 */
export const DEFAULT_MESSAGING_CONFIG: MessagingConfig = {
  publisher: {
    strategy: 'async',
    transport: 'in_memory',
    batchSize: 50,
    batchTimeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000,
    enableMetrics: true,
    enableTracing: true
  },
  eventStore: {
    type: 'prisma',
    enableSnapshots: false,
    snapshotFrequency: 100,
    maxEventsPerAggregate: 10000,
    retentionDays: 365,
    enableCompression: false,
    enableEncryption: false,
    batchSize: 100
  },
  enableMessageValidation: true,
  maxMessageSize: 1024 * 1024, // 1MB
  defaultTimeout: 30000, // 30 seconds
  enableDeadLetterQueue: true,
  monitoringEnabled: true
};

/**
 * Messaging Health Check
 * Health status of messaging infrastructure
 */
export interface MessagingHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    eventPublisher: {
      status: 'up' | 'down';
      transport: string;
      queuedEvents: number;
      publishedToday: number;
    };
    eventStore: {
      status: 'up' | 'down';
      totalEvents: number;
      totalAggregates: number;
      storageSize: number;
    };
  };
  lastChecked: Date;
  details?: Record<string, any>;
}

/**
 * Messaging Metrics
 * Performance and usage metrics for messaging
 */
export interface MessagingMetrics {
  events: {
    published: number;
    failed: number;
    batched: number;
    averagePublishTime: number;
    byType: Record<string, number>;
  };
  eventStore: {
    saved: number;
    loaded: number;
    queries: number;
    averageQueryTime: number;
  };
  errors: {
    publisherErrors: number;
    storeErrors: number;
    serializationErrors: number;
  };
  timestamp: Date;
}

/**
 * Messaging Manager
 * Manages messaging infrastructure lifecycle and configuration
 */
export class MessagingManager {
  private static instance: MessagingManager | null = null;
  private config: MessagingConfig = DEFAULT_MESSAGING_CONFIG;

  private constructor() { }

  static getInstance(): MessagingManager {
    if (!MessagingManager.instance) {
      MessagingManager.instance = new MessagingManager();
    }
    return MessagingManager.instance;
  }

  configure(config: Partial<MessagingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MessagingConfig {
    return { ...this.config };
  }

  async initialize(): Promise<void> {
    // Initialize messaging infrastructure
    console.log('Initializing messaging infrastructure...');

    // Would initialize connections, create queues/tables, etc.
    // For now, just log
    console.log('Messaging infrastructure initialized');
  }

  async getHealthCheck(): Promise<MessagingHealthCheck> {
    // Implementation would check actual health of components
    return {
      status: 'healthy',
      components: {
        eventPublisher: {
          status: 'up',
          transport: this.config.publisher.transport,
          queuedEvents: 0,
          publishedToday: 0
        },
        eventStore: {
          status: 'up',
          totalEvents: 0,
          totalAggregates: 0,
          storageSize: 0
        }
      },
      lastChecked: new Date()
    };
  }

  getMetrics(): MessagingMetrics {
    // Implementation would collect actual metrics
    return {
      events: {
        published: 0,
        failed: 0,
        batched: 0,
        averagePublishTime: 0,
        byType: {}
      },
      eventStore: {
        saved: 0,
        loaded: 0,
        queries: 0,
        averageQueryTime: 0
      },
      errors: {
        publisherErrors: 0,
        storeErrors: 0,
        serializationErrors: 0
      },
      timestamp: new Date()
    };
  }

  async shutdown(): Promise<void> {
    // Cleanup messaging resources
    console.log('Shutting down messaging infrastructure...');
    console.log('Messaging infrastructure shutdown complete');
  }
}

/**
 * Message Validation
 */
export class MessageValidator {
  static validateEvent(event: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!event.eventId || typeof event.eventId !== 'string') {
      errors.push('eventId must be a non-empty string');
    }

    if (!event.eventType || typeof event.eventType !== 'string') {
      errors.push('eventType must be a non-empty string');
    }

    if (!event.aggregateId || typeof event.aggregateId !== 'string') {
      errors.push('aggregateId must be a non-empty string');
    }

    if (typeof event.version !== 'number' || event.version < 1) {
      errors.push('version must be a positive number');
    }

    if (!(event.timestamp instanceof Date)) {
      errors.push('timestamp must be a valid Date object');
    }

    if (!event.payload || typeof event.payload !== 'object') {
      errors.push('payload must be a non-null object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateMessageSize(message: any, maxSize: number): boolean {
    const serialized = JSON.stringify(message);
    return serialized.length <= maxSize;
  }
}

/**
 * Message Correlation
 */
export class MessageCorrelation {
  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateCausationId(): string {
    return `cause_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createCorrelationContext(parentCorrelationId?: string): {
    correlationId: string;
    causationId: string;
    timestamp: Date;
  } {
    return {
      correlationId: parentCorrelationId || this.generateCorrelationId(),
      causationId: this.generateCausationId(),
      timestamp: new Date()
    };
  }
}

/**
 * Dead Letter Queue
 * Handles failed messages that couldn't be processed
 */
export class DeadLetterQueue {
  private messages: Array<{
    message: any;
    error: Error;
    timestamp: Date;
    retryCount: number;
    correlationId?: string;
  }> = [];

  add(message: any, error: Error, correlationId?: string, retryCount: number = 0): void {
    this.messages.push({
      message,
      error,
      timestamp: new Date(),
      retryCount,
      correlationId
    });
  }

  getMessages(): Array<{
    message: any;
    error: Error;
    timestamp: Date;
    retryCount: number;
    correlationId?: string;
  }> {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  getStats(): {
    totalMessages: number;
    oldestMessage: Date | null;
    newestMessage: Date | null;
  } {
    return {
      totalMessages: this.messages.length,
      oldestMessage: this.messages.length > 0 ? this.messages[0].timestamp : null,
      newestMessage: this.messages.length > 0 ? this.messages[this.messages.length - 1].timestamp : null
    };
  }
}

/**
 * Messaging Constants
 */
export const MESSAGING_CONSTANTS = {
  DEFAULT_BATCH_SIZE: 50,
  DEFAULT_BATCH_TIMEOUT: 5000, // 5 seconds
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY: 1000, // 1 second
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  EVENT_ID_PREFIX: 'evt_',
  CORRELATION_ID_PREFIX: 'corr_',
  CAUSATION_ID_PREFIX: 'cause_'
} as const;

/**
 * Messaging Error Types
 */
export class MessagingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly component: 'publisher' | 'store' | 'serializer',
    public readonly details?: any
  ) {
    super(message);
    this.name = 'MessagingError';
  }
}

export class PublishingError extends MessagingError {
  constructor(message: string, transport: string, details?: any) {
    super(message, 'PUBLISHING_ERROR', 'publisher', { transport, ...details });
    this.name = 'PublishingError';
  }
}

export class StorageError extends MessagingError {
  constructor(message: string, operation: string, details?: any) {
    super(message, 'STORAGE_ERROR', 'store', { operation, ...details });
    this.name = 'StorageError';
  }
}

export class SerializationError extends MessagingError {
  constructor(message: string, details?: any) {
    super(message, 'SERIALIZATION_ERROR', 'serializer', details);
    this.name = 'SerializationError';
  }
}
