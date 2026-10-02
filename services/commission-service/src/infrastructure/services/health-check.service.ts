/**
 * Health Check Service
 * Infrastructure layer for checking service dependencies
 */

import { prisma } from '../database/prisma-client';
import Redis from 'ioredis';
import { eventBus } from '@shared/events/eventBus';

/**
 * `degraded` exists so a dependency can report "not verifiable / not wired"
 * honestly. Before it, the only options were lying (`healthy` for a stub check)
 * or failing the whole service (`unhealthy` for something non-critical).
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
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
   * Check messaging.
   *
   * This platform has no external broker: events are dispatched in-process by
   * the shared `EventBus`. The previous implementation returned
   * `status: 'healthy'` with `connection: 'not_implemented'` - an assertion of
   * a capability that was never tested. It now reports what is actually wired:
   * the live subscription count, and degrades honestly when nothing is
   * subscribed (which means events published by this service go nowhere).
   */
  static async checkMessaging(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const subscriptions = eventBus.getSubscriptionCount();
      const eventTypes = eventBus.getEventTypeCount();
      const deadLetters = eventBus.getDeadLetterCount();
      const latencyMs = Date.now() - startTime;

      if (subscriptions === 0) {
        return {
          status: 'degraded',
          timestamp: new Date(),
          latencyMs,
          details: {
            connection: 'in_process_event_bus',
            subscriptions: 0,
            note: 'In-process event bus has no subscribers; published events would not be handled'
          }
        };
      }

      return {
        status: 'healthy',
        timestamp: new Date(),
        latencyMs,
        details: {
          connection: 'in_process_event_bus',
          subscriptions,
          eventTypes,
          deadLetters
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
   * Check cache by issuing a real PING against Redis.
   *
   * Previously a stub that reported `healthy` with `connection:
   * 'not_implemented'`. When REDIS_URL is configured we now genuinely connect
   * and PING, so a down or unreachable cache surfaces as `unhealthy` instead of
   * a false green. When no cache is configured the status is `degraded` with an
   * explicit note - never a silent "healthy".
   */
  static async checkCache(): Promise<HealthStatus> {
    const startTime = Date.now();
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return {
        status: 'degraded',
        timestamp: new Date(),
        latencyMs: Date.now() - startTime,
        details: {
          connection: 'not_configured',
          note: 'REDIS_URL is not set; no cache is configured for this service'
        }
      };
    }

    let client: Redis | null = null;
    try {
      client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        enableOfflineQueue: false,
      });
      await client.connect();
      const pong = await client.ping();
      const latencyMs = Date.now() - startTime;

      return {
        status: pong === 'PONG' ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        latencyMs,
        details: {
          connection: pong === 'PONG' ? 'successful' : 'unexpected_response',
          type: 'redis',
          response: pong
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        latencyMs: Date.now() - startTime,
        details: {
          connection: 'failed',
          type: 'redis',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    } finally {
      if (client) {
        // ioredis v5 `disconnect()` returns void (it does not await the socket),
        // so it must not be chained as a promise.
        try {
          client.disconnect();
        } catch {
          // A health check must never fail because cleanup failed.
        }
      }
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

    // Determine overall status.
    // Critical dependencies: database.
    // Non-critical: messaging, cache - a `degraded` result (not wired, nothing
    // subscribed, cache not configured) must NOT be reported as a clean
    // "healthy", otherwise the endpoint promises a readiness it cannot prove.
    const criticalDependencies = [database];
    const allDependencies = [database, messaging, cache];

    const hasCriticalFailure = criticalDependencies.some(dep => dep.status === 'unhealthy');
    const hasAnyFailure = allDependencies.some(dep => dep.status === 'unhealthy');
    const hasAnyDegraded = allDependencies.some(dep => dep.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasCriticalFailure) {
      overallStatus = 'unhealthy';
    } else if (hasAnyFailure || hasAnyDegraded) {
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

