/**
 * CORS Middleware
 * 
 * Handles Cross-Origin Resource Sharing for the Maysar API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { gatewayConfig } from '../config';

export interface CorsOptions {
  origins: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
  maxAge?: number;
}

export class CorsMiddleware {
  private options: CorsOptions;

  constructor(options?: Partial<CorsOptions>) {
    this.options = {
      origins: gatewayConfig.cors.origins,
      methods: gatewayConfig.cors.methods,
      headers: gatewayConfig.cors.headers,
      credentials: gatewayConfig.cors.credentials,
      maxAge: 86400, // 24 hours
      ...options,
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', this.getAllowedOrigin(origin));
      res.setHeader('Access-Control-Allow-Methods', this.options.methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', this.options.headers.join(', '));
      res.setHeader('Access-Control-Allow-Credentials', this.options.credentials.toString());
      
      if (this.options.maxAge) {
        res.setHeader('Access-Control-Max-Age', this.options.maxAge.toString());
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      next();
    };
  }

  private getAllowedOrigin(origin?: string): string {
    if (!origin) {
      return this.options.origins[0] || '*';
    }

    // Check if origin is in allowed list
    if (this.options.origins.includes(origin)) {
      return origin;
    }

    // Check for wildcard
    if (this.options.origins.includes('*')) {
      return origin;
    }

    // Check for subdomain patterns
    for (const allowedOrigin of this.options.origins) {
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.substring(2);
        if (origin.endsWith(domain)) {
          return origin;
        }
      }
    }

    return this.options.origins[0] || '*';
  }
}

// Default CORS middleware instance
export const corsMiddleware = new CorsMiddleware();

// Export middleware function
export const cors = corsMiddleware.middleware();