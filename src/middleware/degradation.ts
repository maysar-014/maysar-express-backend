/**
 * Maysar Engineering — Degradation Middleware
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 19: Reliability and Fault Tolerance — Graceful degradation
 *   - Article 11: API and Communication Efficiency — Graceful fallback
 * 
 * Provides middleware to wrap service calls with degradation handling.
 * When a non-critical service is degraded, requests are handled gracefully
 * without failing the entire request.
 */

import { Request, Response, NextFunction } from 'express';
import { degradationManager } from '../lib/degradation-manager';
import { logger } from '../core/logger';

/**
 * Middleware that checks service health before processing a request.
 * If a non-critical service is degraded, the request continues with degraded mode.
 * If a critical service is degraded, the request fails with 503.
 */
export function degradationMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const health = degradationManager.getServiceHealth(serviceName);
    
    if (health && health.status === 'UNHEALTHY') {
      const isCritical = degradationManager.isServiceCritical(serviceName);
      
      if (isCritical) {
        res.status(503).json({
          success: false,
          error: 'Service unavailable',
          message: `Service ${serviceName} is currently unavailable`,
          code: 'SERVICE_UNAVAILABLE',
          service: serviceName,
          status: 'UNHEALTHY',
        });
        return;
      }
      
      // Non-critical service degraded - add header to inform client
      res.set('X-Service-Degraded', serviceName);
      res.set('X-Service-Status', 'degraded');
    }
    
    next();
  };
}

/**
 * Wrapper for calling a service with degradation handling.
 * If the service is degraded, returns the degraded result instead of throwing.
 */
export async function withDegradation<T>(
  serviceName: string,
  fn: () => Promise<T>,
  degradedValue: T
): Promise<T> {
  const health = degradationManager.getServiceHealth(serviceName);
  
  if (health && health.status === 'UNHEALTHY') {
    const isCritical = degradationManager.isServiceCritical(serviceName);
    
    if (isCritical) {
      throw new Error(`Service ${serviceName} is unavailable`);
    }
    
    // Non-critical service degraded - return degraded value
    logger.warn(`Service ${serviceName} degraded, returning degraded value`);
    return degradedValue;
  }
  
  try {
    return await fn();
  } catch (error) {
    // If the call fails and service is non-critical, return degraded value
    const health = degradationManager.getServiceHealth(serviceName);
    if (health && !degradationManager.isServiceCritical(serviceName)) {
      logger.warn(`Service ${serviceName} call failed, returning degraded value: ${error}`);
      return degradedValue;
    }
    throw error;
  }
}
