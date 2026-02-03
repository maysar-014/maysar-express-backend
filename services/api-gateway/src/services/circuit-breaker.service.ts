/**
 * Circuit Breaker Service
 * 
 * Implements circuit breaker pattern for fault tolerance and resilience
 * in service-to-service communication within the API Gateway
 */

import { CircuitBreakerState, CircuitBreakerStats } from '../types';
import { gatewayConfig } from '../config';

export interface CircuitBreakerService {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  isOpen(): boolean;
  isHalfOpen(): boolean;
  isClosed(): boolean;
  reset(): void;
  forceOpen(): void;
  forceClosed(): void;
  getStats(): CircuitBreakerStats;
}

export class CircuitBreaker implements CircuitBreakerService {
  private state: CircuitBreakerState;
  private failures: number = 0;
  private successes: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private resetTimer: NodeJS.Timeout | null = null;

  constructor(
    private serviceId: string,
    private config: {
      failureThreshold: number;
      recoveryTimeout: number;
      resetTimeout: number;
      monitoringPeriod: number;
      volumeThreshold: number;
    }
  ) {
    this.state = {
      state: 'CLOSED',
      failures: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };

    this.startMonitoring();
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.isOpen()) {
      if (this.shouldAttemptReset()) {
        this.state.state = 'HALF_OPEN';
        console.log(`Circuit breaker ${this.serviceId} transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker ${this.serviceId} is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  isOpen(): boolean {
    return this.state.state === 'OPEN';
  }

  isHalfOpen(): boolean {
    return this.state.state === 'HALF_OPEN';
  }

  isClosed(): boolean {
    return this.state.state === 'CLOSED';
  }

  reset(): void {
    this.state = {
      state: 'CLOSED',
      failures: 0,
      lastFailureTime: null,
      lastSuccessTime: new Date(),
      totalRequests: this.totalRequests,
      totalFailures: this.failures,
      totalSuccesses: this.successes,
    };
    this.failures = 0;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    console.log(`Circuit breaker ${this.serviceId} reset to CLOSED`);
  }

  forceOpen(): void {
    this.state.state = 'OPEN';
    this.lastFailureTime = new Date();
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    
    this.resetTimer = setTimeout(() => {
      this.state.state = 'HALF_OPEN';
      console.log(`Circuit breaker ${this.serviceId} forced to HALF_OPEN after timeout`);
    }, this.config.recoveryTimeout);

    console.log(`Circuit breaker ${this.serviceId} forced to OPEN`);
  }

  forceClosed(): void {
    this.reset();
  }

  getStats(): CircuitBreakerStats {
    const failureRate = this.totalRequests > 0 
      ? (this.failures / this.totalRequests) * 100 
      : 0;

    const uptime = this.totalRequests > 0 
      ? (this.successes / this.totalRequests) * 100 
      : 100;

    return {
      state: this.state.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      failureRate,
      uptime,
    };
  }

  private recordSuccess(): void {
    this.successes++;
    this.state.totalSuccesses++;
    this.lastSuccessTime = new Date();
    
    if (this.state.state === 'HALF_OPEN') {
      // Reset after successful request in half-open state
      this.reset();
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.state.totalFailures++;
    this.lastFailureTime = new Date();

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.openCircuit();
    }
  }

  private shouldOpenCircuit(): boolean {
    // Must have minimum volume
    if (this.totalRequests < this.config.volumeThreshold) {
      return false;
    }

    // Check failure threshold
    const failureRate = (this.failures / this.totalRequests) * 100;
    return failureRate >= this.config.failureThreshold;
  }

  private openCircuit(): void {
    this.state.state = 'OPEN';
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    
    this.resetTimer = setTimeout(() => {
      this.state.state = 'HALF_OPEN';
      console.log(`Circuit breaker ${this.serviceId} transitioning to HALF_OPEN after recovery timeout`);
    }, this.config.recoveryTimeout);

    console.log(`Circuit breaker ${this.serviceId} opened due to high failure rate`);
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }

    const timeSinceFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceFailure >= this.config.recoveryTimeout;
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.updateStats();
    }, this.config.monitoringPeriod);
  }

  private updateStats(): void {
    // Reset counters periodically to prevent memory leaks and get accurate stats
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Only keep stats from the last hour
    if (this.lastFailureTime && (now - this.lastFailureTime.getTime()) > oneHour) {
      this.lastFailureTime = null;
    }

    if (this.lastSuccessTime && (now - this.lastSuccessTime.getTime()) > oneHour) {
      this.lastSuccessTime = null;
    }

    // Reset counters if they get too large
    if (this.totalRequests > 10000) {
      this.totalRequests = Math.floor(this.totalRequests / 2);
      this.failures = Math.floor(this.failures / 2);
      this.successes = Math.floor(this.successes / 2);
      this.state.totalRequests = this.totalRequests;
      this.state.totalFailures = this.failures;
      this.state.totalSuccesses = this.successes;
    }
  }

  dispose(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
}

// Circuit Breaker Manager
export class CircuitBreakerManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  getCircuitBreaker(serviceId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceId)) {
      const circuitBreaker = new CircuitBreaker(serviceId, {
        failureThreshold: gatewayConfig.circuitBreaker.failureThreshold,
        recoveryTimeout: gatewayConfig.circuitBreaker.recoveryTimeout,
        resetTimeout: gatewayConfig.circuitBreaker.resetTimeout,
        monitoringPeriod: gatewayConfig.circuitBreaker.monitoringPeriod,
        volumeThreshold: gatewayConfig.circuitBreaker.volumeThreshold,
      });
      
      this.circuitBreakers.set(serviceId, circuitBreaker);
    }

    return this.circuitBreakers.get(serviceId)!;
  }

  removeCircuitBreaker(serviceId: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceId);
    if (circuitBreaker) {
      circuitBreaker.dispose();
      this.circuitBreakers.delete(serviceId);
    }
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [serviceId, circuitBreaker] of this.circuitBreakers) {
      stats[serviceId] = circuitBreaker.getStats();
    }

    return stats;
  }

  forceOpen(serviceId: string): void {
    const circuitBreaker = this.getCircuitBreaker(serviceId);
    circuitBreaker.forceOpen();
  }

  forceClose(serviceId: string): void {
    const circuitBreaker = this.getCircuitBreaker(serviceId);
    circuitBreaker.forceClosed();
  }

  reset(serviceId: string): void {
    const circuitBreaker = this.getCircuitBreaker(serviceId);
    circuitBreaker.reset();
  }

  dispose(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.dispose();
    }
    this.circuitBreakers.clear();
  }
}

// Export default circuit breaker manager
export const circuitBreakerManager = new CircuitBreakerManager();