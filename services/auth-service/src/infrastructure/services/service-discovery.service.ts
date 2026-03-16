import { logger } from './logger.service';
import http from 'http';
import https from 'https';

type HealthCheckResult = { ok: boolean; responseTimeMs: number };
type HealthChecker = (url: string) => Promise<HealthCheckResult>;

const defaultHealthChecker: HealthChecker = async (url: string) => {
  const startTime = Date.now();
  const target = new URL(url);
  const client = target.protocol === 'https:' ? https : http;

  return new Promise<HealthCheckResult>((resolve) => {
    const req = client.request(
      {
        method: 'GET',
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        timeout: 5000
      },
      (res) => {
        res.resume();
        const responseTimeMs = Date.now() - startTime;
        resolve({ ok: (res.statusCode || 500) < 500, responseTimeMs });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      const responseTimeMs = Date.now() - startTime;
      resolve({ ok: false, responseTimeMs });
    });

    req.on('error', () => {
      const responseTimeMs = Date.now() - startTime;
      resolve({ ok: false, responseTimeMs });
    });

    req.end();
  });
};

/**
 * Service Discovery Service
 * Handles service discovery and health monitoring
 */
export class ServiceDiscoveryService {
  private services: Map<string, { url: string; health: boolean; lastCheck: Date; responseTimeMs?: number }> = new Map();

  constructor(private readonly healthChecker: HealthChecker = defaultHealthChecker) {}

  /**
   * Register a service
   */
  registerService(name: string, url: string): void {
    try {
      this.services.set(name, {
        url,
        health: true,
        lastCheck: new Date()
      });

      logger.info('Service registered', { service: name, url });
    } catch (error) {
      logger.error('ServiceDiscoveryService.registerService error', { error, name, url });
      throw error;
    }
  }

  /**
   * Get service URL
   */
  getServiceUrl(name: string): string | null {
    try {
      const service = this.services.get(name);
      if (!service || !service.health) {
        return null;
      }
      return service.url;
    } catch (error) {
      logger.error('ServiceDiscoveryService.getServiceUrl error', { error, name });
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkServiceHealth(name: string): Promise<boolean> {
    try {
      const service = this.services.get(name);
      if (!service) {
        return false;
      }

      const healthUrl = service.url.replace(/\/$/, '') + '/health';
      const result = await this.healthChecker(healthUrl);

      service.health = result.ok;
      service.lastCheck = new Date();
      service.responseTimeMs = result.responseTimeMs;

      logger.info('Service health check', { service: name, healthy: service.health, responseTimeMs: result.responseTimeMs });

      return service.health;
    } catch (error) {
      logger.error('ServiceDiscoveryService.checkServiceHealth error', { error, name });
      throw error;
    }
  }

  /**
   * Get all services
   */
  getAllServices(): Array<{ name: string; url: string; health: boolean; lastCheck: Date; responseTimeMs?: number }> {
    try {
      return Array.from(this.services.entries()).map(([name, service]) => ({
        name,
        url: service.url,
        health: service.health,
        lastCheck: service.lastCheck,
        responseTimeMs: service.responseTimeMs
      }));
    } catch (error) {
      logger.error('ServiceDiscoveryService.getAllServices error', { error });
      throw error;
    }
  }

  /**
   * Refresh service discovery
   */
  async refresh(): Promise<void> {
    try {
      const services = Array.from(this.services.keys());
      await Promise.all(services.map(service => this.checkServiceHealth(service)));

      logger.info('Service discovery refreshed', { serviceCount: services.length });
    } catch (error) {
      logger.error('ServiceDiscoveryService.refresh error', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const serviceDiscovery = new ServiceDiscoveryService();
