/**
 * Production Infrastructure Monitoring
 *
 * Constitution Section 8: Infrastructure Isolation Rule
 * Provides centralized monitoring for circuit breakers, external APIs, and system health
 */

import { circuitBreakerRegistry, CircuitBreakerMetrics } from './circuit-breaker';

export interface SystemHealthMetrics {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  circuitBreakers: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    metrics: CircuitBreakerMetrics[];
  };
  externalAPIs: {
    googleMaps: {
      status: 'operational' | 'degraded' | 'outage';
      latency?: number;
      errorRate?: number;
      lastError?: string;
      lastSuccess?: Date;
    };
    // Add other external APIs as needed
  };
  systemResources: {
    memoryUsage: number;
    cpuUsage?: number;
    activeConnections?: number;
  };
}

export interface MonitoringAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'circuit_breaker' | 'external_api' | 'system_resource' | 'performance';
  message: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
}

export class InfrastructureMonitor {
  private alerts: MonitoringAlert[] = [];
  private metricsHistory: SystemHealthMetrics[] = [];
  private readonly maxHistorySize = 100; // Reduced from 1000 to prevent memory issues
  private readonly alertRetentionDays = 7;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly checkInterval: number = 30000) { // 30 seconds
    this.startMonitoring();
  }

  /**
   * Get current system health metrics
   */
  getHealthMetrics(): SystemHealthMetrics {
    const circuitBreakerMetrics = circuitBreakerRegistry.getAllMetrics();
    const healthSummary = circuitBreakerRegistry.getHealthSummary();

    // Determine overall system status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (healthSummary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (healthSummary.halfOpen > 0 || healthSummary.closed < healthSummary.total) {
      overallStatus = 'degraded';
    }

    // Get Google Maps API health (simplified - would integrate with actual adapter)
    const googleMapsBreaker = circuitBreakerMetrics.find(cb => cb.name === 'google-maps-api');
    let googleMapsStatus: 'operational' | 'degraded' | 'outage' = 'operational';

    if (googleMapsBreaker) {
      if (googleMapsBreaker.state === 'OPEN') {
        googleMapsStatus = 'outage';
      } else if (googleMapsBreaker.state === 'HALF_OPEN') {
        googleMapsStatus = 'degraded';
      }
    }

    const metrics: SystemHealthMetrics = {
      timestamp: new Date(),
      overallStatus,
      circuitBreakers: {
        total: healthSummary.total,
        healthy: healthSummary.closed,
        degraded: healthSummary.halfOpen,
        unhealthy: healthSummary.open,
        metrics: circuitBreakerMetrics
      },
      externalAPIs: {
        googleMaps: {
          status: googleMapsStatus,
          errorRate: googleMapsBreaker ? (googleMapsBreaker.failedRequests / Math.max(1, googleMapsBreaker.totalRequests)) * 100 : 0,
          lastSuccess: googleMapsBreaker?.lastSuccessTime,
          lastError: googleMapsBreaker?.lastFailureTime ? `Circuit breaker opened at ${googleMapsBreaker.lastFailureTime.toISOString()}` : undefined
        }
      },
      systemResources: {
        memoryUsage: this.getMemoryUsage(),
        activeConnections: 0 // Would integrate with actual connection tracking
      }
    };

    // Store in history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift(); // Remove oldest
    }

    return metrics;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(hours: number = 24): MonitoringAlert[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  /**
   * Get unresolved alerts
   */
  getUnresolvedAlerts(): MonitoringAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(hours: number = 1): SystemHealthMetrics[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(metrics => metrics.timestamp >= cutoffTime);
  }

  /**
   * Get system health summary
   */
  getHealthSummary(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    alerts: {
      total: number;
      unresolved: number;
      bySeverity: Record<string, number>;
    };
    circuitBreakers: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const currentMetrics = this.getHealthMetrics();
    const unresolvedAlerts = this.getUnresolvedAlerts();

    const alertsBySeverity = unresolvedAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      status: currentMetrics.overallStatus,
      uptime: process.uptime(), // Node.js process uptime
      alerts: {
        total: this.alerts.length,
        unresolved: unresolvedAlerts.length,
        bySeverity: alertsBySeverity
      },
      circuitBreakers: currentMetrics.circuitBreakers
    };
  }

  private startMonitoring(): void {
    // Periodic health checks
    setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);

    // Clean up old alerts
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000); // Hourly cleanup
  }

  private performHealthChecks(): void {
    const metrics = this.getHealthMetrics();

    // Check circuit breaker health
    metrics.circuitBreakers.metrics.forEach(cb => {
      if (cb.state === 'OPEN') {
        this.createAlert({
          severity: 'error',
          category: 'circuit_breaker',
          message: `Circuit breaker '${cb.name}' is OPEN`,
          details: {
            circuitBreaker: cb.name,
            failureRate: (cb.failedRequests / Math.max(1, cb.totalRequests)) * 100,
            lastFailure: cb.lastFailureTime
          }
        });
      } else if (cb.state === 'HALF_OPEN') {
        this.createAlert({
          severity: 'warning',
          category: 'circuit_breaker',
          message: `Circuit breaker '${cb.name}' is recovering (HALF_OPEN)`,
          details: {
            circuitBreaker: cb.name,
            consecutiveSuccesses: cb.consecutiveSuccesses
          }
        });
      }
    });

    // Check external API health
    if (metrics.externalAPIs.googleMaps.status === 'outage') {
      this.createAlert({
        severity: 'error',
        category: 'external_api',
        message: 'Google Maps API is experiencing outages',
        details: {
          api: 'googleMaps',
          errorRate: metrics.externalAPIs.googleMaps.errorRate,
          lastError: metrics.externalAPIs.googleMaps.lastError
        }
      });
    }

    // Check system resources
    const memoryUsage = metrics.systemResources.memoryUsage;
    if (memoryUsage > 90) {
      this.createAlert({
        severity: 'critical',
        category: 'system_resource',
        message: `High memory usage: ${memoryUsage.toFixed(1)}%`,
        details: {
          memoryUsage,
          threshold: 90
        }
      });
    } else if (memoryUsage > 80) {
      this.createAlert({
        severity: 'warning',
        category: 'system_resource',
        message: `Elevated memory usage: ${memoryUsage.toFixed(1)}%`,
        details: {
          memoryUsage,
          threshold: 80
        }
      });
    }
  }

  private createAlert(alertData: Omit<MonitoringAlert, 'id' | 'timestamp' | 'resolved' | 'resolvedAt'>): void {
    // Check if similar alert already exists and is unresolved
    const existingAlert = this.alerts.find(alert =>
      !alert.resolved &&
      alert.category === alertData.category &&
      alert.message === alertData.message
    );

    if (existingAlert) {
      // Update existing alert timestamp
      existingAlert.timestamp = new Date();
      return;
    }

    const alert: MonitoringAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);

    // Log alert (in production, this would go to logging system)
    console.log(`[${alert.severity.toUpperCase()}] ${alert.category}: ${alert.message}`, alert.details);
  }

  private cleanupOldAlerts(): void {
    const cutoffDate = new Date(Date.now() - this.alertRetentionDays * 24 * 60 * 60 * 1000);

    // Keep only recent alerts
    this.alerts = this.alerts.filter(alert =>
      !alert.resolved || (alert.resolvedAt && alert.resolvedAt >= cutoffDate)
    );
  }

  private getMemoryUsage(): number {
    // Get Node.js memory usage
    const memUsage = process.memoryUsage();
    const used = memUsage.heapUsed;
    const total = memUsage.heapTotal;
    const usagePercent = (used / total) * 100;

    // Force garbage collection if memory usage is critically high
    if (usagePercent > 95 && global.gc) {
      console.log('Forcing garbage collection due to high memory usage');
      global.gc();
      // Recalculate after GC
      const memAfterGC = process.memoryUsage();
      const usedAfterGC = memAfterGC.heapUsed;
      const totalAfterGC = memAfterGC.heapTotal;
      return (usedAfterGC / totalAfterGC) * 100;
    }

    return usagePercent;
  }

  /**
   * Clean up resources and stop monitoring
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.alerts.length = 0;
    this.metricsHistory.length = 0;
  }
}

// Global monitoring instance
export const infrastructureMonitor = new InfrastructureMonitor();

/**
 * Health check endpoint data
 */
export function getHealthCheckData() {
  return infrastructureMonitor.getHealthSummary();
}

/**
 * Detailed metrics endpoint data
 */
export function getDetailedMetrics(hours: number = 1) {
  return {
    current: infrastructureMonitor.getHealthMetrics(),
    history: infrastructureMonitor.getMetricsHistory(hours),
    alerts: infrastructureMonitor.getRecentAlerts(hours)
  };
}
