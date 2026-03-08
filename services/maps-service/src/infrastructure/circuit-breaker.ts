/**
 * Circuit Breaker Pattern Implementation
 *
 * Constitution Section 8: Infrastructure Isolation Rule
 * Ensures external API failures don't cascade through the system
 */

export enum CircuitState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Circuit is open, failing fast
    HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
    failureThreshold: number;      // Number of failures before opening
    recoveryTimeout: number;       // Time in ms before trying half-open
    monitoringPeriod: number;      // Time window in ms for failure tracking
    successThreshold: number;      // Successes needed in half-open to close
    name: string;                  // Circuit breaker identifier
}

export interface CircuitBreakerMetrics {
    name: string;
    state: CircuitState;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastFailureTime?: Date;
    lastSuccessTime?: Date;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
}

interface LegacyCircuitBreakerOptions {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    monitoringPeriod?: number;
}

export class CircuitBreaker {
    private config: CircuitBreakerConfig;
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount = 0;
    private successCount = 0;
    private lastFailureTime?: Date;
    private lastSuccessTime?: Date;
    private nextAttemptTime?: Date;
    private requestCount = 0;
    private rejectedCount = 0;

    constructor(config: CircuitBreakerConfig);
    constructor(name: string, options?: Partial<LegacyCircuitBreakerOptions>);
    constructor(
        configOrName: CircuitBreakerConfig | string,
        options: Partial<LegacyCircuitBreakerOptions> = {}
    ) {
        if (typeof configOrName === 'string') {
            this.config = {
                name: configOrName,
                failureThreshold: options.failureThreshold ?? 5,
                successThreshold: options.successThreshold ?? 3,
                recoveryTimeout: options.timeout ?? 60_000,
                monitoringPeriod: options.monitoringPeriod ?? 300_000,
            };
            return;
        }

        this.config = configOrName;
    }

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        this.requestCount++;

        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.state = CircuitState.HALF_OPEN;
                this.successCount = 0;
            } else {
                this.rejectedCount++;
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.lastSuccessTime = new Date();
        this.successCount++;

        if (this.state === CircuitState.HALF_OPEN) {
            if (this.successCount >= this.config.successThreshold) {
                this.reset();
            }
        } else if (this.state === CircuitState.CLOSED) {
            // Reset failure count on success in closed state
            this.failureCount = 0;
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = new Date();

        if (this.failureCount >= this.config.failureThreshold) {
            this.trip();
        }
    }

    private shouldAttemptReset(): boolean {
        return this.nextAttemptTime ? Date.now() >= this.nextAttemptTime.getTime() : false;
    }

    private trip(): void {
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    }

    private reset(): void {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttemptTime = undefined;
    }

    getMetrics(): CircuitBreakerMetrics {
        return {
            name: this.config.name,
            state: this.state,
            totalRequests: this.requestCount,
            successfulRequests: this.requestCount - this.failureCount,
            failedRequests: this.failureCount,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            consecutiveFailures: this.failureCount,
            consecutiveSuccesses: this.successCount
        };
    }

    // Legacy statistics adapter expected by older tests.
    getStats(): {
        state: CircuitState;
        failureCount: number;
        successCount: number;
        totalCount: number;
        rejectedCount: number;
    } {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalCount: this.requestCount,
            rejectedCount: this.rejectedCount,
        };
    }

    getState(): CircuitState {
        return this.state;
    }

    forceReset(): void {
        this.reset();
    }

    forceOpen(): void {
        this.trip();
    }
}

/**
 * Circuit Breaker Registry for monitoring all breakers
 */
export class CircuitBreakerRegistry {
    private breakers = new Map<string, CircuitBreaker>();

    register(breaker: CircuitBreaker): void {
        this.breakers.set(breaker.getMetrics().name, breaker);
    }

    get(name: string): CircuitBreaker | undefined {
        return this.breakers.get(name);
    }

    getAllMetrics(): CircuitBreakerMetrics[] {
        return Array.from(this.breakers.values()).map(cb => cb.getMetrics());
    }

    getHealthSummary(): {
        total: number;
        closed: number;
        open: number;
        halfOpen: number;
        unhealthy: number;
    } {
        const metrics = this.getAllMetrics();
        const summary = {
            total: metrics.length,
            closed: 0,
            open: 0,
            halfOpen: 0,
            unhealthy: 0
        };

        for (const metric of metrics) {
            switch (metric.state) {
                case CircuitState.CLOSED:
                    summary.closed++;
                    break;
                case CircuitState.OPEN:
                    summary.open++;
                    summary.unhealthy++;
                    break;
                case CircuitState.HALF_OPEN:
                    summary.halfOpen++;
                    break;
            }
        }

        return summary;
    }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Factory function to create circuit breakers with sensible defaults
 */
export function createCircuitBreaker(
    name: string,
    overrides: Partial<CircuitBreakerConfig> = {}
): CircuitBreaker {
    const config: CircuitBreakerConfig = {
        name,
        failureThreshold: 5,        // 5 failures
        recoveryTimeout: 60000,     // 1 minute
        monitoringPeriod: 300000,   // 5 minutes
        successThreshold: 3,        // 3 successes in half-open
        ...overrides
    };

    const breaker = new CircuitBreaker(config);
    circuitBreakerRegistry.register(breaker);
    return breaker;
}
