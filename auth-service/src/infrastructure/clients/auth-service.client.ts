/**
 * Auth Service Client
 * Client for communicating with the auth service API endpoints
 * Handles token validation, API key verification, and service authentication
 */

import { logger } from '../services/logger.service';

// =====================================================================================
// CLIENT CONFIGURATION
// =====================================================================================

/**
 * Auth Service Client Configuration
 */
export interface AuthServiceClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

/**
 * Default Client Configuration
 */
export const DEFAULT_CLIENT_CONFIG: AuthServiceClientConfig = {
  baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  timeout: parseInt(process.env.AUTH_CLIENT_TIMEOUT || '5000'), // 5 seconds
  retryAttempts: parseInt(process.env.AUTH_CLIENT_RETRIES || '3'),
  retryDelay: parseInt(process.env.AUTH_CLIENT_RETRY_DELAY || '1000'), // 1 second
  enableCircuitBreaker: process.env.ENABLE_CIRCUIT_BREAKER === 'true',
  circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
  circuitBreakerTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000') // 1 minute
};

// =====================================================================================
// RESPONSE INTERFACES
// =====================================================================================

/**
 * Token Validation Response
 */
export interface TokenValidationResponse {
  valid: boolean;
  payload?: any;
  error?: string;
  expiresAt?: number;
  issuedAt?: number;
}

/**
 * Token Blacklist Response
 */
export interface TokenBlacklistResponse {
  isBlacklisted: boolean;
  blacklistedAt?: number;
}

/**
 * API Key Validation Response
 */
export interface ApiKeyValidationResponse {
  valid: boolean;
  serviceId?: string;
  permissions?: string[];
  error?: string;
}

/**
 * Service Key Validation Response
 */
export interface ServiceKeyValidationResponse {
  valid: boolean;
  serviceId?: string;
  permissions?: string[];
  error?: string;
}

// =====================================================================================
// CIRCUIT BREAKER STATE
// =====================================================================================

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttemptTime: number;
}

// =====================================================================================
// AUTH SERVICE CLIENT CLASS
// =====================================================================================

/**
 * Auth Service Client
 * Provides client-side access to auth service API endpoints
 */
export class AuthServiceClient {
  private config: AuthServiceClientConfig;
  private circuitBreakerState: CircuitBreakerState;

  constructor(config?: Partial<AuthServiceClientConfig>) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
    this.circuitBreakerState = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
      nextAttemptTime: 0
    };
  }

  /**
   * Validate JWT Token
   */
  async validateToken(token: string): Promise<TokenValidationResponse> {
    return this.makeRequest<TokenValidationResponse>({
      method: 'POST',
      endpoint: '/api/v1/auth/validate-token',
      body: { token },
      timeout: this.config.timeout
    });
  }

  /**
   * Check Token Blacklist
   */
  async checkTokenBlacklist(token: string): Promise<TokenBlacklistResponse> {
    return this.makeRequest<TokenBlacklistResponse>({
      method: 'POST',
      endpoint: '/api/v1/auth/check-blacklist',
      body: { token },
      timeout: this.config.timeout
    });
  }

  /**
   * Validate API Key
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResponse> {
    return this.makeRequest<ApiKeyValidationResponse>({
      method: 'POST',
      endpoint: '/api/v1/auth/validate-api-key',
      body: { apiKey },
      timeout: this.config.timeout
    });
  }

  /**
   * Validate Service Key
   */
  async validateServiceKey(serviceKey: string): Promise<ServiceKeyValidationResponse> {
    return this.makeRequest<ServiceKeyValidationResponse>({
      method: 'POST',
      endpoint: '/api/v1/auth/validate-service-key',
      body: { serviceKey },
      timeout: this.config.timeout
    });
  }

  /**
   * Check User Permissions
   */
  async checkPermissions(userId: string, permissions: string[]): Promise<{ hasPermissions: boolean; missingPermissions: string[] }> {
    return this.makeRequest({
      method: 'POST',
      endpoint: '/api/v1/auth/check-permissions',
      body: { userId, permissions },
      timeout: this.config.timeout
    });
  }

  /**
   * Check Role Access
   */
  async checkRoleAccess(userId: string, roles: string[]): Promise<{ hasAccess: boolean; missingRoles: string[] }> {
    return this.makeRequest({
      method: 'POST',
      endpoint: '/api/v1/auth/check-roles',
      body: { userId, roles },
      timeout: this.config.timeout
    });
  }

  /**
   * Check Resource Ownership
   */
  async checkResourceOwnership(userId: string, resourceType: string, resourceId: string): Promise<{ ownsResource: boolean }> {
    return this.makeRequest({
      method: 'POST',
      endpoint: '/api/v1/auth/check-ownership',
      body: { userId, resourceType, resourceId },
      timeout: this.config.timeout
    });
  }

  /**
   * Log Authentication Event
   */
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
    return this.makeRequest({
      method: 'POST',
      endpoint: '/api/v1/auth/log-event',
      body: event,
      timeout: this.config.timeout
    });
  }

  // =====================================================================================
  // INTERNAL METHODS
  // =====================================================================================

  /**
   * Make HTTP Request with Retry Logic and Circuit Breaker
   */
  private async makeRequest<T>(options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    endpoint: string;
    body?: any;
    timeout?: number;
  }): Promise<T> {
    const url = `${this.config.baseUrl}${options.endpoint}`;
    const timeout = options.timeout || this.config.timeout;

    // Check circuit breaker state
    if (this.config.enableCircuitBreaker && this.isCircuitOpen()) {
      logger.warn('Circuit breaker is open, skipping request', { url });
      throw new Error('Circuit breaker is open');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await this.performRequest<T>(url, options, timeout);
        this.onSuccess();
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn('Request failed, retrying', {
          url,
          attempt: attempt + 1,
          error: lastError.message
        });

        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    this.onFailure();
    throw lastError!;
  }

  /**
   * Perform Single HTTP Request
   */
  private async performRequest<T>(url: string, options: { method: string; body?: any }, timeout: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Circuit Breaker: Check if circuit is open
   */
  private isCircuitOpen(): boolean {
    const now = Date.now();

    switch (this.circuitBreakerState.state) {
      case 'OPEN':
        if (now >= this.circuitBreakerState.nextAttemptTime) {
          this.circuitBreakerState.state = 'HALF_OPEN';
          this.circuitBreakerState.failures = 0;
          return false;
        }
        return true;

      case 'HALF_OPEN':
        return false;

      case 'CLOSED':
        return false;

      default:
        return false;
    }
  }

  /**
   * Circuit Breaker: Handle success
   */
  private onSuccess(): void {
    if (this.config.enableCircuitBreaker) {
      this.circuitBreakerState.failures = 0;
      this.circuitBreakerState.state = 'CLOSED';
    }
  }

  /**
   * Circuit Breaker: Handle failure
   */
  private onFailure(): void {
    if (this.config.enableCircuitBreaker) {
      this.circuitBreakerState.failures++;
      this.circuitBreakerState.lastFailureTime = Date.now();

      if (this.circuitBreakerState.failures >= this.config.circuitBreakerThreshold) {
        this.circuitBreakerState.state = 'OPEN';
        this.circuitBreakerState.nextAttemptTime = Date.now() + this.config.circuitBreakerTimeout;
        logger.error('Circuit breaker opened', {
          failures: this.circuitBreakerState.failures,
          threshold: this.config.circuitBreakerThreshold
        });
      }
    }
  }

  /**
   * Utility: Delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get Circuit Breaker Status (for monitoring)
   */
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

  /**
   * Reset Circuit Breaker (for testing)
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
      nextAttemptTime: 0
    };
  }
}

// =====================================================================================
// CLIENT FACTORY
// =====================================================================================

/**
 * Auth Service Client Factory
 * Creates configured auth service client instances
 */
export class AuthServiceClientFactory {
  static create(config?: Partial<AuthServiceClientConfig>): AuthServiceClient {
    return new AuthServiceClient(config);
  }

  static createWithDefaults(): AuthServiceClient {
    return new AuthServiceClient();
  }
}

// =====================================================================================
// GLOBAL CLIENT INSTANCE
// =====================================================================================

/**
 * Default Auth Service Client Instance
 * Can be used throughout the application
 */
export const authServiceClient = AuthServiceClientFactory.createWithDefaults();