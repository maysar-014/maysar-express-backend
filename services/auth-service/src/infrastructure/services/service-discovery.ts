import { UserServiceClient, createUserServiceClient } from '../clients/user-service.client';
import { logger } from './logger.service';

/**
 * Service Discovery Configuration
 */
interface ServiceDiscoveryConfig {
  services: {
    userService: {
      urls: string[];
      healthCheckPath: string;
      timeout: number;
    };
  };
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  failureThreshold: number;
  recoveryTimeout: number;
}

/**
 * Service Instance Status
 */
interface ServiceInstance {
  url: string;
  healthy: boolean;
  lastHealthCheck: Date;
  consecutiveFailures: number;
  nextHealthCheck: Date;
}

/**
 * Service Discovery Manager
 * Handles service discovery, health checking, and load balancing
 */
export class ServiceDiscovery {
  private config: ServiceDiscoveryConfig;
  private services: Map<string, ServiceInstance[]> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config?: Partial<ServiceDiscoveryConfig>) {
    const monolithUserBaseUrl = (process.env.PLATFORM_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    this.config = {
      services: {
        userService: {
          urls: [process.env.USER_SERVICE_URL || `${monolithUserBaseUrl}/api/user`],
          healthCheckPath: '/health',
          timeout: 5000
        }
      },
      // In monolith mode, disable background discovery probing unless explicitly enabled.
      enableHealthChecks: process.env.ENABLE_SERVICE_DISCOVERY_HEALTH_CHECKS === 'true',
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      failureThreshold: parseInt(process.env.FAILURE_THRESHOLD || '3'),
      recoveryTimeout: parseInt(process.env.RECOVERY_TIMEOUT || '60000'),
      ...config
    };

    this.initializeServices();
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }
  }

  /**
   * Initialize service instances
   */
  private initializeServices(): void {
    for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
      const instances: ServiceInstance[] = serviceConfig.urls.map(url => ({
        url,
        healthy: true, // Assume healthy initially
        lastHealthCheck: new Date(),
        consecutiveFailures: 0,
        nextHealthCheck: new Date(Date.now() + Math.random() * 5000) // Stagger initial checks
      }));

      this.services.set(serviceName, instances);
      logger.info(`Initialized ${instances.length} instances for ${serviceName}`);
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Perform initial health checks
    setTimeout(() => this.performHealthChecks(), 1000);
  }

  /**
   * Perform health checks on all service instances
   */
  private async performHealthChecks(): Promise<void> {
    const now = Date.now();

    for (const [serviceName, instances] of this.services.entries()) {
      for (const instance of instances) {
        // Skip if next health check is in the future
        if (instance.nextHealthCheck.getTime() > now) {
          continue;
        }

        try {
          const isHealthy = await this.checkServiceHealth(
            instance.url,
            this.config.services[serviceName as keyof typeof this.config.services].healthCheckPath
          );

          instance.lastHealthCheck = new Date();

          if (isHealthy) {
            if (!instance.healthy) {
              logger.info(`Service instance recovered: ${instance.url}`);
            }
            instance.healthy = true;
            instance.consecutiveFailures = 0;
            instance.nextHealthCheck = new Date(now + this.config.healthCheckInterval);
          } else {
            instance.consecutiveFailures++;
            instance.healthy = false;

            if (instance.consecutiveFailures === this.config.failureThreshold) {
              logger.warn(`Service instance marked unhealthy: ${instance.url} (${instance.consecutiveFailures} failures)`);
              instance.nextHealthCheck = new Date(now + this.config.recoveryTimeout);
            } else if (instance.consecutiveFailures > this.config.failureThreshold) {
              instance.nextHealthCheck = new Date(now + this.config.recoveryTimeout);
            } else {
              instance.nextHealthCheck = new Date(now + this.config.healthCheckInterval);
            }
          }
        } catch (error) {
          instance.consecutiveFailures++;
          instance.healthy = false;
          instance.lastHealthCheck = new Date();

          if (instance.consecutiveFailures === this.config.failureThreshold) {
            logger.error(`Service health check failed: ${instance.url}`, { error });
            instance.nextHealthCheck = new Date(now + this.config.recoveryTimeout);
          } else if (instance.consecutiveFailures > this.config.failureThreshold) {
            instance.nextHealthCheck = new Date(now + this.config.recoveryTimeout);
          } else {
            instance.nextHealthCheck = new Date(now + this.config.healthCheckInterval);
          }
        }
      }
    }
  }

  /**
   * Check health of a specific service instance
   */
  private async checkServiceHealth(baseUrl: string, healthPath: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.services.userService.timeout);

      const response = await fetch(`${baseUrl}${healthPath}`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get healthy instance for a service using round-robin load balancing
   */
  private getHealthyInstance(serviceName: string): ServiceInstance | null {
    const instances = this.services.get(serviceName);
    if (!instances) {
      return null;
    }

    // Filter healthy instances
    const healthyInstances = instances.filter(instance => instance.healthy);
    if (healthyInstances.length === 0) {
      return null;
    }

    // Simple round-robin (in production, use more sophisticated load balancing)
    const now = Date.now();
    const index = Math.floor(now / 1000) % healthyInstances.length;
    return healthyInstances[index];
  }

  /**
   * Get User Service client with service discovery
   */
  getUserServiceClient(): UserServiceClient | null {
    const instance = this.getHealthyInstance('userService');
    if (!instance) {
      logger.error('No healthy User Service instances available');
      return null;
    }

    try {
      return createUserServiceClient(instance.url);
    } catch (error) {
      logger.error('Failed to create User Service client', { url: instance.url, error });
      return null;
    }
  }

  /**
   * Get service health status
   */
  getServiceHealth(): Record<string, {
    totalInstances: number;
    healthyInstances: number;
    unhealthyInstances: number;
    instances: Array<{
      url: string;
      healthy: boolean;
      consecutiveFailures: number;
      lastHealthCheck: Date;
    }>;
  }> {
    const status: Record<string, any> = {};

    for (const [serviceName, instances] of this.services.entries()) {
      const healthyInstances = instances.filter(i => i.healthy);
      const unhealthyInstances = instances.filter(i => !i.healthy);

      status[serviceName] = {
        totalInstances: instances.length,
        healthyInstances: healthyInstances.length,
        unhealthyInstances: unhealthyInstances.length,
        instances: instances.map(i => ({
          url: i.url,
          healthy: i.healthy,
          consecutiveFailures: i.consecutiveFailures,
          lastHealthCheck: i.lastHealthCheck
        }))
      };
    }

    return status;
  }

  /**
   * Force health check for all services
   */
  async forceHealthCheck(): Promise<void> {
    await this.performHealthChecks();
  }

  /**
   * Stop service discovery
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    logger.info('Service discovery stopped');
  }
}

/**
 * Global service discovery instance
 */
export const serviceDiscovery = new ServiceDiscovery();

/**
 * Get User Service client with automatic service discovery
 */
export function getUserServiceClient(): UserServiceClient | null {
  return serviceDiscovery.getUserServiceClient();
}

/**
 * Get service discovery health status
 */
export function getServiceDiscoveryHealth() {
  return serviceDiscovery.getServiceHealth();
}
