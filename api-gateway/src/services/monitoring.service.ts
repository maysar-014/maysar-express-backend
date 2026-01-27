/**
 * Monitoring Service
 * 
 * Provides comprehensive monitoring, metrics collection, and observability
 * for the Maysar API Gateway including health checks, performance metrics,
 * and distributed tracing
 */

import { Metrics, LogEntry, TraceSpan, HealthCheckResult, PerformanceMetrics } from '../types';
import { gatewayConfig } from '../config';
import { serviceRegistry } from './service-discovery.service';

export interface MonitoringService {
  recordRequest(duration: number, statusCode: number, service?: string): void;
  recordError(error: Error, service?: string): void;
  getMetrics(): Metrics;
  getHealthCheck(): Promise<HealthCheckResult>;
  log(level: 'error' | 'warn' | 'info' | 'debug', message: string, metadata?: any): void;
  startTracing(operationName: string, metadata?: any): TraceSpan;
  endTracing(span: TraceSpan, success: boolean): void;
  getPerformanceMetrics(): PerformanceMetrics;
  exportMetrics(): Promise<any>;
}

export class GatewayMonitoringService implements MonitoringService {
  private metrics: Metrics;
  private logs: LogEntry[] = [];
  private spans: Map<string, TraceSpan> = new Map();
  private requestCounters: Map<string, number> = new Map();
  private errorCounters: Map<string, number> = new Map();
  private responseTimeHistogram: number[] = [];
  private startTime: Date;

  constructor() {
    this.metrics = {
      requestsTotal: 0,
      requestsPerSecond: 0,
      responseTimeAvg: 0,
      responseTimeP95: 0,
      responseTimeP99: 0,
      errorRate: 0,
      activeConnections: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    };
    
    this.startTime = new Date();
    
    // Start background monitoring
    if (gatewayConfig.monitoring.enabled) {
      this.startBackgroundMonitoring();
    }
  }

  recordRequest(duration: number, statusCode: number, service?: string): void {
    this.metrics.requestsTotal++;
    
    // Update response time metrics
    this.responseTimeHistogram.push(duration);
    if (this.responseTimeHistogram.length > 1000) {
      this.responseTimeHistogram.shift(); // Keep only last 1000 measurements
    }

    this.updateResponseTimeMetrics();
    
    // Update error rate
    if (statusCode >= 400) {
      const serviceKey = service || 'gateway';
      const currentErrors = this.errorCounters.get(serviceKey) || 0;
      this.errorCounters.set(serviceKey, currentErrors + 1);
    }

    this.updateErrorRate();
    
    // Update requests per second
    this.updateRequestsPerSecond();
    
    // Update resource usage
    this.updateResourceUsage();
  }

  recordError(error: Error, service?: string): void {
    this.log('error', error.message, {
      error: error.stack,
      service: service,
      timestamp: new Date().toISOString(),
    });
  }

  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  async getHealthCheck(): Promise<HealthCheckResult> {
    const uptime = Date.now() - this.startTime.getTime();
    const services = await this.getServicesHealth();
    
    return {
      status: this.calculateOverallHealth(services),
      timestamp: new Date(),
      uptime,
      services,
      memory: this.getMemoryUsage(),
      cpu: this.getCpuUsage(),
      disk: this.getDiskUsage(),
    };
  }

  log(level: 'error' | 'warn' | 'info' | 'debug', message: string, metadata?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      service: 'api-gateway',
      requestId: this.generateRequestId(),
      metadata,
    };

    this.logs.push(logEntry);
    
    // Keep only last 10000 logs
    if (this.logs.length > 10000) {
      this.logs.shift();
    }

    // Output to console if in development
    if (gatewayConfig.environment === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, metadata);
    }
  }

  startTracing(operationName: string, metadata?: any): TraceSpan {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();
    
    const span: TraceSpan = {
      traceId,
      spanId,
      operationName,
      startTime: new Date(),
      tags: metadata || {},
      logs: [],
    };

    this.spans.set(spanId, span);
    return span;
  }

  endTracing(span: TraceSpan, success: boolean): void {
    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    
    span.logs.push({
      timestamp: new Date(),
      level: success ? 'info' : 'error',
      message: success ? 'Operation completed successfully' : 'Operation failed',
      service: 'api-gateway',
      requestId: span.traceId,
    });

    // Clean up old spans (keep only last 1000)
    if (this.spans.size > 1000) {
      const oldestSpanId = Array.from(this.spans.keys())[0];
      this.spans.delete(oldestSpanId);
    }
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const responseTimes = this.responseTimeHistogram.slice().sort((a, b) => a - b);
    const totalRequests = this.metrics.requestsTotal;
    const totalErrors = Array.from(this.errorCounters.values()).reduce((a, b) => a + b, 0);

    return {
      responseTime: {
        avg: this.metrics.responseTimeAvg,
        p50: this.calculatePercentile(responseTimes, 50),
        p95: this.calculatePercentile(responseTimes, 95),
        p99: this.calculatePercentile(responseTimes, 99),
      },
      throughput: {
        requestsPerSecond: this.metrics.requestsPerSecond,
        totalRequests,
      },
      errorRate: {
        percentage: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
        totalErrors,
      },
      resourceUsage: {
        memory: this.getMemoryUsage(),
        cpu: this.getCpuUsage(),
      },
    };
  }

  async exportMetrics(): Promise<any> {
    return {
      timestamp: new Date().toISOString(),
      gateway: {
        metrics: this.getMetrics(),
        performance: this.getPerformanceMetrics(),
        health: await this.getHealthCheck(),
      },
      services: await this.getServicesHealth(),
      logs: this.getRecentLogs(),
      traces: Array.from(this.spans.values()),
    };
  }

  private async getServicesHealth(): Promise<any[]> {
    const services = serviceRegistry.getAll();
    const healthChecks: any[] = [];

    for (const [serviceName, instances] of Object.entries(services)) {
      const healthyInstances = instances.filter(s => s.health === 'healthy').length;
      const totalInstances = instances.length;
      
      healthChecks.push({
        service: serviceName,
        status: healthyInstances === totalInstances ? 'healthy' : 'degraded',
        healthyInstances,
        totalInstances,
        instances: instances.map(instance => ({
          id: instance.id,
          host: instance.host,
          port: instance.port,
          health: instance.health,
          lastHealthCheck: instance.lastHealthCheck,
        })),
      });
    }

    return healthChecks;
  }

  private calculateOverallHealth(services: any[]): 'healthy' | 'unhealthy' | 'degraded' {
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const totalServices = services.length;
    
    if (healthyServices === totalServices) {
      return 'healthy';
    } else if (healthyServices >= totalServices * 0.5) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  private updateResponseTimeMetrics(): void {
    if (this.responseTimeHistogram.length === 0) return;

    const sum = this.responseTimeHistogram.reduce((a, b) => a + b, 0);
    this.metrics.responseTimeAvg = sum / this.responseTimeHistogram.length;
    
    const sorted = this.responseTimeHistogram.slice().sort((a, b) => a - b);
    this.metrics.responseTimeP95 = this.calculatePercentile(sorted, 95);
    this.metrics.responseTimeP99 = this.calculatePercentile(sorted, 99);
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  private updateErrorRate(): void {
    const totalRequests = this.metrics.requestsTotal;
    const totalErrors = Array.from(this.errorCounters.values()).reduce((a, b) => a + b, 0);
    
    this.metrics.errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  private updateRequestsPerSecond(): void {
    const uptimeSeconds = (Date.now() - this.startTime.getTime()) / 1000;
    this.metrics.requestsPerSecond = uptimeSeconds > 0 ? this.metrics.requestsTotal / uptimeSeconds : 0;
  }

  private updateResourceUsage(): void {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    
    // CPU usage approximation
    this.metrics.cpuUsage = process.cpuUsage().user / 1000000; // seconds
  }

  private getMemoryUsage(): any {
    const usage = process.memoryUsage();
    return {
      used: Math.round(usage.heapUsed / 1024 / 1024),
      total: Math.round(usage.heapTotal / 1024 / 1024),
      percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
    };
  }

  private getCpuUsage(): any {
    const usage = process.cpuUsage();
    return {
      usage: Math.round(usage.user / 1000000),
      load: process.cpuUsage().system / 1000000,
    };
  }

  private getDiskUsage(): any {
    // Basic disk usage approximation
    return {
      used: 0,
      total: 0,
      percentage: 0,
    };
  }

  private getRecentLogs(): LogEntry[] {
    return this.logs.slice(-100); // Return last 100 logs
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startBackgroundMonitoring(): void {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateResourceUsage();
      this.updateRequestsPerSecond();
    }, 30000);

    // Clean up old data every 5 minutes
    setInterval(() => {
      this.cleanUpOldData();
    }, 5 * 60 * 1000);
  }

  private cleanUpOldData(): void {
    // Remove old logs (keep last 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
    
    // Remove old spans
    for (const [spanId, span] of this.spans.entries()) {
      if (span.endTime && span.endTime < cutoff) {
        this.spans.delete(spanId);
      }
    }
  }
}

// Prometheus Metrics Exporter
export class PrometheusMetricsExporter {
  private monitoringService: MonitoringService;

  constructor(monitoringService: MonitoringService) {
    this.monitoringService = monitoringService;
  }

  async export(): Promise<string> {
    const metrics = this.monitoringService.getMetrics();
    const performance = this.monitoringService.getPerformanceMetrics();
    
    let output = '';
    
    // Gateway metrics
    output += `# HELP gateway_requests_total Total number of requests\n`;
    output += `# TYPE gateway_requests_total counter\n`;
    output += `gateway_requests_total ${metrics.requestsTotal}\n\n`;
    
    output += `# HELP gateway_requests_per_second Requests per second\n`;
    output += `# TYPE gateway_requests_per_second gauge\n`;
    output += `gateway_requests_per_second ${metrics.requestsPerSecond}\n\n`;
    
    output += `# HELP gateway_response_time_avg Average response time in milliseconds\n`;
    output += `# TYPE gateway_response_time_avg gauge\n`;
    output += `gateway_response_time_avg ${metrics.responseTimeAvg}\n\n`;
    
    output += `# HELP gateway_response_time_p95 95th percentile response time in milliseconds\n`;
    output += `# TYPE gateway_response_time_p95 gauge\n`;
    output += `gateway_response_time_p95 ${metrics.responseTimeP95}\n\n`;
    
    output += `# HELP gateway_response_time_p99 99th percentile response time in milliseconds\n`;
    output += `# TYPE gateway_response_time_p99 gauge\n`;
    output += `gateway_response_time_p99 ${metrics.responseTimeP99}\n\n`;
    
    output += `# HELP gateway_error_rate Error rate percentage\n`;
    output += `# TYPE gateway_error_rate gauge\n`;
    output += `gateway_error_rate ${metrics.errorRate}\n\n`;
    
    output += `# HELP gateway_active_connections Active connections\n`;
    output += `# TYPE gateway_active_connections gauge\n`;
    output += `gateway_active_connections ${metrics.activeConnections}\n\n`;
    
    output += `# HELP gateway_memory_usage Memory usage in MB\n`;
    output += `# TYPE gateway_memory_usage gauge\n`;
    output += `gateway_memory_usage ${metrics.memoryUsage}\n\n`;
    
    output += `# HELP gateway_cpu_usage CPU usage in seconds\n`;
    output += `# TYPE gateway_cpu_usage gauge\n`;
    output += `gateway_cpu_usage ${metrics.cpuUsage}\n\n`;
    
    // Performance metrics
    output += `# HELP gateway_throughput_requests_per_second Throughput in requests per second\n`;
    output += `# TYPE gateway_throughput_requests_per_second gauge\n`;
    output += `gateway_throughput_requests_per_second ${performance.throughput.requestsPerSecond}\n\n`;
    
    output += `# HELP gateway_throughput_total_requests Total requests\n`;
    output += `# TYPE gateway_throughput_total_requests counter\n`;
    output += `gateway_throughput_total_requests ${performance.throughput.totalRequests}\n\n`;
    
    output += `# HELP gateway_error_rate_percentage Error rate percentage\n`;
    output += `# TYPE gateway_error_rate_percentage gauge\n`;
    output += `gateway_error_rate_percentage ${performance.errorRate.percentage}\n\n`;
    
    output += `# HELP gateway_error_rate_total_errors Total errors\n`;
    output += `# TYPE gateway_error_rate_total_errors counter\n`;
    output += `gateway_error_rate_total_errors ${performance.errorRate.totalErrors}\n\n`;

    return output;
  }
}

// Export default monitoring service
export const monitoringService = new GatewayMonitoringService();
export const prometheusExporter = new PrometheusMetricsExporter(monitoringService);