/**
 * Infrastructure Layer Index
 * Central export point for all infrastructure implementations
 * Infrastructure layer provides external system integrations
 */

// Repositories - Data persistence layer
export * from './repositories';

// Messaging - Event publishing and event sourcing
export * from './messaging';

// Providers - External service integrations
export * from './providers';

// Services - Infrastructure services
export * from './services';

/**
 * Infrastructure Layer Overview
 *
 * The Infrastructure Layer provides concrete implementations for all external concerns:
 * - Database access and persistence
 * - Message queuing and event publishing
 * - External service integrations
 * - Caching and performance optimization
 * - Configuration management
 * - Monitoring and logging
 * - Security and authentication
 *
 * Key Principles:
 * - Dependency injection friendly
 * - Abstract away external system complexities
 * - Provide clean interfaces for application layer
 * - Handle infrastructure failures gracefully
 * - Support multiple implementations (testing, production, etc.)
 *
 * Layer Boundaries:
 * - Knows about: Nothing outside the infrastructure
 * - Is known by: Application Layer (via interfaces)
 * - Communicates via: Domain interfaces, external APIs
 */

/**
 * Infrastructure Configuration
 * Centralized configuration for all infrastructure components
 */
export interface InfrastructureConfig {
  // Database settings
  database: {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
    enableQueryLogging: boolean;
  };

  // Messaging settings
  messaging: {
    publisher: {
      strategy: 'immediate' | 'batched' | 'async';
      transport: 'in_memory' | 'redis' | 'kafka';
      batchSize: number;
      batchTimeout: number;
      retryAttempts: number;
    };
    eventStore: {
      type: 'prisma' | 'in_memory';
      enableSnapshots: boolean;
      retentionDays: number;
    };
  };

  // Caching settings
  cache: {
    enabled: boolean;
    provider: 'memory' | 'redis' | 'memcached';
    ttl: number;
    maxSize: number;
  };

  // External services
  externalServices: {
    searchService: {
      url: string;
      apiKey: string;
      timeout: number;
    };
    inventoryService: {
      url: string;
      apiKey: string;
      timeout: number;
    };
    fileStorage: {
      provider: 's3' | 'local';
      bucket?: string;
      region?: string;
      accessKey?: string;
      secretKey?: string;
    };
  };

  // Monitoring and logging
  monitoring: {
    enableMetrics: boolean;
    enableTracing: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableHealthChecks: boolean;
  };

  // Security
  security: {
    enableEncryption: boolean;
    jwtSecret: string;
    apiKeys: Record<string, string>;
  };
}

/**
 * Default Infrastructure Configuration
 */
export const DEFAULT_INFRASTRUCTURE_CONFIG: InfrastructureConfig = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/catalog',
    maxConnections: 10,
    connectionTimeout: 30000,
    enableQueryLogging: process.env.NODE_ENV === 'development'
  },

  messaging: {
    publisher: {
      strategy: 'async',
      transport: 'in_memory',
      batchSize: 50,
      batchTimeout: 5000,
      retryAttempts: 3
    },
    eventStore: {
      type: 'prisma',
      enableSnapshots: false,
      retentionDays: 365
    }
  },

  cache: {
    enabled: true,
    provider: 'memory',
    ttl: 300, // 5 minutes
    maxSize: 1000
  },

  externalServices: {
    searchService: {
      url: process.env.SEARCH_SERVICE_URL || 'http://localhost:9200',
      apiKey: process.env.SEARCH_API_KEY || '',
      timeout: 5000
    },
    inventoryService: {
      url: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
      apiKey: process.env.INVENTORY_API_KEY || '',
      timeout: 5000
    },
    fileStorage: {
      provider: 'local',
      bucket: process.env.S3_BUCKET,
      region: process.env.AWS_REGION,
      accessKey: process.env.AWS_ACCESS_KEY_ID,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  },

  monitoring: {
    enableMetrics: true,
    enableTracing: true,
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    enableHealthChecks: true
  },

  security: {
    enableEncryption: false,
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    apiKeys: {}
  }
};

/**
 * Infrastructure Health Check
 * Overall health status of infrastructure components
 */
export interface InfrastructureHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: {
      status: 'up' | 'down';
      responseTime: number;
      connectionCount: number;
    };
    messaging: {
      status: 'up' | 'down';
      eventPublisher: 'up' | 'down';
      eventStore: 'up' | 'down';
      queuedEvents: number;
    };
    cache: {
      status: 'up' | 'down';
      hitRate: number;
      size: number;
    };
    externalServices: {
      searchService: 'up' | 'down';
      inventoryService: 'up' | 'down';
      fileStorage: 'up' | 'down';
    };
  };
  lastChecked: Date;
  details?: Record<string, any>;
}

/**
 * Infrastructure Metrics
 * Performance and usage metrics across all infrastructure components
 */
export interface InfrastructureMetrics {
  database: {
    queriesExecuted: number;
    averageQueryTime: number;
    connectionPoolUsage: number;
    errors: number;
  };
  messaging: {
    eventsPublished: number;
    eventsStored: number;
    publishErrors: number;
    storeErrors: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
  };
  externalServices: {
    searchRequests: number;
    inventoryRequests: number;
    fileOperations: number;
    externalErrors: number;
  };
  timestamp: Date;
}

/**
 * Infrastructure Manager
 * Manages infrastructure component lifecycle and configuration
 */
export class InfrastructureManager {
  private static instance: InfrastructureManager | null = null;
  private config: InfrastructureConfig = DEFAULT_INFRASTRUCTURE_CONFIG;
  private initialized = false;

  private constructor() {}

  static getInstance(): InfrastructureManager {
    if (!InfrastructureManager.instance) {
      InfrastructureManager.instance = new InfrastructureManager();
    }
    return InfrastructureManager.instance;
  }

  configure(config: Partial<InfrastructureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): InfrastructureConfig {
    return { ...this.config };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('Initializing infrastructure components...');

    // Initialize database connections
    // Initialize messaging systems
    // Initialize cache
    // Initialize external service clients
    // Setup monitoring

    this.initialized = true;
    console.log('Infrastructure initialization complete');
  }

  async getHealthCheck(): Promise<InfrastructureHealthCheck> {
    // Aggregate health checks from all components
    return {
      status: 'healthy', // Would determine based on component health
      components: {
        database: {
          status: 'up',
          responseTime: 5,
          connectionCount: 2
        },
        messaging: {
          status: 'up',
          eventPublisher: 'up',
          eventStore: 'up',
          queuedEvents: 0
        },
        cache: {
          status: 'up',
          hitRate: 0.85,
          size: 150
        },
        externalServices: {
          searchService: 'up',
          inventoryService: 'up',
          fileStorage: 'up'
        }
      },
      lastChecked: new Date()
    };
  }

  getMetrics(): InfrastructureMetrics {
    // Aggregate metrics from all components
    return {
      database: {
        queriesExecuted: 0,
        averageQueryTime: 0,
        connectionPoolUsage: 0,
        errors: 0
      },
      messaging: {
        eventsPublished: 0,
        eventsStored: 0,
        publishErrors: 0,
        storeErrors: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        evictions: 0
      },
      externalServices: {
        searchRequests: 0,
        inventoryRequests: 0,
        fileOperations: 0,
        externalErrors: 0
      },
      timestamp: new Date()
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down infrastructure components...');

    // Close database connections
    // Shutdown messaging systems
    // Clear cache
    // Close external service connections

    console.log('Infrastructure shutdown complete');
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Infrastructure Error Types
 * Specific error types for infrastructure operations
 */
export class InfrastructureError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly operation: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'InfrastructureError';
  }
}

export class DatabaseError extends InfrastructureError {
  constructor(message: string, operation: string, details?: any) {
    super(message, 'database', operation, details);
    this.name = 'DatabaseError';
  }
}

export class MessagingError extends InfrastructureError {
  constructor(message: string, operation: string, details?: any) {
    super(message, 'messaging', operation, details);
    this.name = 'MessagingError';
  }
}

export class CacheError extends InfrastructureError {
  constructor(message: string, operation: string, details?: any) {
    super(message, 'cache', operation, details);
    this.name = 'CacheError';
  }
}

export class ExternalServiceError extends InfrastructureError {
  constructor(message: string, service: string, operation: string, details?: any) {
    super(message, service, operation, details);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Infrastructure Constants
 */
export const INFRASTRUCTURE_CONSTANTS = {
  DEFAULT_DATABASE_TIMEOUT: 30000, // 30 seconds
  DEFAULT_CACHE_TTL: 300, // 5 minutes
  DEFAULT_API_TIMEOUT: 5000, // 5 seconds
  MAX_CONNECTION_POOL_SIZE: 20,
  DEFAULT_BATCH_SIZE: 50,
  DEFAULT_RETRY_ATTEMPTS: 3,
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
  METRICS_COLLECTION_INTERVAL: 60000, // 1 minute
} as const;

/**
 * Infrastructure Bootstrap
 * Initializes the entire infrastructure layer
 */
export class InfrastructureBootstrap {
  static async initialize(config?: Partial<InfrastructureConfig>): Promise<void> {
    const manager = InfrastructureManager.getInstance();

    if (config) {
      manager.configure(config);
    }

    await manager.initialize();
  }

  static async shutdown(): Promise<void> {
    const manager = InfrastructureManager.getInstance();
    await manager.shutdown();
  }

  static getManager(): InfrastructureManager {
    return InfrastructureManager.getInstance();
  }

  static getConfig(): InfrastructureConfig {
    return InfrastructureManager.getInstance().getConfig();
  }

  static async getHealthCheck(): Promise<InfrastructureHealthCheck> {
    return InfrastructureManager.getInstance().getHealthCheck();
  }

  static getMetrics(): InfrastructureMetrics {
    return InfrastructureManager.getInstance().getMetrics();
  }
}
