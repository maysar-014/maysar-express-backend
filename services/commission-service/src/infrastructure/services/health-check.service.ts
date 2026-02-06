/**
 * Health Check Service
 * Infrastructure layer for checking service dependencies
 */

import { prisma } from '../database/prisma-client';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  latencyMs?: number;
  details?: Record<string, any>;
}

export interface AggregateHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: Date;
  uptime: string;
  dependencies: {
    database: HealthStatus;
    messaging: HealthStatus;
    cache: HealthStatus;
  };
}

export class HealthCheckService {
  /**
   * Check database connectivity with latency measurement
   */
  static async checkDatabase(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Simple query to test database connection
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - startTime;

      return {
        status: 'healthy',
        timestamp: new Date(),
        latencyMs,
        details: {
          connection: 'successful',
          type: 'postgresql'
        }
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        latencyMs,
        details: {
          connection: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Check messaging system (Kafka/Redis)
   */
  static async checkMessaging(): Promise<HealthStatus> {
    try {
      // TODO: Implement actual messaging health check when fully implemented
      // For now, return healthy as messaging is not yet fully implemented
      // In production, this would check Kafka broker connectivity
      return {
        status: 'healthy',
        timestamp: new Date(),
        details: {
          connection: 'not_implemented',
          note: 'Messaging health check not yet implemented - stub only'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        details: {
          connection: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Check cache system (Redis)
   */
  static async checkCache(): Promise<HealthStatus> {
    try {
      // TODO: Implement actual cache health check when implemented
      // For now, return healthy as cache is not yet implemented
      // In production, this would check Redis connectivity with PING command
      return {
        status: 'healthy',
        timestamp: new Date(),
        details: {
          connection: 'not_implemented',
          note: 'Cache health check not yet implemented - stub only'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        details: {
          connection: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Run all health checks and aggregate results
   */
  static async checkAll(): Promise<AggregateHealthStatus> {
    const [database, messaging, cache] = await Promise.all([
      this.checkDatabase(),
      this.checkMessaging(),
      this.checkCache()
    ]);

    // Determine overall status
    // Critical dependencies: database
    // Non-critical: messaging, cache (stubs)
    const criticalDependencies = [database];
    const allDependencies = [database, messaging, cache];

    const hasCriticalFailure = criticalDependencies.some(dep => dep.status === 'unhealthy');
    const hasAnyFailure = allDependencies.some(dep => dep.status === 'unhealthy');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasCriticalFailure) {
      overallStatus = 'unhealthy';
    } else if (hasAnyFailure) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      service: 'commission-service',
      timestamp: new Date(),
      uptime: `${Math.floor(process.uptime())}s`,
      dependencies: {
        database,
        messaging,
        cache
      }
    };
  }

  /**
   * Check readiness - critical dependencies only
   */
  static async checkReadiness(): Promise<{ ready: boolean; checks: Record<string, HealthStatus> }> {
    const database = await this.checkDatabase();

    const ready = database.status === 'healthy';

    return {
      ready,
      checks: {
        database
      }
    };
  }

  /**
   * Check liveness - basic process health
   */
  static checkLiveness(): { alive: boolean; uptime: string; memory: any } {
    const memUsage = process.memoryUsage();

    return {
      alive: true,
      uptime: `${Math.floor(process.uptime())}s`,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
      }
    };
  }
}

