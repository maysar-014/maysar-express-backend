/**
 * Response Transformer Middleware
 * 
 * Handles response transformation and standardization for the Maysar API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { PaginatedResponse } from '../types';

export interface ResponseTransformerOptions {
  includeRequestId?: boolean;
  includeTimestamp?: boolean;
  includeVersion?: boolean;
  version?: string;
  transformErrors?: boolean;
  transformSuccess?: boolean;
}

export class ResponseTransformerMiddleware {
  private options: ResponseTransformerOptions;

  constructor(options?: Partial<ResponseTransformerOptions>) {
    this.options = {
      includeRequestId: true,
      includeTimestamp: true,
      includeVersion: true,
      version: '1.0.0',
      transformErrors: true,
      transformSuccess: true,
      ...options,
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Capture original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;

      let responseBody: any;
      let statusCode = res.statusCode;
      let isJsonResponse = false;

      // Override response methods to capture response data
      res.send = function(body?: any) {
        responseBody = body;
        isJsonResponse = typeof body === 'object' && body !== null;
        return originalSend.call(this, body);
      };

      res.json = function(body?: any) {
        responseBody = body;
        isJsonResponse = true;
        return originalJson.call(this, body);
      };

      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      // Transform response when finished
      res.on('finish', () => {
        if (isJsonResponse && this.shouldTransformResponse(statusCode)) {
          const transformedResponse = this.transformResponse(
            responseBody,
            statusCode,
            req,
            res
          );
          
          // Override the response with transformed data
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('X-API-Version', this.options.version!);
          
          // Use original send to avoid infinite recursion
          originalSend.call(res, JSON.stringify(transformedResponse));
        }
      });

      next();
    };
  }

  private shouldTransformResponse(statusCode: number): boolean {
    if (statusCode >= 400 && !this.options.transformErrors) {
      return false;
    }
    if (statusCode < 400 && !this.options.transformSuccess) {
      return false;
    }
    return true;
  }

  private transformResponse(
    body: any,
    statusCode: number,
    req: Request,
    res: Response
  ): any {
    const requestId = (req as any).requestId || this.generateRequestId();
    const timestamp = new Date().toISOString();

    // Handle error responses
    if (statusCode >= 400) {
      return this.transformErrorResponse(body, statusCode, requestId, timestamp);
    }

    // Handle success responses
    return this.transformSuccessResponse(body, statusCode, requestId, timestamp);
  }

  private transformErrorResponse(
    body: any,
    statusCode: number,
    requestId: string,
    timestamp: string
  ): any {
    // If already in standard error format, return as is
    if (body && body.success === false && body.error) {
      return {
        ...body,
        requestId: body.requestId || requestId,
        timestamp: body.timestamp || timestamp,
      };
    }

    // Transform to standard error format
    let errorDetails: any = null;

    if (typeof body === 'string') {
      errorDetails = {
        message: body,
      };
    } else if (body && typeof body === 'object') {
      errorDetails = body;
    } else {
      errorDetails = {
        message: 'An error occurred',
      };
    }

    return {
      success: false,
      error: {
        code: this.getErrorCode(statusCode),
        message: this.getErrorMessage(statusCode, errorDetails.message),
        details: errorDetails,
      },
      timestamp,
      requestId,
      ...(this.options.includeVersion && { version: this.options.version }),
    };
  }

  private transformSuccessResponse(
    body: any,
    statusCode: number,
    requestId: string,
    timestamp: string
  ): any {
    // If already in standard format, return as is
    if (body && body.success !== undefined) {
      return {
        ...body,
        requestId: body.requestId || requestId,
        timestamp: body.timestamp || timestamp,
      };
    }

    // Handle paginated responses
    if (this.isPaginatedResponse(body)) {
      return {
        success: true,
        data: body.data || body,
        pagination: body.pagination,
        timestamp,
        requestId,
        ...(this.options.includeVersion && { version: this.options.version }),
      };
    }

    // Handle regular success responses
    return {
      success: true,
      data: body,
      timestamp,
      requestId,
      ...(this.options.includeVersion && { version: this.options.version }),
    };
  }

  private isPaginatedResponse(body: any): boolean {
    return body && 
           typeof body === 'object' && 
           body.data !== undefined && 
           body.pagination !== undefined &&
           typeof body.pagination === 'object';
  }

  private getErrorCode(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'VALIDATION_ERROR';
      case 429: return 'RATE_LIMIT_EXCEEDED';
      case 500: return 'INTERNAL_ERROR';
      case 502: return 'BAD_GATEWAY';
      case 503: return 'SERVICE_UNAVAILABLE';
      case 504: return 'GATEWAY_TIMEOUT';
      default: return 'UNKNOWN_ERROR';
    }
  }

  private getErrorMessage(statusCode: number, defaultMessage?: string): string {
    if (defaultMessage) {
      return defaultMessage;
    }

    switch (statusCode) {
      case 400: return 'Bad request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not found';
      case 409: return 'Conflict';
      case 422: return 'Validation error';
      case 429: return 'Rate limit exceeded';
      case 500: return 'Internal server error';
      case 502: return 'Bad gateway';
      case 503: return 'Service unavailable';
      case 504: return 'Gateway timeout';
      default: return 'An error occurred';
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility method to create standardized success response
  static createSuccessResponse(data: any, pagination?: any): PaginatedResponse<any> {
    const response: any = {
      success: true,
      data: data || null,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (pagination) {
      response.pagination = pagination;
    }

    return response;
  }

  // Utility method to create standardized error response
  static createErrorResponse(
    code: string,
    message: string,
    details?: any,
    statusCode: number = 500
  ): any {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

// Default response transformer middleware instance
export const responseTransformerMiddleware = new ResponseTransformerMiddleware();

// Export middleware function
export const responseTransformer = responseTransformerMiddleware.middleware();