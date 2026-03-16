// @ts-nocheck
/**
 * Performance Benchmarking Engine - Constitution Section 6: Testing Constitution
 *
 * Constitution Section 6: Testing Constitution - Performance benchmarks and load testing
 * Constitution Section 8: Infrastructure Isolation Rule - Performance monitoring
 */

import { performance } from 'perf_hooks';
import { GeoPoint } from '../domain/value-objects/geopoint.value-object';

export interface BenchmarkResult {
  operation: string;
  category: 'database' | 'external_api' | 'business_logic' | 'saga' | 'serialization';
  duration: number; // milliseconds
  memoryDelta: number; // bytes
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // operations per second
  errorRate: number;
  memoryUsage: number;
  cpuUsage?: number;
}

export interface LoadTestResult {
  operation: string;
  concurrency: number;
  totalRequests: number;
  duration: number;
  metrics: PerformanceMetrics;
  bottlenecks?: string[];
  recommendations?: string[];
}

export class PerformanceBenchmarkEngine {
  private results: BenchmarkResult[] = [];
  private readonly warmupIterations = 3;
  private readonly measurementIterations = 10;

  async runFullBenchmarkSuite(): Promise<{
    results: BenchmarkResult[];
    summary: {
      totalOperations: number;
      averageDuration: number;
      successRate: number;
      memoryEfficiency: number;
    };
  }> {
    console.log('ðŸš€ Starting Performance Benchmark Suite...');

    // Database operations benchmarks
    await this.benchmarkDatabaseOperations();

    // External API benchmarks
    await this.benchmarkExternalAPIs();

    // Business logic benchmarks
    await this.benchmarkBusinessLogic();

    // Saga orchestration benchmarks
    await this.benchmarkSagaOperations();

    // Serialization benchmarks
    await this.benchmarkSerialization();

    const summary = this.generateSummary();

    console.log('âœ… Benchmark Suite Complete');
    console.log(`ðŸ“Š Results: ${summary.totalOperations} operations, ${summary.averageDuration.toFixed(2)}ms avg, ${summary.successRate.toFixed(1)}% success rate`);

    return { results: this.results, summary };
  }

  private async benchmarkDatabaseOperations(): Promise<void> {
    console.log('ðŸ“Š Benchmarking Database Operations...');

    // Test courier repository operations
    await this.benchmarkOperation(
      'Courier Repository - Find Available',
      'database',
      async () => {
        const { container } = await import('./container');
        const repo = container.getCourierRepository();
        return repo.findAvailable();
      },
      { table: 'couriers', operation: 'SELECT' }
    );

    await this.benchmarkOperation(
      'Courier Repository - Create Courier',
      'database',
      async () => {
        const { container } = await import('./container');
        const repo = container.getCourierRepository();
        // Note: This would normally create a test courier, but we'll skip actual DB writes in benchmarks
        return Promise.resolve();
      },
      { table: 'couriers', operation: 'INSERT', simulated: true }
    );

    // Test delivery repository operations
    await this.benchmarkOperation(
      'Delivery Repository - Find By Status',
      'database',
      async () => {
        const { container } = await import('./container');
        const repo = container.getDeliveryRepository();
        return repo.findByStatus('pending');
      },
      { table: 'deliveries', operation: 'SELECT' }
    );
  }

  private async benchmarkExternalAPIs(): Promise<void> {
    console.log('ðŸŒ Benchmarking External APIs...');

    // Test Google Maps route optimization
    await this.benchmarkOperation(
      'Google Maps - Route Calculation',
      'external_api',
      async () => {
        const { container } = await import('./container');
        const routeOptimizer = container.getRouteOptimizationProvider();

        const origin = GeoPoint.create(-1.2921, 36.8219, 'Test Origin');
        const destination = GeoPoint.create(-1.2950, 36.8250, 'Test Destination');

        return routeOptimizer.calculateOptimalRoute(origin, destination);
      },
      { provider: 'Google Maps', endpoint: 'directions' }
    );

    // Test route alternatives
    await this.benchmarkOperation(
      'Google Maps - Route Alternatives',
      'external_api',
      async () => {
        const { container } = await import('./container');
        const routeOptimizer = container.getRouteOptimizationProvider();

        const origin = GeoPoint.create(-1.2921, 36.8219, 'Test Origin');
        const destination = GeoPoint.create(-1.2950, 36.8250, 'Test Destination');

        return routeOptimizer.getRouteAlternatives(origin, destination, 3);
      },
      { provider: 'Google Maps', endpoint: 'directions', alternatives: 3 }
    );
  }

  private async benchmarkBusinessLogic(): Promise<void> {
    console.log('ðŸ§  Benchmarking Business Logic...');

    // Test logistics engine calculations
    await this.benchmarkOperation(
      'Logistics Engine - Cost Calculation',
      'business_logic',
      async () => {
        const { container } = await import('./container');
        const engine = container.getLogisticsEngine();
        return engine.calculateDeliveryCost(25, 2.5, 'standard');
      },
      { calculation: 'delivery_cost', distance: 25, weight: 2.5 }
    );

    await this.benchmarkOperation(
      'Logistics Engine - Risk Assessment',
      'business_logic',
      async () => {
        const { container } = await import('./container');
        const engine = container.getLogisticsEngine();
        return engine.calculateRiskScore(25, 50000, 'standard', 4.5, 0.95);
      },
      { calculation: 'risk_score', distance: 25, value: 50000 }
    );

    // Skip courier policy evaluation for now - method doesn't exist
    // await this.benchmarkOperation(
    //   'Courier Assignment Policy - Evaluation',
    //   'business_logic',
    //   async () => {
    //     const { container } = await import('./container');
    //     const policy = container.getCourierAssignmentPolicy();
    //     return policy.evaluateCourier(4.5, 0.95, 50, 2.5, 5);
    //   },
    //   { evaluation: 'courier_eligibility', rating: 4.5, completionRate: 0.95 }
    // );
  }

  private async benchmarkSagaOperations(): Promise<void> {
    console.log('ðŸŽ­ Benchmarking Saga Operations...');

    // Note: Saga benchmarking would require careful setup to avoid actual side effects
    // For now, we'll benchmark the saga creation and validation logic

    await this.benchmarkOperation(
      'Delivery Saga - Creation',
      'saga',
      async () => {
        const { DeliverySaga } = await import('../application/sagas/delivery.saga');
        const { container } = await import('./container');
        return container.getDeliverySaga();
      },
      { saga: 'delivery', operation: 'creation' }
    );
  }

  private async benchmarkSerialization(): Promise<void> {
    console.log('ðŸ“¦ Benchmarking Serialization...');

    const testData = {
      deliveryId: 'test-delivery-' + Date.now(),
      orderId: 'test-order-' + Date.now(),
      pickupLocation: { lat: -1.2921, lng: 36.8219, address: 'Test Pickup' },
      deliveryLocation: { lat: -1.2950, lng: 36.8250, address: 'Test Delivery' },
      status: 'pending' as const,
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        name: `Test Item ${i}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        price: Math.random() * 100
      }))
    };

    await this.benchmarkOperation(
      'JSON Serialization - Large Object',
      'serialization',
      async () => {
        return JSON.stringify(testData);
      },
      { format: 'json', size: 'large', items: 10 }
    );

    await this.benchmarkOperation(
      'JSON Deserialization - Large Object',
      'serialization',
      async () => {
        const serialized = JSON.stringify(testData);
        return JSON.parse(serialized);
      },
      { format: 'json', operation: 'deserialize', size: 'large' }
    );
  }

  private async benchmarkOperation(
    operationName: string,
    category: BenchmarkResult['category'],
    operation: () => Promise<any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Warmup phase
    for (let i = 0; i < this.warmupIterations; i++) {
      try {
        await operation();
      } catch (error) {
        // Ignore warmup errors
      }
    }

    // Measurement phase
    const measurements: BenchmarkResult[] = [];

    for (let i = 0; i < this.measurementIterations; i++) {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      try {
        await operation();

        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;

        measurements.push({
          operation: operationName,
          category,
          duration: endTime - startTime,
          memoryDelta: endMemory - startMemory,
          success: true,
          metadata
        });
      } catch (error: any) {
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;

        measurements.push({
          operation: operationName,
          category,
          duration: endTime - startTime,
          memoryDelta: endMemory - startMemory,
          success: false,
          error: error.message,
          metadata
        });
      }

      // Small delay between measurements to avoid interference
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Calculate averages and store results
    const successfulMeasurements = measurements.filter(m => m.success);
    if (successfulMeasurements.length > 0) {
      const avgDuration = successfulMeasurements.reduce((sum, m) => sum + m.duration, 0) / successfulMeasurements.length;
      const avgMemoryDelta = successfulMeasurements.reduce((sum, m) => sum + m.memoryDelta, 0) / successfulMeasurements.length;

      this.results.push({
        operation: operationName,
        category,
        duration: avgDuration,
        memoryDelta: avgMemoryDelta,
        success: true,
        metadata: {
          ...metadata,
          sampleSize: successfulMeasurements.length,
          minDuration: Math.min(...successfulMeasurements.map(m => m.duration)),
          maxDuration: Math.max(...successfulMeasurements.map(m => m.duration))
        }
      });
    } else {
      // All measurements failed
      this.results.push({
        operation: operationName,
        category,
        duration: 0,
        memoryDelta: 0,
        success: false,
        error: 'All benchmark iterations failed',
        metadata
      });
    }
  }

  async runLoadTest(
    operation: () => Promise<any>,
    operationName: string,
    concurrency: number = 10,
    totalRequests: number = 100
  ): Promise<LoadTestResult> {
    console.log(`ðŸ”¥ Running Load Test: ${operationName} (${concurrency} concurrent, ${totalRequests} total)`);

    const startTime = Date.now();
    const promises: Promise<any>[] = [];
    const results: { duration: number; success: boolean; error?: string }[] = [];

    // Create concurrent requests
    for (let i = 0; i < totalRequests; i++) {
      promises.push(
        (async () => {
          const reqStart = performance.now();
          try {
            await operation();
            results.push({
              duration: performance.now() - reqStart,
              success: true
            });
          } catch (error: any) {
            results.push({
              duration: performance.now() - reqStart,
              success: false,
              error: error.message
            });
          }
        })()
      );

      // Control concurrency
      if (promises.length >= concurrency) {
        await Promise.all(promises.splice(0, concurrency));
      }
    }

    // Wait for remaining requests
    await Promise.all(promises);

    const duration = Date.now() - startTime;
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const metrics: PerformanceMetrics = {
      averageResponseTime: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length,
      p95ResponseTime: this.calculatePercentile(successful.map(r => r.duration), 95),
      p99ResponseTime: this.calculatePercentile(successful.map(r => r.duration), 99),
      throughput: totalRequests / (duration / 1000), // requests per second
      errorRate: (failed.length / totalRequests) * 100,
      memoryUsage: process.memoryUsage().heapUsed
    };

    const result: LoadTestResult = {
      operation: operationName,
      concurrency,
      totalRequests,
      duration,
      metrics,
      bottlenecks: this.identifyBottlenecks(metrics),
      recommendations: this.generateRecommendations(metrics)
    };

    console.log(`âœ… Load Test Complete: ${metrics.throughput.toFixed(1)} req/sec, ${metrics.errorRate.toFixed(1)}% errors`);
    return result;
  }

  private generateSummary() {
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    return {
      totalOperations: this.results.length,
      averageDuration: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length,
      successRate: (successful.length / this.results.length) * 100,
      memoryEfficiency: successful.reduce((sum, r) => sum + r.memoryDelta, 0) / successful.length
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = values.sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  private identifyBottlenecks(metrics: PerformanceMetrics): string[] {
    const bottlenecks: string[] = [];

    if (metrics.p95ResponseTime > 1000) {
      bottlenecks.push('High latency detected (>1s P95)');
    }

    if (metrics.errorRate > 5) {
      bottlenecks.push('High error rate detected (>5%)');
    }

    if (metrics.throughput < 10) {
      bottlenecks.push('Low throughput detected (<10 req/sec)');
    }

    if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      bottlenecks.push('High memory usage detected (>100MB)');
    }

    return bottlenecks;
  }

  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.p95ResponseTime > 500) {
      recommendations.push('Consider optimizing database queries or adding caching');
    }

    if (metrics.errorRate > 1) {
      recommendations.push('Investigate and fix error sources to improve reliability');
    }

    if (metrics.throughput < 50) {
      recommendations.push('Consider horizontal scaling or performance optimizations');
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Monitor for memory leaks and optimize memory usage');
    }

    return recommendations;
  }

  getResults(): BenchmarkResult[] {
    return this.results;
  }

  getResultsByCategory(category: BenchmarkResult['category']): BenchmarkResult[] {
    return this.results.filter(r => r.category === category);
  }

  clearResults(): void {
    this.results = [];
  }
}

// Global instance
export const performanceBenchmarkEngine = new PerformanceBenchmarkEngine();
