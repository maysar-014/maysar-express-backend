import {
  CircuitBreaker,
  ExternalServicesConfig,
  ExternalServicesConfigBuilder,
  ExternalServicesHealthChecker,
  ExternalServicesMetricsCollector,
  validateExternalServicesConfig
} from './external-services.config';

const originalEnv = process.env;

function makeValidConfig(): ExternalServicesConfig {
  return {
    cdn: {
      provider: 'cloudflare',
      enabled: true,
      baseUrl: 'https://cdn.example.com',
      publicRead: true,
      signedUrls: false,
      signedUrlExpiration: 3600
    },
    search: {
      provider: 'elasticsearch',
      enabled: true,
      elasticsearch: {
        node: 'https://search.example.com',
        apiKey: '',
        indexPrefix: 'catalog',
        ssl: true,
        requestTimeout: 30000
      }
    },
    cache: {
      provider: 'redis',
      enabled: true,
      redis: {
        host: 'localhost',
        port: 6379,
        db: 0,
        keyPrefix: 'catalog:',
        ttl: 3600
      }
    },
    image: {
      provider: 'sharp',
      enabled: true,
      maxSize: 10485760,
      allowedFormats: ['jpg', 'png'],
      quality: 80,
      maxWidth: 2048,
      maxHeight: 2048,
      thumbnailSizes: ['100x100'],
      watermarkEnabled: false
    },
    upload: {
      provider: 'local',
      enabled: true,
      maxFiles: 10,
      maxFileSize: 10485760,
      destination: './uploads',
      allowedTypes: ['image/jpeg']
    },
    monitoring: {
      enableMetrics: true,
      metricsInterval: 30000,
      enableHealthChecks: true,
      healthCheckTimeout: 5000,
      alertOnFailures: true,
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000
    }
  };
}

describe('external-services.config', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CDN_PROVIDER;
    delete process.env.CDN_ENABLED;
    delete process.env.SEARCH_PROVIDER;
    delete process.env.SEARCH_ENABLED;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_DB;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('builds defaults from environment', () => {
    const config = ExternalServicesConfigBuilder.build();

    expect(config.cdn.provider).toBe('cloudflare');
    expect(config.search.provider).toBe('elasticsearch');
    expect(config.cache.redis?.port).toBe(6379);
    expect(config.monitoring.circuitBreakerThreshold).toBe(5);
  });

  it('validates required service settings', () => {
    const config = makeValidConfig();
    config.cdn.baseUrl = undefined;
    config.search.elasticsearch = undefined;

    const result = validateExternalServicesConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('CDN base URL is required when CDN is enabled');
    expect(result.errors).toContain('Elasticsearch node URL is required when using Elasticsearch');
  });

  it('opens and recovers circuit breaker based on threshold/timeout', async () => {
    const breaker = new CircuitBreaker(1, 500);
    await expect(
      breaker.execute(async () => {
        throw new Error('failure');
      })
    ).rejects.toThrow('failure');
    expect(breaker.getState()).toBe('open');

    await expect(breaker.execute(async () => 'blocked')).rejects.toThrow('Circuit breaker is open');

    const baseline = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(baseline + 1000);
    await expect(breaker.execute(async () => 'ok')).resolves.toBe('ok');
    expect(breaker.getState()).toBe('closed');
    nowSpy.mockRestore();
  });

  it('reports health and metrics for enabled services', async () => {
    const config = makeValidConfig();
    const checker = new ExternalServicesHealthChecker(config);
    const collector = new ExternalServicesMetricsCollector(config);

    const health = await checker.checkHealth();
    const metrics = await collector.collectMetrics();

    expect(health.healthy).toBe(true);
    expect(health.checks.cdn.status).toBe('pass');
    expect(health.checks.search.status).toBe('pass');
    expect(health.checks.cache.status).toBe('pass');

    expect(metrics.cdn_requests_total).toBe(10000);
    expect(metrics.search_queries_total).toBe(5000);
    expect(metrics.cache_hit_rate).toBe(85);
  });
});
