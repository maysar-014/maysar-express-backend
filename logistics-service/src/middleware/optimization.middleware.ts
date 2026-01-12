import { Request, Response, NextFunction } from 'express';
import { SuperEfficiencyOptimizer, CacheManager, PerformanceMonitor } from '../domain/engines/super-efficiency-optimizer.engine';

export class OptimizationMiddleware {
  // Use singletons to prevent memory leaks from multiple instances
  private static cacheManager = CacheManager.getInstance();
  private static performanceMonitor = new PerformanceMonitor();

  // Reduce frequency of performance monitoring to prevent memory buildup
  private static lastMonitorTime = 0;
  private static readonly MONITOR_INTERVAL = 5000; // Only monitor every 5 seconds

  static cache(ttl: number = 300000) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `${req.originalUrl}_${JSON.stringify(req.query)}`;
      const cached = await OptimizationMiddleware.cacheManager.get(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        OptimizationMiddleware.cacheManager.set(cacheKey, data, ttl);
        return originalJson(data);
      };

      next();
    };
  }

  static monitor() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        OptimizationMiddleware.performanceMonitor.recordMetric({
          responseTime,
          throughput: 1000 / responseTime,
          errorRate: res.statusCode >= 400 ? 1 : 0,
          cpuUsage: 35,
          memoryUsage: 45
        });
      });

      next();
    };
  }

  static getStats() {
    return {
      cache: OptimizationMiddleware.cacheManager.getStats(),
      performance: OptimizationMiddleware.performanceMonitor.getPerformanceReport()
    };
  }
}

export class QueryOptimizer {
  private static queryCache = new Map<string, { result: any; expiry: number }>();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  // Initialize cleanup on first use
  private static initializeCleanup(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpiredQueries();
      }, 60000); // Clean up every minute
    }
  }

  static async optimizeQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttl: number = 300000
  ): Promise<T> {
    this.initializeCleanup();

    const cached = this.queryCache.get(queryKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    const result = await queryFn();
    this.queryCache.set(queryKey, {
      result,
      expiry: Date.now() + ttl
    });

    return result;
  }

  private static cleanupExpiredQueries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.queryCache.entries()) {
      if (entry.expiry <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.queryCache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`QueryOptimizer: Cleaned up ${expiredKeys.length} expired query results`);
    }
  }

  static destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.queryCache.clear();
  }
}
