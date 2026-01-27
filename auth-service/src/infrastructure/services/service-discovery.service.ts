import { logger } from './logger.service';

/**
 * Service Discovery Service
 * Handles service discovery and health monitoring
 */
export class ServiceDiscoveryService {
  private services: Map<string, { url: string; health: boolean; lastCheck: Date }> = new Map();

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

      // In a real implementation, this would make an HTTP request to check health
      // For now, we'll simulate health checks
      const isHealthy = Math.random() > 0.1; // 90% chance of being healthy

      service.health = isHealthy;
      service.lastCheck = new Date();

      logger.info('Service health check', { service: name, healthy: isHealthy });

      return isHealthy;
    } catch (error) {
      logger.error('ServiceDiscoveryService.checkServiceHealth error', { error, name });
      throw error;
    }
  }

  /**
   * Get all services
   */
  getAllServices(): Array<{ name: string; url: string; health: boolean; lastCheck: Date }> {
    try {
      return Array.from(this.services.entries()).map(([name, service]) => ({
        name,
        url: service.url,
        health: service.health,
        lastCheck: service.lastCheck
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