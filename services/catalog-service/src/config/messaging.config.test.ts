import {
  MessageValidator,
  MessagingConfig,
  MessagingConfigBuilder,
  MessagingHealthChecker,
  MessagingMetricsCollector,
  validateMessagingConfig
} from './messaging.config';

const originalEnv = process.env;

function makeValidMessagingConfig(): MessagingConfig {
  return {
    kafka: {
      enabled: true,
      brokers: 'localhost:9092',
      clientId: 'catalog-service',
      groupId: 'catalog-group',
      ssl: false,
      connectionTimeout: 10000,
      requestTimeout: 30000,
      retryBackoff: 100,
      maxRetries: 10
    },
    eventStore: {
      connection: 'memory',
      retentionDays: 30,
      maxEventsPerStream: 10000,
      snapshotInterval: 100,
      compressionEnabled: true
    },
    queues: {
      defaultTtl: 3600000,
      maxRetries: 3,
      retryDelay: 5000,
      deadLetterExchange: 'dead-letter',
      deadLetterQueue: 'dead-letters',
      maxMessageSize: 50
    },
    monitoring: {
      enableMetrics: true,
      metricsInterval: 30000,
      enableHealthChecks: true,
      healthCheckTimeout: 5000,
      alertOnConnectionErrors: true,
      alertOnMessageFailures: true
    },
    topics: {
      productEvents: 'catalog.product.events',
      pricingEvents: 'catalog.pricing.events',
      searchEvents: 'catalog.search.events',
      auditEvents: 'catalog.audit.events'
    }
  };
}

describe('messaging.config', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.KAFKA_BROKERS;
    delete process.env.QUEUE_MAX_MESSAGE_SIZE;
    delete process.env.TOPIC_PRODUCT_EVENTS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('builds messaging defaults from environment', () => {
    const config = MessagingConfigBuilder.build();

    expect(config.kafka.brokers).toBe('localhost:9092');
    expect(config.queues.maxMessageSize).toBe(1048576);
    expect(config.topics.productEvents).toBe('catalog.product.events');
  });

  it('validates event-store and broker requirements', () => {
    const invalidConfig = makeValidMessagingConfig();
    invalidConfig.eventStore.connection = 'redis';
    invalidConfig.eventStore.redisUrl = undefined;

    const result = validateMessagingConfig(invalidConfig);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Redis URL is required for Redis event store');
  });

  it('checks message shape and size per topic', () => {
    const validator = new MessageValidator(makeValidMessagingConfig());

    const productEvent = validator.validateMessage({ productId: 'p-1' }, 'catalog.product.events');
    const pricingEvent = validator.validateMessage({ productId: 'p-2', price: 20 }, 'catalog.pricing.events');
    const invalidPricingEvent = validator.validateMessage({ productId: 'p-2', price: '20' }, 'catalog.pricing.events');
    const hugeMessage = validator.validateMessage({ payload: 'x'.repeat(200) }, 'catalog.audit.events');

    expect(productEvent.valid).toBe(true);
    expect(pricingEvent.valid).toBe(true);
    expect(invalidPricingEvent.valid).toBe(false);
    expect(invalidPricingEvent.errors[0]).toContain('numeric price');
    expect(hugeMessage.valid).toBe(false);
    expect(hugeMessage.errors[0]).toContain('exceeds maximum');
  });

  it('runs health checks and metrics collection', async () => {
    const config = makeValidMessagingConfig();
    config.rabbitmq = {
      enabled: true,
      url: 'amqp://localhost',
      heartbeat: 60,
      connectionTimeout: 10000,
      prefetch: 1,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10
    };

    const checker = new MessagingHealthChecker(config);
    const collector = new MessagingMetricsCollector(config);

    const health = await checker.checkHealth();
    const metrics = await collector.collectMetrics();

    expect(health.healthy).toBe(true);
    expect(health.checks.kafka.status).toBe('pass');
    expect(health.checks.rabbitmq.status).toBe('pass');
    expect(health.checks.eventStore.status).toBe('pass');

    expect(metrics.kafka_messages_produced).toBe(1000);
    expect(metrics.rabbitmq_queue_depth).toBe(20);
    expect(metrics.event_store_events_stored).toBe(10000);
  });
});
