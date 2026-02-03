/**
 * API Gateway Type Definitions
 * 
 * This file contains all TypeScript type definitions for the Maysar API Gateway
 * including request/response types, service discovery types, and configuration types.
 */

// Basic Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
  requestId: string;
}

// Service Discovery Types
export interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  version: string;
  health: 'healthy' | 'unhealthy' | 'degraded';
  metadata: Record<string, any>;
  lastHealthCheck: Date;
  weight: number;
}

export interface ServiceRegistry {
  [serviceName: string]: ServiceInstance[];
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastCheck: Date;
  errorRate: number;
  uptime: number;
}

// Request/Response Types
export interface GatewayRequest {
  id: string;
  method: string;
  path: string;
  query: any;
  headers: Record<string, string>;
  body: any;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  protocol?: string;
  originalUrl?: string;
}

export interface GatewayResponse {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  data: any;
  timestamp: Date;
  duration: number;
  serviceId?: string;
}

export interface RouteConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  service: string;
  pathRewrite?: string;
  timeout?: number;
  retries?: number;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  authentication?: {
    required: boolean;
    scopes?: string[];
  };
  authorization?: {
    required: boolean;
    roles?: string[];
  };
  validation?: {
    schema: any;
    strict: boolean;
  };
}

// Authentication Types
export interface AuthToken {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  ip: string;
  userAgent: string;
  token: string;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  issuer: string;
  audience: string;
  algorithms: string[];
  publicKey?: string;
  privateKey?: string;
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: any, res: any) => void;
}

export interface RateLimitState {
  key: string;
  count: number;
  resetTime: Date;
  blockedUntil?: Date;
}

// Circuit Breaker Types
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  resetTimeout: number;
  monitoringPeriod: number;
  volumeThreshold: number;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

// Load Balancer Types
export interface LoadBalancerConfig {
  strategy: 'round_robin' | 'least_connections' | 'weighted_round_robin' | 'random';
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface LoadBalancerState {
  currentIndex: number;
  activeConnections: Map<string, number>;
  lastUsed: Map<string, Date>;
}

// Monitoring & Observability Types
export interface Metrics {
  requestsTotal: number;
  requestsPerSecond: number;
  responseTimeAvg: number;
  responseTimeP95: number;
  responseTimeP99: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface LogEntry {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  service: string;
  requestId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: Record<string, any>;
  logs: LogEntry[];
}

// Configuration Types
export interface GatewayConfig {
  port: number;
  environment: 'development' | 'staging' | 'production';
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  cors: {
    origins: string[];
    methods: string[];
    headers: string[];
    credentials: boolean;
  };
  security: {
    helmet: boolean;
    rateLimiting: boolean;
    cors: boolean;
    compression: boolean;
    timeout: number;
  };
  monitoring: {
    enabled: boolean;
    metrics: boolean;
    tracing: boolean;
    logs: boolean;
  };
  services: ServiceRegistry;
  routes: RouteConfig[];
  auth: AuthConfig;
  rateLimiting: RateLimitConfig;
  circuitBreaker: CircuitBreakerConfig;
  loadBalancer: LoadBalancerConfig;
}

// Error Types
export interface GatewayError extends Error {
  code: string;
  statusCode: number;
  details?: any;
  requestId: string;
  timestamp: Date;
}

export interface ValidationError extends GatewayError {
  field: string;
  value: any;
  constraint: string;
}

export interface ServiceError extends GatewayError {
  service: string;
  originalError?: Error;
}

// Health Check Types
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  uptime: number;
  services: ServiceHealth[];
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    load: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
}

// Cache Types
export interface CacheConfig {
  ttl: number;
  maxItems: number;
  compression: boolean;
  encryption: boolean;
}

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
  accessedAt: Date;
  hitCount: number;
}

// Event Types
export interface Event {
  id: string;
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  callbackUrl: string;
  filter?: Record<string, any>;
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear';
    retryDelay: number;
  };
  isActive: boolean;
  createdAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

// Plugin Types
export interface Plugin {
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  config: Record<string, any>;
  hooks: {
    beforeRequest?: (req: GatewayRequest) => Promise<GatewayRequest>;
    afterRequest?: (req: GatewayRequest, res: GatewayResponse) => Promise<GatewayResponse>;
    onError?: (error: GatewayError, req: GatewayRequest) => Promise<void>;
  };
}

// API Documentation Types
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
}

// Performance Types
export interface PerformanceMetrics {
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    totalRequests: number;
  };
  errorRate: {
    percentage: number;
    totalErrors: number;
  };
  resourceUsage: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      load: number;
    };
  };
}

// Export all types
export * from './validation';
export * from './middleware';
export * from './services';
