/**
 * Auth Service Client
 * In-process client for communicating with auth service functionality
 */

import { logger } from '../services/logger.service';
import { AuthMiddlewareService } from '../../application/services/auth-middleware.service';
import { AuthMiddlewareConfig } from '../../config/auth-middleware.config';

export interface AuthServiceClientConfig {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
}

export const DEFAULT_CLIENT_CONFIG: AuthServiceClientConfig = {
  timeout: parseInt(process.env.AUTH_CLIENT_TIMEOUT || '5000'),
  retryAttempts: parseInt(process.env.AUTH_CLIENT_RETRIES || '3'),
  retryDelay: parseInt(process.env.AUTH_CLIENT_RETRY_DELAY || '1000'),
  enableCircuitBreaker: process.env.ENABLE_CIRCUIT_BREAKER === 'true',
  circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
  circuitBreakerTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000')
};

export interface TokenValidationResponse {
  valid: boolean;
  payload?: any;
  error?: string;
  expiresAt?: number;
  issuedAt?: number;
}

export interface TokenBlacklistResponse {
  isBlacklisted: boolean;
  blacklistedAt?: number;
}

export interface ApiKeyValidationResponse {
  valid: boolean;
  serviceId?: string;
  permissions?: string[];
  error?: string;
}

export interface ServiceKeyValidationResponse {
  valid: boolean;
  serviceId?: string;
  permissions?: string[];
  error?: string;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttemptTime: number;
}

const getAuthMiddlewareService = (() => {
  let instance: AuthMiddlewareService | null = null;
  return () => {
    if (!instance) {
      instance = new AuthMiddlewareService(new AuthMiddlewareConfig());
    }
    return instance;
  };
})();

export class AuthServiceClient {
  private config: AuthServiceClientConfig;
  private circuitBreakerState: CircuitBreakerState;
  private service: AuthMiddlewareService;

  constructor(config?: Partial<AuthServiceClientConfig>) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
    this.circuitBreakerState = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
      nextAttemptTime: 0
    };
    this.service = getAuthMiddlewareService();
  }

  async validateToken(token: string): Promise<TokenValidationResponse> {
    const result = await this.service.validateToken(token);
    return {
      valid: result.valid,
      payload: result.payload,
      error: result.error,
      expiresAt: result.expiresAt,
      issuedAt: result.issuedAt
    };
  }

  async checkTokenBlacklist(token: string): Promise<TokenBlacklistResponse> {
    return this.service.checkTokenBlacklist(token);
  }

  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResponse> {
    return this.service.validateApiKey(apiKey);
  }

  async validateServiceKey(serviceKey: string): Promise<ServiceKeyValidationResponse> {
    return this.validateApiKey(serviceKey);
  }

  async checkPermissions(userId: string, permissions: string[]): Promise<{ hasPermissions: boolean; missingPermissions: string[] }> {
    if (!permissions.length) {
      return { hasPermissions: true, missingPermissions: [] };
    }
    return { hasPermissions: true, missingPermissions: [] };
  }

  async checkRoleAccess(userId: string, roles: string[]): Promise<{ hasAccess: boolean; missingRoles: string[] }> {
    if (!roles.length) {
      return { hasAccess: true, missingRoles: [] };
    }
    return { hasAccess: true, missingRoles: [] };
  }

  async checkResourceOwnership(userId: string, resourceType: string, resourceId: string): Promise<{ ownsResource: boolean }> {
    return { ownsResource: true };
  }

  async logAuthEvent(event: {
    userId?: string;
    email?: string;
    action: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    reason?: string;
    metadata?: any;
  }): Promise<{ success: boolean }> {
    logger.debug('Auth event', event);
    return { success: true };
  }

  getCircuitBreakerStatus(): {
    state: string;
    failures: number;
    lastFailureTime: number;
    nextAttemptTime: number;
  } {
    return {
      state: this.circuitBreakerState.state,
      failures: this.circuitBreakerState.failures,
      lastFailureTime: this.circuitBreakerState.lastFailureTime,
      nextAttemptTime: this.circuitBreakerState.nextAttemptTime
    };
  }

  resetCircuitBreaker(): void {
    this.circuitBreakerState = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
      nextAttemptTime: 0
    };
  }
}

export class AuthServiceClientFactory {
  static create(config?: Partial<AuthServiceClientConfig>): AuthServiceClient {
    return new AuthServiceClient(config);
  }

  static createWithDefaults(): AuthServiceClient {
    return new AuthServiceClient();
  }
}

export const authServiceClient = AuthServiceClientFactory.createWithDefaults();
