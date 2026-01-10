import { Request, Response, NextFunction } from 'express';
import { SuperEfficiencyOptimizer, CacheManager, PerformanceMonitor } from '../domain/engines/super-efficiency-optimizer.engine';

export class OptimizationMiddleware {
  private static optimizer = new SuperEfficiencyOptimizer();
  private static cacheManager = CacheManager.getInstance();
  private static performanceMonitor = new PerformanceMonitor();

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

  static async optimizeQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttl: number = 300000
  ): Promise<T> {
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
}