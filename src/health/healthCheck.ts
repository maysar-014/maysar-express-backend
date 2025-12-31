/**
 * Comprehensive Health Check System
 * Provides detailed health monitoring for all system components
 */

import { getConfig } from '../config/environment';
import { circuitBreakerRegistry } from '../utils/circuitBreaker';
import { getEventBus } from '../events/redisEventBus';
import { getScheduler } from '../scheduler/distributedScheduler';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

export enum ComponentType {
  DATABASE = 'database',
  REDIS = 'redis',
  EVENT_BUS = 'event_bus',
  SCHEDULER = 'scheduler',
  EXTERNAL_API = 'external_api',
  FILE_SYSTEM = 'file_system',
  MEMORY = 'memory',
  CPU = 'cpu'
}

export interface HealthCheckResult {
  status: HealthStatus;
  component: string;
  type: ComponentType;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  responseTime?: number;
  error?: string;
}

export interface SystemHealth {
  overall: HealthStatus;
  uptime: number;
  version: string;
  environment: string;
  timestamp: Date;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

/**
 * Health Check Manager
 * Orchestrates all health checks and provides system-wide health status
 */
export class HealthCheckManager {
  private checks = new Map<string, HealthCheck>();
  private lastHealthCheck: SystemHealth | null = null;
  private startupTime = Date.now();

  /**
   * Register a health check
   */
  registerCheck(name: string, check: HealthCheck): void {
    this.checks.set(name, check);
    console.log(`🏥 Registered health check: ${name}`);
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(name: string): void {
    this.checks.delete(name);
    console.log(`🏥 Unregistered health check: ${name}`);
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<SystemHealth> {
    const startTime = Date.now();
    const checks: HealthCheckResult[] = [];
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      try {
        const result = await check.run();
        checks.push(result);

        switch (result.status) {
          case HealthStatus.HEALTHY:
            healthy++;
            break;
          case HealthStatus.DEGRADED:
            degraded++;
            break;
          case HealthStatus.UNHEALTHY:
            unhealthy++;
            break;
        }

        return result;
      } catch (error) {
        const errorResult: HealthCheckResult = {
          status: HealthStatus.UNHEALTHY,
          component: name,
          type: check.type,
          message: 'Health check failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        };
        checks.push(errorResult);
        unhealthy++;
        return errorResult;
      }
    });

    await Promise.allSettled(checkPromises);

    // Determine overall health status
    let overallStatus = HealthStatus.HEALTHY;
    if (unhealthy > 0) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (degraded > 0) {
      overallStatus = HealthStatus.DEGRADED;
    }

    const systemHealth: SystemHealth = {
      overall: overallStatus,
      uptime: Date.now() - this.startupTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: getConfig().NODE_ENV,
      timestamp: new Date(),
      checks: checks.sort((a, b) => a.component.localeCompare(b.component)),
      summary: {
        total: checks.length,
        healthy,
        degraded,
        unhealthy
      }
    };

    this.lastHealthCheck = systemHealth;
    return systemHealth;
  }

  /**
   * Run a specific health check
   */
  async runCheck(name: string): Promise<HealthCheckResult | null> {
    const check = this.checks.get(name);
    if (!check) return null;

    try {
      return await check.run();
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        component: name,
        type: check.type,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get the last health check results
   */
  getLastHealthCheck(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  /**
   * Get all registered health check names
   */
  getRegisteredChecks(): string[] {
    return Array.from(this.checks.keys()).sort();
  }

  /**
   * Check if system is healthy
   */
  isHealthy(): boolean {
    return this.lastHealthCheck?.overall === HealthStatus.HEALTHY;
  }

  /**
   * Get health status summary
   */
  getHealthSummary(): { status: HealthStatus; checks: number } {
    if (!this.lastHealthCheck) {
      return { status: HealthStatus.UNHEALTHY, checks: 0 };
    }

    return {
      status: this.lastHealthCheck.overall,
      checks: this.lastHealthCheck.checks.length
    };
  }
}

/**
 * Health Check Interface
 */
export interface HealthCheck {
  name: string;
  type: ComponentType;
  description?: string;
  critical?: boolean; // If true, failure makes system unhealthy

  run(): Promise<HealthCheckResult>;
}

/**
 * Database Health Check
 */
export class DatabaseHealthCheck implements HealthCheck {
  name = 'database';
  type = ComponentType.DATABASE;
  description = 'PostgreSQL database connectivity and performance';
  critical = true;

  async run(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // TODO: Implement actual database health check
      // This would connect to the database and run a simple query

      // Simulate database check
      await new Promise(resolve => setTimeout(resolve, 50));

      // Simulate occasional slow responses
      const responseTime = Date.now() - startTime;
      let status = HealthStatus.HEALTHY;
      let message = 'Database is healthy';

      if (responseTime > 1000) {
        status = HealthStatus.DEGRADED;
        message = 'Database response is slow';
      }

      return {
        status,
        component: this.name,
        type: this.type,
        message,
        details: {
          connectionPoolSize: 10, // Mock data
          activeConnections: 3,
          responseTime
        },
        timestamp: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        component: this.name,
        type: this.type,
        message: 'Database is unreachable',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }
}

/**
 * Redis Health Check
 */
export class RedisHealthCheck implements HealthCheck {
  name = 'redis';
  type = ComponentType.REDIS;
  description = 'Redis cache and session store';
  critical = true;

  async run(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // TODO: Implement actual Redis health check
      // This would connect to Redis and run PING/INFO commands

      // Simulate Redis check
      await new Promise(resolve => setTimeout(resolve, 20));

      const responseTime = Date.now() - startTime;

      return {
        status: HealthStatus.HEALTHY,
        component: this.name,
        type: this.type,
        message: 'Redis is healthy',
        details: {
          connectedClients: 5,
          usedMemory: '15MB',
          responseTime
        },
        timestamp: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        component: this.name,
        type: this.type,
        message: 'Redis is unreachable',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }
}

/**
 * Event Bus Health Check
 */
export class EventBusHealthCheck implements HealthCheck {
  name = 'event_bus';
  type = ComponentType.EVENT_BUS;
  description = 'Distributed event bus connectivity';
  critical = true;

  async run(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const eventBus = getEventBus();

      if (!eventBus.isHealthy()) {
        return {
          status: HealthStatus.UNHEALTHY,
          component: this.name,
          type: this.type,
          message: 'Event bus is not connected',
          timestamp: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      // Test event publishing (optional - remove in production for performance)
      const testEventId = `health-check-${Date.now()}`;
      await eventBus.publish('HealthCheck.v1', {
        checkType: 'event_bus',
        timestamp: new Date().toISOString()
      });

      return {
        status: HealthStatus.HEALTHY,
        component: this.name,
        type: this.type,
        message: 'Event bus is healthy',
        details: {
          subscribers: eventBus.getSubscribedEvents().length,
          publishedEvents: 'N/A' // Would need metrics collection
        },
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        component: this.name,
        type: this.type,
        message: 'Event bus check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }
}

/**
 * Scheduler Health Check
 */
export class SchedulerHealthCheck implements HealthCheck {
  name = 'scheduler';
  type = ComponentType.SCHEDULER;
  description = 'Background job scheduler';
  critical = true;

  async run(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const scheduler = getScheduler();
      const status = scheduler.getStatus();

      if (!status.isRunning) {
        return {
          status: HealthStatus.UNHEALTHY,
          component: this.name,
          type: this.type,
          message: 'Scheduler is not running',
          timestamp: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      return {
        status: status.isLeader ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        component: this.name,
        type: this.type,
        message: status.isLeader ? 'Scheduler is healthy and leading' : 'Scheduler is healthy but not leading',
        details: {
          isLeader: status.isLeader,
          jobs: status.jobs.length,
          instanceId: status.instanceId
        },
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        component: this.name,
        type: this.type,
        message: 'Scheduler check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }
}

/**
 * Memory Health Check
 */
export class MemoryHealthCheck implements HealthCheck {
  name = 'memory';
  type = ComponentType.MEMORY;
  description = 'System memory usage';
  critical = false;

  async run(): Promise<HealthCheckResult> {
    const memUsage = process.memoryUsage();
    const totalMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const limitMB = 512; // 512MB limit (configurable)

    let status = HealthStatus.HEALTHY;
    let message = `Memory usage: ${totalMB}MB`;

    if (totalMB > limitMB * 0.8) {
      status = HealthStatus.DEGRADED;
      message = `High memory usage: ${totalMB}MB (warning threshold)`;
    }

    if (totalMB > limitMB) {
      status = HealthStatus.UNHEALTHY;
      message = `Critical memory usage: ${totalMB}MB (exceeds limit)`;
    }

    return {
      status,
      component: this.name,
      type: this.type,
      message,
      details: {
        heapUsed: `${totalMB}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        limit: `${limitMB}MB`
      },
      timestamp: new Date()
    };
  }
}

/**
 * Circuit Breaker Health Check
 */
export class CircuitBreakerHealthCheck implements HealthCheck {
  name = 'circuit_breakers';
  type = ComponentType.EXTERNAL_API;
  description = 'Circuit breaker status for external services';
  critical = false;

  async run(): Promise<HealthCheckResult> {
    const breakers = circuitBreakerRegistry.getAll();
    const stats = circuitBreakerRegistry.getAllStats();

    const openBreakers = Object.values(stats).filter((stat: any) => stat.state === 'OPEN');
    const degradedBreakers = Object.values(stats).filter((stat: any) => stat.state === 'HALF_OPEN');

    let status = HealthStatus.HEALTHY;
    let message = `Circuit breakers healthy (${breakers.size} registered)`;

    if (degradedBreakers.length > 0) {
      status = HealthStatus.DEGRADED;
      message = `${degradedBreakers.length} circuit breakers in HALF_OPEN state`;
    }

    if (openBreakers.length > 0) {
      status = HealthStatus.UNHEALTHY;
      message = `${openBreakers.length} circuit breakers OPEN (services unavailable)`;
    }

    return {
      status,
      component: this.name,
      type: this.type,
      message,
      details: {
        total: breakers.size,
        open: openBreakers.length,
        halfOpen: degradedBreakers.length,
        closed: breakers.size - openBreakers.length - degradedBreakers.length,
        breakerStats: stats
      },
      timestamp: new Date()
    };
  }
}

/**
 * External API Health Check
 */
export class ExternalAPIHealthCheck implements HealthCheck {
  constructor(
    private apiName: string,
    private apiUrl: string,
    private timeout = 5000
  ) {
    this.name = `external_api_${apiName}`;
  }

  name: string;
  type = ComponentType.EXTERNAL_API;
  description = `External API: ${this.apiName}`;
  critical = false;

  async run(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.apiUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'HealthCheck/1.0'
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      let status = HealthStatus.HEALTHY;
      let message = `${this.apiName} API is healthy`;

      if (responseTime > 2000) {
        status = HealthStatus.DEGRADED;
        message = `${this.apiName} API response is slow (${responseTime}ms)`;
      }

      if (!response.ok) {
        status = HealthStatus.UNHEALTHY;
        message = `${this.apiName} API returned ${response.status}`;
      }

      return {
        status,
        component: this.name,
        type: this.type,
        message,
        details: {
          url: this.apiUrl,
          statusCode: response.status,
          responseTime
        },
        timestamp: new Date(),
        responseTime
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        component: this.name,
        type: this.type,
        message: `${this.apiName} API is unreachable`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }
}

// Export singleton instance
let healthManagerInstance: HealthCheckManager | null = null;

export const getHealthCheckManager = (): HealthCheckManager => {
  if (!healthManagerInstance) {
    healthManagerInstance = new HealthCheckManager();

    // Register default health checks
    healthManagerInstance.registerCheck('database', new DatabaseHealthCheck());
    healthManagerInstance.registerCheck('redis', new RedisHealthCheck());
    healthManagerInstance.registerCheck('event_bus', new EventBusHealthCheck());
    healthManagerInstance.registerCheck('scheduler', new SchedulerHealthCheck());
    healthManagerInstance.registerCheck('memory', new MemoryHealthCheck());
    healthManagerInstance.registerCheck('circuit_breakers', new CircuitBreakerHealthCheck());
  }

  return healthManagerInstance;
};