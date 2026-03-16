import os from 'os';
import { Auth_UserStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma-client';
import { logger } from '../../infrastructure/services/logger.service';
import { serviceDiscovery } from '../../infrastructure/services/service-discovery.service';

/**
 * System Service
 * Handles system health monitoring and statistics
 */
export class SystemService {
  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<any> {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const usedMemory = memoryUsage.rss;
      const usedPercent = totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0;
      const cpuLoad = os.loadavg()[0];
      const cores = os.cpus().length;

      const [activeUsers, activeSessions] = await prisma.$transaction([
        prisma.user.count({ where: { status: Auth_UserStatus.ACTIVE } }),
        prisma.session.count({ where: { expiresAt: { gt: new Date() } } })
      ]);

      return {
        uptime: process.uptime(),
        memory: {
          usedBytes: usedMemory,
          totalBytes: totalMemory,
          usedPercent
        },
        cpu: {
          loadAverage: cpuLoad,
          cores
        },
        activeUsers,
        activeSessions,
        requestsPerSecond: 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('SystemService.getSystemStats error', { error });
      throw error;
    }
  }

  /**
   * Get service health overview
   */
  async getServiceHealth(): Promise<any> {
    try {
      const services = serviceDiscovery.getAllServices();
      const overallStatus = services.length === 0
        ? 'unknown'
        : (services.every(service => service.health) ? 'healthy' : 'degraded');

      return {
        services: services.map(service => ({
          name: service.name,
          status: service.health ? 'healthy' : 'unhealthy',
          responseTimeMs: service.responseTimeMs,
          lastCheck: service.lastCheck
        })),
        overallStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('SystemService.getServiceHealth error', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const systemService = new SystemService();
