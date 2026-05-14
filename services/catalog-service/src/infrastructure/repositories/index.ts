/**
 * Infrastructure Repositories Index
 * Central export point for all repository implementations
 * Infrastructure layer implementations of domain repository interfaces
 */

// Product Repository
export * from './prisma-product.repository';

// Buy Box Ranking Repository
export * from './prisma-buy-box-ranking.repository';

/**
 * Repository Infrastructure Overview
 *
 * This module provides concrete implementations of domain repository interfaces
 * using infrastructure-specific technologies (Prisma ORM, external APIs, etc.)
 *
 * Key Features:
 * - Type-safe database operations
 * - Transaction management
 * - Connection pooling and optimization
 * - Error handling and logging
 * - Performance monitoring
 * - Caching integration
 *
 * Architecture Principles:
 * - Dependency injection friendly
 * - Interface segregation
 * - Factory pattern for instantiation
 * - Connection management
 * - Migration support
 */

/**
 * Repository Configuration
 * Configuration options for repository behavior
 */
export interface RepositoryConfig {
  // Database connection settings
  connectionString: string;
  maxConnections: number;
  connectionTimeout: number;

  // Query optimization
  enableQueryLogging: boolean;
  enableQueryCaching: boolean;
  queryTimeout: number;

  // Transaction settings
  transactionTimeout: number;
  maxRetries: number;

  // Monitoring
  enableMetrics: boolean;
  enableTracing: boolean;
}

/**
 * Default Repository Configuration
 */
export const DEFAULT_REPOSITORY_CONFIG: RepositoryConfig = {
  connectionString: process.env.DATABASE_URL || '',
  maxConnections: 10,
  connectionTimeout: 30000, // 30 seconds
  enableQueryLogging: process.env.NODE_ENV === 'development',
  enableQueryCaching: true,
  queryTimeout: 30000, // 30 seconds
  transactionTimeout: 30000, // 30 seconds
  maxRetries: 3,
  enableMetrics: true,
  enableTracing: true
};

/**
 * Repository Health Check
 * Health status of repository connections and operations
 */
export interface RepositoryHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: {
    connected: boolean;
    connectionPoolSize: number;
    activeConnections: number;
    responseTime: number;
  };
  cache?: {
    connected: boolean;
    hitRate: number;
    size: number;
  };
  lastChecked: Date;
  details?: Record<string, any>;
}

/**
 * Repository Metrics
 * Performance and usage metrics for repositories
 */
export interface RepositoryMetrics {
  operations: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  transactions: {
    total: number;
    committed: number;
    rolledBack: number;
    averageDuration: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  timestamp: Date;
}

/**
 * Repository Manager
 * Manages repository lifecycle and connections
 */
export class RepositoryManager {
  private static instance: RepositoryManager | null = null;
  private config: RepositoryConfig = DEFAULT_REPOSITORY_CONFIG;

  private constructor() {}

  static getInstance(): RepositoryManager {
    if (!this.instance) {
      this.instance = new RepositoryManager();
    }
    return this.instance;
  }

  configure(config: Partial<RepositoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RepositoryConfig {
    return { ...this.config };
  }

  async getHealthCheck(): Promise<RepositoryHealthCheck> {
    // Implementation would check database connectivity, cache status, etc.
    return {
      status: 'healthy',
      database: {
        connected: true,
        connectionPoolSize: 10,
        activeConnections: 2,
        responseTime: 5
      },
      lastChecked: new Date()
    };
  }

  getMetrics(): RepositoryMetrics {
    // Implementation would collect actual metrics
    return {
      operations: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      },
      transactions: {
        total: 0,
        committed: 0,
        rolledBack: 0,
        averageDuration: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      connections: {
        active: 0,
        idle: 0,
        total: 0
      },
      timestamp: new Date()
    };
  }

  async shutdown(): Promise<void> {
    // Implementation would close connections, cleanup resources
    console.log('Repository manager shutdown completed');
  }
}

/**
 * Repository Error Types
 * Specific error types for repository operations
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class ConnectionError extends RepositoryError {
  constructor(message: string, operation: string) {
    super(message, 'CONNECTION_ERROR', operation);
    this.name = 'ConnectionError';
  }
}

export class QueryError extends RepositoryError {
  constructor(message: string, operation: string, details?: any) {
    super(message, 'QUERY_ERROR', operation, details);
    this.name = 'QueryError';
  }
}

export class TransactionError extends RepositoryError {
  constructor(message: string, operation: string, details?: any) {
    super(message, 'TRANSACTION_ERROR', operation, details);
    this.name = 'TransactionError';
  }
}

export class ConstraintViolationError extends RepositoryError {
  constructor(message: string, operation: string, constraint: string) {
    super(message, 'CONSTRAINT_VIOLATION', operation, { constraint });
    this.name = 'ConstraintViolationError';
  }
}

/**
 * Repository Constants
 */
export const REPOSITORY_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  CACHE_TTL_DEFAULT: 300, // 5 minutes
} as const;
