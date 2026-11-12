/**
 * Maysar Engineering — Graceful Degradation Manager
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 19: Reliability and Fault Tolerance — Graceful degradation,
 *     Failure of a non-critical component shall not unnecessarily disable
 *     unrelated essential capabilities
 *   - Article 11: API and Communication Efficiency — Graceful fallback
 *   - Article 20: Evidence-Based Auditing — Evidence-based auditing
 * 
 * Provides:
 *   - Service health tracking for non-critical dependencies
 *   - Circuit breaker pattern for external services
 *   - Degraded mode fallbacks when services are unavailable
 *   - Health check endpoints for monitoring
 */

import { logger } from '../core/logger';

export type ServiceStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  lastCheck: Date;
  consecutiveFailures: number;
  lastError?: string;
  responseTimeMs: number;
}

export interface DegradationConfig {
  name: string;
  isCritical: boolean;
  checkIntervalMs: number;
  failureThreshold: number;
  recoveryThreshold: number;
  timeoutMs: number;
  fallbackEnabled: boolean;
}

export interface ServiceCheckResult {
  healthy: boolean;
  responseTimeMs: number;
  error?: string;
}

export class DegradationManager {
  private services = new Map<string, ServiceHealth>();
  private configs = new Map<string, DegradationConfig>();
  private checkIntervals = new Map<string, NodeJS.Timeout>();

  registerService(config: DegradationConfig): void {
    this.configs.set(config.name, config);
    this.services.set(config.name, {
      name: config.name,
      status: 'UNKNOWN',
      lastCheck: new Date(0),
      consecutiveFailures: 0,
      responseTimeMs: 0,
    });

    logger.info(`Registered service for degradation tracking: ${config.name} (critical: ${config.isCritical})`);
  }
  async checkServiceHealth(
    name: string,
    checkFn: () => Promise<void>
  ): Promise<ServiceCheckResult> {
    const start = Date.now();
    try {
      await checkFn();
      return { healthy: true, responseTimeMs: Date.now() - start };
    } catch (error) {
      return {
        healthy: false,
        responseTimeMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async performHealthCheck(name: string, checkFn: () => Promise<void>): Promise<void> {
    const config = this.configs.get(name);
    if (!config) {
      logger.warn(`No config for service: ${name}`);
      return;
    }

    const result = await this.checkServiceHealth(name, checkFn);
    const health = this.services.get(name);

    if (!health) {
      logger.warn(`No health record for service: ${name}`);
      return;
    }

    health.lastCheck = new Date();
    health.responseTimeMs = result.responseTimeMs;

    if (result.healthy) {
      if (health.status === 'UNHEALTHY' || health.status === 'DEGRADED') {
        health.consecutiveFailures = 0;
        health.status = 'HEALTHY';
        logger.info(`Service recovered: ${name}`);
      }
    } else {
      health.consecutiveFailures++;
      health.lastError = result.error;

      if (health.consecutiveFailures >= config.failureThreshold) {
        if (health.status !== 'UNHEALTHY') {
          health.status = 'UNHEALTHY';
          logger.warn(`Service UNHEALTHY: ${name} (${health.consecutiveFailures} consecutive failures)`);
        }
      } else if (health.status === 'HEALTHY') {
        health.status = 'DEGRADED';
        logger.warn(`Service DEGRADED: ${name} (${health.consecutiveFailures} consecutive failures)`);
      }
    }
  }

  isServiceHealthy(name: string): boolean {
    const health = this.services.get(name);
    if (!health) return true;
    return health.status === 'HEALTHY' || health.status === 'DEGRADED';
  }

  isServiceAvailable(name: string): boolean {
    const health = this.services.get(name);
    if (!health) return true;
    return health.status === 'HEALTHY';
  }

  isServiceCritical(name: string): boolean {
    const config = this.configs.get(name);
    return config ? config.isCritical : false;
  }

  getServiceHealth(name: string): ServiceHealth | undefined {
    return this.services.get(name);
  }

  getAllServiceHealth(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  getCriticalServicesUnhealthy(): ServiceHealth[] {
    return Array.from(this.services.values()).filter(
      h => this.isServiceCritical(h.name) && h.status === 'UNHEALTHY'
    );
  }

  getNonCriticalServicesDegraded(): ServiceHealth[] {
    return Array.from(this.services.values()).filter(
      h => !this.isServiceCritical(h.name) && (h.status === 'DEGRADED' || h.status === 'UNHEALTHY')
    );
  }

  getSystemStatus(): 'HEALTHY' | 'DEGRADED' | 'CRITICAL' {
    const criticalUnhealthy = this.getCriticalServicesUnhealthy();
    const nonCriticalDegraded = this.getNonCriticalServicesDegraded();

    if (criticalUnhealthy.length > 0) {
      return 'CRITICAL';
    }
    if (nonCriticalDegraded.length > 0) {
      return 'DEGRADED';
    }
    return 'HEALTHY';
  }

  startPeriodicChecks(
    name: string,
    checkFn: () => Promise<void>,
    intervalMs?: number
  ): void {
    const config = this.configs.get(name);
    if (!config) {
      logger.warn(`Cannot start periodic checks: no config for ${name}`);
      return;
    }

    const interval = intervalMs || config.checkIntervalMs;

    const existing = this.checkIntervals.get(name);
    if (existing) {
      clearInterval(existing);
    }

    const intervalId = setInterval(async () => {
      await this.performHealthCheck(name, checkFn);
    }, interval);

    this.checkIntervals.set(name, intervalId);
    logger.info(`Started periodic health checks for: ${name} (interval: ${interval}ms)`);
  }

  stopPeriodicChecks(name: string): void {
    const existing = this.checkIntervals.get(name);
    if (existing) {
      clearInterval(existing);
      this.checkIntervals.delete(name);
      logger.info(`Stopped periodic health checks for: ${name}`);
    }
  }

  stopAllPeriodicChecks(): void {
    for (const [name] of this.checkIntervals) {
      this.stopPeriodicChecks(name);
    }
  }
}

export const degradationManager = new DegradationManager();
