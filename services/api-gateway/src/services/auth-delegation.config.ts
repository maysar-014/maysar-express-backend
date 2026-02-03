/**
 * Auth Delegation Configuration
 * 
 * Configuration for the Auth Delegation Service that handles communication
 * with the Auth Service for authentication validation.
 */

export interface AuthDelegationConfig {
  authServiceUrl: string;
  timeout: number;
  cacheTTL: number;
  maxCacheSize: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
  enableMetrics: boolean;
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  };
}

export class AuthDelegationConfig implements AuthDelegationConfig {
  constructor(config?: Partial<AuthDelegationConfig>) {
    const defaults = this.getDefaultConfig();
    const envConfig = this.getEnvironmentConfig();
    
    Object.assign(this, defaults, envConfig, config);
  }

  private getDefaultConfig(): Partial<AuthDelegationConfig> {
    return {
      authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000'),
      cacheTTL: parseInt(process.env.AUTH_CACHE_TTL || '300000'), // 5 minutes
      maxCacheSize: parseInt(process.env.AUTH_MAX_CACHE_SIZE || '1000'),
      retryAttempts: parseInt(process.env.AUTH_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.AUTH_RETRY_DELAY || '1000'),
      enableLogging: process.env.AUTH_ENABLE_LOGGING === 'true',
      enableMetrics: process.env.AUTH_ENABLE_METRICS === 'true',
      circuitBreaker: {
        failureThreshold: parseInt(process.env.AUTH_CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'),
        recoveryTimeout: parseInt(process.env.AUTH_CIRCUIT_BREAKER_RECOVERY_TIMEOUT || '60000'),
        monitoringPeriod: parseInt(process.env.AUTH_CIRCUIT_BREAKER_MONITORING_PERIOD || '30000'),
      },
    };
  }

  private getEnvironmentConfig(): Partial<AuthDelegationConfig> {
    const config: Partial<AuthDelegationConfig> = {};

    // Override with environment-specific settings
    if (process.env.NODE_ENV === 'development') {
      config.enableLogging = true;
      config.enableMetrics = true;
      config.timeout = 10000; // Longer timeout for development
    } else if (process.env.NODE_ENV === 'production') {
      config.enableLogging = false;
      config.enableMetrics = true;
      config.timeout = 3000; // Shorter timeout for production
    }

    return config;
  }

  // Validation method to ensure configuration is valid
  validate(): void {
    if (!this.authServiceUrl) {
      throw new Error('AuthDelegationConfig: authServiceUrl is required');
    }

    if (!this.authServiceUrl.startsWith('http')) {
      throw new Error('AuthDelegationConfig: authServiceUrl must be a valid URL');
    }

    if (this.timeout <= 0) {
      throw new Error('AuthDelegationConfig: timeout must be greater than 0');
    }

    if (this.cacheTTL <= 0) {
      throw new Error('AuthDelegationConfig: cacheTTL must be greater than 0');
    }

    if (this.maxCacheSize <= 0) {
      throw new Error('AuthDelegationConfig: maxCacheSize must be greater than 0');
    }

    if (this.retryAttempts < 0) {
      throw new Error('AuthDelegationConfig: retryAttempts must be non-negative');
    }

    if (this.retryDelay < 0) {
      throw new Error('AuthDelegationConfig: retryDelay must be non-negative');
    }

    // Validate circuit breaker configuration
    const cb = this.circuitBreaker;
    if (cb.failureThreshold <= 0) {
      throw new Error('AuthDelegationConfig: circuitBreaker.failureThreshold must be greater than 0');
    }

    if (cb.recoveryTimeout <= 0) {
      throw new Error('AuthDelegationConfig: circuitBreaker.recoveryTimeout must be greater than 0');
    }

    if (cb.monitoringPeriod <= 0) {
      throw new Error('AuthDelegationConfig: circuitBreaker.monitoringPeriod must be greater than 0');
    }
  }

  // Get configuration for logging
  getLogConfig(): Record<string, any> {
    return {
      authServiceUrl: this.authServiceUrl,
      timeout: this.timeout,
      cacheTTL: this.cacheTTL,
      maxCacheSize: this.maxCacheSize,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
      enableLogging: this.enableLogging,
      enableMetrics: this.enableMetrics,
      circuitBreaker: this.circuitBreaker,
    };
  }

  // Get configuration for metrics
  getMetricsConfig(): Record<string, any> {
    return {
      timeout: this.timeout,
      cacheTTL: this.cacheTTL,
      maxCacheSize: this.maxCacheSize,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
      circuitBreaker: this.circuitBreaker,
    };
  }
}