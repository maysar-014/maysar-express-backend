/**
 * Circuit Breaker Pattern Implementation
 * Provides fault tolerance by preventing cascading failures
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  recoveryTimeout: number;     // Time to wait before trying again (ms)
  monitoringPeriod: number;    // Time window to monitor failures (ms)
  successThreshold: number;    // Number of successes needed in HALF_OPEN
  name: string;               // Circuit breaker name for logging
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime = 0;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitBreakerError(
          `Circuit breaker '${this.config.name}' is OPEN`,
          this.getStats()
        );
      }

      // Transition to HALF_OPEN for testing
      this.state = CircuitState.HALF_OPEN;
      console.log(`🔄 Circuit breaker '${this.config.name}' transitioning to HALF_OPEN`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;

      if (this.successes >= this.config.successThreshold) {
        // Service has recovered
        this.reset();
        console.log(`✅ Circuit breaker '${this.config.name}' recovered and CLOSED`);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in monitoring period
      const now = Date.now();
      if (this.lastFailureTime &&
          (now - this.lastFailureTime) > this.config.monitoringPeriod) {
        this.failures = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.totalFailures++;
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Service still failing, go back to OPEN
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      this.successes = 0;
      console.log(`❌ Circuit breaker '${this.config.name}' failed in HALF_OPEN, returning to OPEN`);
    } else if (this.state === CircuitState.CLOSED &&
               this.failures >= this.config.failureThreshold) {
      // Open the circuit
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      console.log(`🚫 Circuit breaker '${this.config.name}' opened after ${this.failures} failures`);
    }
  }

  /**
   * Reset the circuit breaker to CLOSED state
   */
  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = 0;
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  /**
   * Force the circuit breaker to a specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    this.state = state;
    if (state === CircuitState.OPEN) {
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    }
    console.log(`⚡ Circuit breaker '${this.config.name}' forced to ${state}`);
  }

  /**
   * Check if circuit breaker can accept requests
   */
  canExecute(): boolean {
    return this.state === CircuitState.CLOSED ||
           (this.state === CircuitState.HALF_OPEN) ||
           (this.state === CircuitState.OPEN && Date.now() >= this.nextAttemptTime);
  }
}

/**
 * Circuit Breaker Error
 */
export class CircuitBreakerError extends Error {
  public readonly stats: CircuitBreakerStats;

  constructor(message: string, stats: CircuitBreakerStats) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.stats = stats;
  }
}

/**
 * HTTP Circuit Breaker for external API calls
 */
export class HttpCircuitBreaker extends CircuitBreaker {
  constructor(
    name: string,
    failureThreshold = 5,
    recoveryTimeout = 60000, // 1 minute
    monitoringPeriod = 300000 // 5 minutes
  ) {
    super({
      name: `http-${name}`,
      failureThreshold,
      recoveryTimeout,
      monitoringPeriod,
      successThreshold: 3
    });
  }
}

/**
 * Database Circuit Breaker
 */
export class DatabaseCircuitBreaker extends CircuitBreaker {
  constructor(
    name: string,
    failureThreshold = 3,
    recoveryTimeout = 30000, // 30 seconds
    monitoringPeriod = 120000 // 2 minutes
  ) {
    super({
      name: `db-${name}`,
      failureThreshold,
      recoveryTimeout,
      monitoringPeriod,
      successThreshold: 2
    });
  }
}

/**
 * Redis Circuit Breaker
 */
export class RedisCircuitBreaker extends CircuitBreaker {
  constructor(
    name: string,
    failureThreshold = 3,
    recoveryTimeout = 15000, // 15 seconds
    monitoringPeriod = 60000 // 1 minute
  ) {
    super({
      name: `redis-${name}`,
      failureThreshold,
      recoveryTimeout,
      monitoringPeriod,
      successThreshold: 2
    });
  }
}

/**
 * Circuit Breaker Registry for managing multiple breakers
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Register a circuit breaker
   */
  register(name: string, breaker: CircuitBreaker): void {
    this.breakers.set(name, breaker);
  }

  /**
   * Get a circuit breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get statistics for all circuit breakers
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
      // Access private reset method through type assertion
      (breaker as any).reset();
    }
    console.log('🔄 All circuit breakers reset');
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
