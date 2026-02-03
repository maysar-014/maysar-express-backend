/**
 * Circuit Breaker Pattern
 * Implements fault tolerance for external service calls
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  recoveryTimeout: number;     // Time to wait before trying half-open (ms)
  monitoringPeriod: number;    // Time window for failure tracking (ms)
  successThreshold: number;    // Successes needed to close circuit
  name: string;               // Circuit breaker identifier
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  nextAttemptTime: Date | null;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  circuitState: CircuitState;
  fallbackUsed: boolean;
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private requests = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextAttemptTime: Date | null = null;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    this.requests++;

    // Check if circuit should open
    if (this.shouldOpen()) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    }

    // If circuit is open, try fallback or fail fast
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        return this.failFast(fallback);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return {
        success: true,
        data: result,
        circuitState: this.state,
        fallbackUsed: false,
      };
    } catch (error) {
      this.recordFailure();
      return {
        success: false,
        error,
        circuitState: this.state,
        fallbackUsed: false,
      };
    }
  }

  /**
   * Check if circuit should open based on failure threshold
   */
  private shouldOpen(): boolean {
    if (this.state !== CircuitState.CLOSED) return false;

    const now = Date.now();
    const monitoringStart = now - this.config.monitoringPeriod;

    // Reset counters if outside monitoring period
    if (this.lastFailureTime && this.lastFailureTime.getTime() < monitoringStart) {
      this.failures = 0;
    }

    return this.failures >= this.config.failureThreshold;
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime !== null && Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Fail fast when circuit is open
   */
  private async failFast<T>(fallback?: () => Promise<T>): Promise<CircuitBreakerResult<T>> {
    if (fallback) {
      try {
        const result = await fallback();
        return {
          success: true,
          data: result,
          circuitState: this.state,
          fallbackUsed: true,
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: fallbackError,
          circuitState: this.state,
          fallbackUsed: true,
        };
      }
    }

    return {
      success: false,
      error: new Error(`Circuit breaker is OPEN for ${this.config.name}`),
      circuitState: this.state,
      fallbackUsed: false,
    };
  }

  /**
   * Record successful operation
   */
  private recordSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();

    // Close circuit if in half-open state and success threshold reached
    if (this.state === CircuitState.HALF_OPEN && this.successes >= this.config.successThreshold) {
      this.state = CircuitState.CLOSED;
      this.failures = 0;
      this.successes = 0;
      this.nextAttemptTime = null;
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    // Open circuit if failure threshold reached
    if (this.state === CircuitState.HALF_OPEN || this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      requests: this.requests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.requests = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Force circuit to open (for testing)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
  }

  /**
   * Force circuit to close (for testing)
   */
  forceClose(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttemptTime = null;
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitoringPeriod: 60000, // 1 minute
        successThreshold: 3,
        name,
        ...config,
      };

      this.breakers.set(name, new CircuitBreaker(defaultConfig));
    }

    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }

    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Get circuit breaker names
   */
  getBreakerNames(): string[] {
    return Array.from(this.breakers.keys());
  }
}

// Global circuit breaker registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Circuit Breaker presets for common use cases
 */
export const CircuitBreakerPresets = {
  // External API calls
  API: {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
    successThreshold: 2,
  },

  // Database connections
  DATABASE: {
    failureThreshold: 3,
    recoveryTimeout: 10000, // 10 seconds
    monitoringPeriod: 30000, // 30 seconds
    successThreshold: 2,
  },

  // Payment services
  PAYMENT: {
    failureThreshold: 3,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    successThreshold: 2,
  },

  // Notification services
  NOTIFICATION: {
    failureThreshold: 10,
    recoveryTimeout: 120000, // 2 minutes
    monitoringPeriod: 300000, // 5 minutes
    successThreshold: 3,
  },

  // Cache services
  CACHE: {
    failureThreshold: 5,
    recoveryTimeout: 15000, // 15 seconds
    monitoringPeriod: 60000, // 1 minute
    successThreshold: 2,
  },
};

/**
 * Decorator for circuit breaker protection
 */
export function circuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const breaker = circuitBreakerRegistry.getBreaker(name, config);

      return breaker.execute(
        () => originalMethod.apply(this, args),
        async () => {
          throw new Error(`Circuit breaker ${name} is open and no fallback provided`);
        }
      );
    };

    return descriptor;
  };
}
