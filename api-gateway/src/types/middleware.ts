/**
 * Middleware Type Definitions
 * 
 * Type definitions for middleware functions, middleware chains, and middleware configuration
 */

import { Request, Response, NextFunction } from 'express';
import { GatewayRequest, GatewayResponse, AuthContext, GatewayError } from './index';

// Basic Middleware Types
export type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => void;
export type AsyncMiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// Gateway Middleware Types
export interface GatewayMiddleware {
  name: string;
  version: string;
  description: string;
  priority: number;
  enabled: boolean;
  config: Record<string, any>;
  handler: MiddlewareFunction;
  errorHandler?: (error: GatewayError, req: Request, res: Response, next: NextFunction) => void;
}

// Authentication Middleware Types
export interface AuthMiddleware extends GatewayMiddleware {
  required: boolean;
  scopes?: string[];
  roles?: string[];
  strategies: AuthStrategy[];
}

export interface AuthStrategy {
  name: string;
  type: 'jwt' | 'api_key' | 'oauth2' | 'basic' | 'session';
  config: Record<string, any>;
  validate: (req: Request, res: Response, next: NextFunction) => Promise<AuthContext | null>;
}

// Rate Limiting Middleware Types
export interface RateLimitMiddleware extends GatewayMiddleware {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  onLimitReached: (req: Request, res: Response) => void;
}

export interface RateLimitState {
  key: string;
  count: number;
  resetTime: Date;
  blockedUntil?: Date;
}

// Validation Middleware Types
export interface ValidationMiddleware extends GatewayMiddleware {
  schema: any;
  strict: boolean;
  transform: boolean;
  sanitize: boolean;
}

// Logging Middleware Types
export interface LoggingMiddleware extends GatewayMiddleware {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'text' | 'structured';
  includeHeaders: boolean;
  includeBody: boolean;
  includeQuery: boolean;
  includeUser: boolean;
}

// Security Middleware Types
export interface SecurityMiddleware extends GatewayMiddleware {
  helmet: boolean;
  cors: boolean;
  compression: boolean;
  timeout: number;
  hsts: boolean;
  noSniff: boolean;
  xssFilter: boolean;
  frameguard: boolean;
}

// Monitoring Middleware Types
export interface MonitoringMiddleware extends GatewayMiddleware {
  metrics: boolean;
  tracing: boolean;
  performance: boolean;
  errorTracking: boolean;
}

// Circuit Breaker Middleware Types
export interface CircuitBreakerMiddleware extends GatewayMiddleware {
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

// Load Balancer Middleware Types
export interface LoadBalancerMiddleware extends GatewayMiddleware {
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

// Service Discovery Middleware Types
export interface ServiceDiscoveryMiddleware extends GatewayMiddleware {
  registry: 'consul' | 'etcd' | 'kubernetes' | 'static';
  refreshInterval: number;
  healthCheckPath: string;
  healthCheckInterval: number;
}

// Error Handling Middleware Types
export interface ErrorMiddleware extends GatewayMiddleware {
  errorTypes: string[];
  errorCodes: string[];
  errorMessages: Record<string, string>;
  errorResponseFormat: 'json' | 'xml' | 'text';
}

// Response Transformation Middleware Types
export interface ResponseTransformMiddleware extends GatewayMiddleware {
  transform: (response: GatewayResponse) => GatewayResponse;
  format: 'json' | 'xml' | 'text';
  compression: boolean;
  encryption: boolean;
}

// Request Transformation Middleware Types
export interface RequestTransformMiddleware extends GatewayMiddleware {
  transform: (request: GatewayRequest) => GatewayRequest;
  pathRewrite: boolean;
  queryTransform: boolean;
  headerTransform: boolean;
  bodyTransform: boolean;
}

// Middleware Chain Types
export interface MiddlewareChain {
  id: string;
  name: string;
  middlewares: GatewayMiddleware[];
  order: string[];
  enabled: boolean;
  conditions: MiddlewareCondition[];
}

export interface MiddlewareCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'regex';
  value: any;
  path: string[];
}

// Middleware Configuration Types
export interface MiddlewareConfig {
  global: GatewayMiddleware[];
  routes: Record<string, GatewayMiddleware[]>;
  conditions: MiddlewareCondition[];
  order: string[];
}

// Middleware Registry Types
export interface MiddlewareRegistry {
  register: (middleware: GatewayMiddleware) => void;
  get: (name: string) => GatewayMiddleware | undefined;
  list: () => GatewayMiddleware[];
  enable: (name: string) => void;
  disable: (name: string) => void;
  remove: (name: string) => void;
}

// Middleware Pipeline Types
export interface MiddlewarePipeline {
  id: string;
  name: string;
  stages: {
    preAuth: GatewayMiddleware[];
    auth: GatewayMiddleware[];
    preValidation: GatewayMiddleware[];
    validation: GatewayMiddleware[];
    preRouting: GatewayMiddleware[];
    routing: GatewayMiddleware[];
    postRouting: GatewayMiddleware[];
    preResponse: GatewayMiddleware[];
    response: GatewayMiddleware[];
    postResponse: GatewayMiddleware[];
  };
  errorHandlers: ErrorMiddleware[];
}

// Export all middleware types
export * from './middleware';