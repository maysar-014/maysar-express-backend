// @ts-nocheck
/**
 * Health Check Service Implementation
 * Infrastructure layer system health monitoring and diagnostics
 * Comprehensive health checks across all service components
 */

import { ProviderManager, ProviderHealthCheck, ProviderMetrics } from '../providers';
import { CacheService } from '../../domain/interfaces';
import { CacheProviderFactory } from '../providers/cache-provider';
import { CacheServiceFactory } from './cache.service';
import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '@shared/database/prisma-client';
import { getSharedRedisClient } from '@shared/redis/ioredis-client';
import { Kafka } from 'kafkajs';

/**
 * Health Status Types
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

/**
 * Component Health Check Result
 */
export interface ComponentHealthResult {
  name: string;
  status: HealthStatus;
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * System Health Check Result
 */
export interface SystemHealthResult {
  status: HealthStatus;
  uptime: number;
  timestamp: Date;
  version: string;
  environment: string;
  components: ComponentHealthResult[];
  metrics: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

/**
 * Health Check Configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  failureThreshold: number;
  recoveryThreshold: number;
  components: {
    database: boolean;
    cache: boolean;
    search: boolean;
    messaging: boolean;
    externalApis: boolean;
  };
}

/**
 * Default Health Check Configuration
 */
export const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  enabled: true,
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  failureThreshold: 3,
  recoveryThreshold: 2,
  components: {
    database: true,
    cache: true,
    search: true,
    messaging: true,
    externalApis: true
  }
};

/**
 * Health Check Service
 * Comprehensive system health monitoring
 */
export class HealthCheckService {
  private static instance: HealthCheckService | null = null;
  private config: HealthCheckConfig;
  private componentStates = new Map<string, ComponentHealthResult>();
  private failureCounts = new Map<string, number>();
  private startTime: Date;
  private checkInterval?: NodeJS.Timeout;
  private metrics = {
    totalChecks: 0,
    failedChecks: 0,
    lastCheckTime: new Date(),
    averageResponseTime: 0
  };
  private lastHealthStatus: SystemHealthResult | null = null;

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...DEFAULT_HEALTH_CHECK_CONFIG, ...config };
    this.startTime = new Date();
    this.prisma = createPrismaClient();
  }

  private prisma: PrismaClient;

  static create(config: Partial<HealthCheckConfig> = {}): HealthCheckService {
    return new HealthCheckService(config);
  }

  static getInstance(): HealthCheckService | null {
    return HealthCheckService.instance;
  }

  static setInstance(service: HealthCheckService): void {
    if (HealthCheckService.instance) {
      throw new Error('Health check service instance already exists');
    }
    HealthCheckService.instance = service;
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(): void {
    if (!this.config.enabled || this.checkInterval) {
      return;
    }

    console.log(`Starting periodic health checks every ${this.config.interval}ms`);

    this.checkInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, this.config.interval);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      console.log('Stopped periodic health checks');
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealthResult> {
    const startTime = Date.now();
    const components: ComponentHealthResult[] = [];

    // Check all enabled components
    const componentChecks = [];

    if (this.config.components.database) {
      componentChecks.push(this.checkDatabase());
    }

    if (this.config.components.cache) {
      componentChecks.push(this.checkCache());
    }

    if (this.config.components.search) {
      componentChecks.push(this.checkSearch());
    }

    if (this.config.components.messaging) {
      componentChecks.push(this.checkMessaging());
    }

    if (this.config.components.externalApis) {
      componentChecks.push(this.checkExternalApis());
    }

    // Execute all checks with timeout
    const results = await Promise.allSettled(
      componentChecks.map(check =>
        Promise.race([
          check,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout)
          )
        ])
      )
    );

    // Process results
    results.forEach((result, index) => {
      const componentName = this.getComponentName(index);
      if (result.status === 'fulfilled') {
        components.push(result.value);
        this.updateComponentState(result.value);
      } else {
        const failedResult: ComponentHealthResult = {
          name: componentName,
          status: HealthStatus.UNHEALTHY,
          responseTime: this.config.timeout,
          message: result.reason?.message || 'Health check failed',
          timestamp: new Date()
        };
        components.push(failedResult);
        this.updateComponentState(failedResult);
      }
    });

    const responseTime = Date.now() - startTime;
    const status = this.determineOverallStatus(components);

    // Update metrics
    this.updateMetrics(components, responseTime);

    const result: SystemHealthResult = {
      status,
      uptime: Date.now() - this.startTime.getTime(),
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      components,
      metrics: {
        totalRequests: this.metrics.totalChecks,
        errorRate: this.metrics.totalChecks > 0 ? this.metrics.failedChecks / this.metrics.totalChecks : 0,
        averageResponseTime: this.metrics.averageResponseTime
      }
    };

    this.lastHealthStatus = result;
    return result;
  }

  // Legacy compatibility alias.
  async checkExternalServices(): Promise<ComponentHealthResult> {
    return this.checkExternalApis();
  }

  // Legacy health status shape retained for older tests/callers.
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'error';
    services: {
      database: ComponentHealthResult;
      cache: ComponentHealthResult;
      externalServices: ComponentHealthResult;
    };
  }> {
    const database = await this.checkDatabase();
    const cache = await this.checkCache();
    const externalServices = await this.checkExternalServices();
    const components = [database, cache, externalServices];
    const hasError = components.some((component) =>
      component.status === HealthStatus.UNHEALTHY || component.status === ('error' as unknown as HealthStatus)
    );
    const hasDegraded = components.some((component) => component.status === HealthStatus.DEGRADED);

    return {
      status: hasError ? 'error' : hasDegraded ? 'degraded' : 'healthy',
      services: {
        database,
        cache,
        externalServices
      }
    };
  }

  /**
   * Get cached health status
   */
  getCachedHealthStatus(): SystemHealthResult | null {
    return this.lastHealthStatus;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ComponentHealthResult> {
    const startTime = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      let poolMetrics: any = undefined;
      if ((this.prisma as any).$metrics) {
        try {
          poolMetrics = await (this.prisma as any).$metrics();
        } catch {
          poolMetrics = undefined;
        }
      }

      return {
        name: 'database',
        status: HealthStatus.HEALTHY,
        responseTime: Date.now() - startTime,
        message: 'Database connection healthy',
        details: {
          metrics: poolMetrics
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        message: `Database check failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check cache service
   */
  private async checkCache(): Promise<ComponentHealthResult> {
    const startTime = Date.now();

    try {
      const redis = getSharedRedisClient();
      await redis.ping();
      const cache = await this.getCacheInstance();
      if (cache) {
        await cache.set('health-check', 'ok', 10);
        const value = await cache.get('health-check');
        if (value !== 'ok') {
          throw new Error('Cache read/write test failed');
        }
      }

      return {
        name: 'cache',
        status: HealthStatus.HEALTHY,
        responseTime: Date.now() - startTime,
        message: 'Cache service healthy',
        details: {
          type: 'redis',
          connected: true
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'cache',
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        message: `Cache check failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check search service
   */
  private async checkSearch(): Promise<ComponentHealthResult> {
    const startTime = Date.now();

    try {
      // In a real implementation, this would check search service
      const providerHealth = await ProviderManager.getInstance().getHealthCheck();

      return {
        name: 'search',
        status: providerHealth.providers.search.status === 'up' ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        message: providerHealth.providers.search.status === 'up' ? 'Search service healthy' : 'Search service unavailable',
        details: {
          lastQueryTime: providerHealth.providers.search.lastQueryTime
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'search',
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        message: `Search check failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check messaging system
   */
  private async checkMessaging(): Promise<ComponentHealthResult> {
    const startTime = Date.now();

    try {
      if (process.env.KAFKA_BROKERS) {
        const kafka = new Kafka({
          clientId: 'catalog-service-healthcheck',
          brokers: process.env.KAFKA_BROKERS.split(',')
        });
        const admin = kafka.admin();
        await admin.connect();
        await admin.listTopics();
        await admin.disconnect();
      } else {
        const redis = getSharedRedisClient();
        await redis.ping();
      }

      return {
        name: 'messaging',
        status: HealthStatus.HEALTHY,
        responseTime: Date.now() - startTime,
        message: 'Messaging system healthy',
        details: {
          type: process.env.KAFKA_BROKERS ? 'kafka' : 'redis',
          connected: true
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'messaging',
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        message: `Messaging check failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check external APIs
   */
  private async checkExternalApis(): Promise<ComponentHealthResult> {
    const startTime = Date.now();

    try {
      // Get provider health check
      const providerHealth = await ProviderManager.getInstance().getHealthCheck();

      // Determine overall external API health
      const externalServices = [
        providerHealth.providers.cache,
        providerHealth.providers.search,
        providerHealth.providers.inventory,
        providerHealth.providers.fileStorage
      ];

      const healthyCount = externalServices.filter(s => s.status === 'up').length;
      const totalCount = externalServices.length;
      const healthRatio = healthyCount / totalCount;

      let status = HealthStatus.HEALTHY;
      if (healthRatio < 0.5) {
        status = HealthStatus.UNHEALTHY;
      } else if (healthRatio < 0.8) {
        status = HealthStatus.DEGRADED;
      }

      return {
        name: 'external-apis',
        status,
        responseTime: Date.now() - startTime,
        message: `${healthyCount}/${totalCount} external services healthy`,
        details: {
          healthyServices: healthyCount,
          totalServices: totalCount,
          healthRatio
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'external-apis',
        status: HealthStatus.UNHEALTHY,
        responseTime: Date.now() - startTime,
        message: `External API check failed: ${(error as Error).message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Update component state and handle failure/recovery logic
   */
  private updateComponentState(result: ComponentHealthResult): void {
    const previousState = this.componentStates.get(result.name);
    const failureCount = this.failureCounts.get(result.name) || 0;

    if (result.status === HealthStatus.UNHEALTHY) {
      this.failureCounts.set(result.name, failureCount + 1);
    } else {
      // Reset failure count on success
      this.failureCounts.set(result.name, 0);
    }

    this.componentStates.set(result.name, result);

    // Log state changes
    if (previousState?.status !== result.status) {
      console.log(`Component ${result.name} health status changed: ${previousState?.status} -> ${result.status}`);
    }
  }

  /**
   * Determine overall system health status
   */
  private determineOverallStatus(components: ComponentHealthResult[]): HealthStatus {
    const unhealthyCount = components.filter(c => c.status === HealthStatus.UNHEALTHY).length;
    const degradedCount = components.filter(c => c.status === HealthStatus.DEGRADED).length;

    if (unhealthyCount > 0) {
      return HealthStatus.UNHEALTHY;
    } else if (degradedCount > 0) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Update service metrics
   */
  private updateMetrics(components: ComponentHealthResult[], responseTime: number): void {
    this.metrics.totalChecks++;
    this.metrics.lastCheckTime = new Date();

    const failedComponents = components.filter(c => c.status === HealthStatus.UNHEALTHY);
    this.metrics.failedChecks += failedComponents.length > 0 ? 1 : 0;

    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalChecks - 1) + responseTime) / this.metrics.totalChecks;
  }

  /**
   * Get component name by index
   */
  private getComponentName(index: number): string {
    const components = ['database', 'cache', 'search', 'messaging', 'external-apis'];
    return components[index] || `component-${index}`;
  }

  /**
   * Get cache instance (helper method)
   */
  private async getCacheInstance(): Promise<CacheService | null> {
    const serviceInstance = CacheServiceFactory.getInstance();
    if (serviceInstance) {
      return serviceInstance;
    }

    const providerInstance = CacheProviderFactory.getInstance();
    if (providerInstance) {
      return providerInstance as CacheService;
    }

    return null;
  }

  /**
   * Get health check metrics
   */
  getMetrics(): {
    totalChecks: number;
    failedChecks: number;
    successRate: number;
    averageResponseTime: number;
    lastCheckTime: Date;
    componentStates: Record<string, ComponentHealthResult>;
  } {
    const successRate = this.metrics.totalChecks > 0
      ? (this.metrics.totalChecks - this.metrics.failedChecks) / this.metrics.totalChecks
      : 1;

    return {
      totalChecks: this.metrics.totalChecks,
      failedChecks: this.metrics.failedChecks,
      successRate,
      averageResponseTime: this.metrics.averageResponseTime,
      lastCheckTime: this.metrics.lastCheckTime,
      componentStates: Object.fromEntries(this.componentStates)
    };
  }

  /**
   * Force component status (for testing)
   */
  forceComponentStatus(componentName: string, status: HealthStatus): void {
    const result: ComponentHealthResult = {
      name: componentName,
      status,
      responseTime: 0,
      message: `Forced status: ${status}`,
      timestamp: new Date()
    };
    this.updateComponentState(result);
  }

  /**
   * Reset all failure counts
   */
  resetFailureCounts(): void {
    this.failureCounts.clear();
  }
}

/**
 * Health Check Factory
 */
export class HealthCheckFactory {
  private static instance: HealthCheckService | null = null;

  static create(config: Partial<HealthCheckConfig> = {}): HealthCheckService {
    return new HealthCheckService(config);
  }

  static getInstance(): HealthCheckService | null {
    return this.instance;
  }

  static setInstance(service: HealthCheckService): void {
    if (this.instance) {
      throw new Error('Health check service instance already exists');
    }
    this.instance = service;
  }
}

/**
 * Health Check Middleware
 * Express middleware for health check endpoints
 */
export class HealthCheckMiddleware {
  constructor(private healthCheckService: HealthCheckService) {}

  /**
   * Health check endpoint handler
   */
  async handleHealthCheck(req: any, res: any): Promise<void> {
    try {
      const result = await this.healthCheckService.performHealthCheck();

      const statusCode = result.status === HealthStatus.HEALTHY ? 200
                        : result.status === HealthStatus.DEGRADED ? 200
                        : 503;

      res.status(statusCode).json({
        status: result.status,
        uptime: result.uptime,
        timestamp: result.timestamp,
        version: result.version,
        environment: result.environment,
        components: result.components.map(c => ({
          name: c.name,
          status: c.status,
          responseTime: c.responseTime,
          message: c.message
        })),
        metrics: result.metrics
      });
    } catch (error) {
      res.status(503).json({
        status: HealthStatus.UNHEALTHY,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Detailed health check endpoint handler
   */
  async handleDetailedHealthCheck(req: any, res: any): Promise<void> {
    try {
      const result = await this.healthCheckService.performHealthCheck();

      res.json(result);
    } catch (error) {
      res.status(503).json({
        status: HealthStatus.UNHEALTHY,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Readiness check (for Orchestrator)
   */
  async handleReadinessCheck(req: any, res: any): Promise<void> {
    try {
      const result = await this.healthCheckService.performHealthCheck();

      // Readiness requires all critical components to be healthy
      const criticalComponents = ['database', 'cache'];
      const criticalHealthy = criticalComponents.every(compName =>
        result.components.find(c => c.name === compName)?.status === HealthStatus.HEALTHY
      );

      if (criticalHealthy) {
        res.status(200).json({ status: 'ready' });
      } else {
        res.status(503).json({ status: 'not ready' });
      }
    } catch (error) {
      res.status(503).json({ status: 'not ready', error: (error as Error).message });
    }
  }

  /**
   * Liveness check (for Orchestrator)
   */
  async handleLivenessCheck(req: any, res: any): Promise<void> {
    // Liveness is simpler - just check if the process is running
    res.status(200).json({
      status: 'alive',
      timestamp: new Date(),
      uptime: Date.now() - this.healthCheckService['startTime'].getTime()
    });
  }
}

/**
 * Health Alert System
 * Notifies when health status changes
 */
export class HealthAlertSystem {
  private alerts: Array<{
    component: string;
    status: HealthStatus;
    timestamp: Date;
    message: string;
  }> = [];
  private subscribers: Array<(alert: any) => void> = [];

  /**
   * Subscribe to health alerts
   */
  subscribe(callback: (alert: any) => void): () => void {
    this.subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Publish health alert
   */
  publishAlert(component: string, status: HealthStatus, message: string): void {
    const alert = {
      component,
      status,
      timestamp: new Date(),
      message
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Health alert subscriber error:', error);
      }
    });
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): any[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }
}

/**
 * Global Health Alert System Instance
 */
export const globalHealthAlertSystem = new HealthAlertSystem();
