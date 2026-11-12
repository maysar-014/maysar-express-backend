/**
 * Maysar Engineering — DataLoader Middleware
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 10.3: N+1 query patterns shall be identified and eliminated where unnecessary
 *   - Article 7: Resource Efficiency Doctrine
 * 
 * Creates fresh DataLoader instances per request to prevent cross-request
 * cache leaks and enable batched loading of related records.
 */

import { NextFunction, Request, Response } from 'express';
import { createLoaders } from '../lib/dataloader';

/**
 * Express request extension with DataLoader instances.
 */
declare global {
  namespace Express {
    interface Request {
      loaders?: ReturnType<typeof createLoaders>;
    }
  }
}

/**
 * Middleware that creates per-request DataLoader instances.
 * 
 * Each request gets its own loaders to:
 * 1. Prevent cross-request cache leaks
 * 2. Enable batched loading within a single request (N+1 elimination)
 * 3. Automatically clear after request completion
 */
export function dataloaderMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.loaders = createLoaders();

  // Clean up loaders after response finishes
  res.on('finish', () => {
    req.loaders = undefined;
  });

  next();
}
