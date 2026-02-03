/**
 * Timeout Middleware
 * 
 * Handles request timeouts for the Maysar API Gateway
 */

import { Request, Response, NextFunction } from 'express';

export interface TimeoutOptions {
  timeout: number; // Timeout in milliseconds
  onTimeout?: (req: Request, res: Response) => void;
}

export class TimeoutMiddleware {
  private options: TimeoutOptions;

  constructor(options?: Partial<TimeoutOptions>) {
    this.options = {
      timeout: 30000, // 30 seconds default
      onTimeout: this.defaultTimeoutHandler,
      ...options,
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        if (!res.headersSent) {
          this.options.onTimeout!(req, res);
        }
      }, this.options.timeout);

      // Clear timeout on response finish
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
        clearTimeout(timeoutId);
        return originalEnd.call(this, chunk, encoding);
      };

      // Clear timeout on error
      req.on('error', () => {
        clearTimeout(timeoutId);
      });

      next();
    };
  }

  private defaultTimeoutHandler(req: Request, res: Response): void {
    res.status(408).json({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out',
        details: `Request exceeded the ${this.options.timeout}ms timeout limit`,
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
    });
  }
}

// Default timeout middleware instance
export const timeoutMiddleware = new TimeoutMiddleware();

// Export middleware function
export const timeout = timeoutMiddleware.middleware();