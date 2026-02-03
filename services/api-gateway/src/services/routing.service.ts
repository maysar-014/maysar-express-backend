/**
 * Routing Service
 * 
 * Handles request routing, path transformation, and service selection
 * for the Maysar API Gateway with support for multiple routing strategies
 */

import { Request, Response, NextFunction } from 'express';
import { RouteConfig, GatewayRequest, GatewayResponse } from '../types';
import { gatewayConfig, routeConfig } from '../config';
import { serviceRegistry } from './service-discovery.service';
import { loadBalancer } from './load-balancer.service';
import { circuitBreakerManager } from './circuit-breaker.service';

export interface RoutingService {
  routeRequest(req: Request, res: Response, next: NextFunction): Promise<void>;
  getRouteConfig(path: string, method: string): RouteConfig | null;
  transformRequest(req: Request): GatewayRequest;
  transformResponse(res: Response, serviceResponse: any): GatewayResponse;
  selectService(route: RouteConfig, request: GatewayRequest): Promise<any>;
}

export class GatewayRoutingService implements RoutingService {
  private routeConfigs: RouteConfig[] = routeConfig;

  async routeRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Transform request
      const gatewayRequest = this.transformRequest(req);
      
      // Get route configuration
      const routeConfig = this.getRouteConfig(req.path, req.method);
      
      if (!routeConfig) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ROUTE_NOT_FOUND',
            message: 'No route configuration found for this path and method',
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        });
      }

      // Select service
      const service = await this.selectService(routeConfig, gatewayRequest);
      
      if (!service) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'No healthy service instances available',
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        });
      }

      // Forward request to service
      const serviceResponse = await this.forwardRequest(service, gatewayRequest, routeConfig);
      
      // Transform and send response
      const gatewayResponse = this.transformResponse(res, serviceResponse);
      this.sendResponse(res, gatewayResponse);

    } catch (error) {
      console.error('Routing error:', error);
      this.handleError(res, error);
    }
  }

  getRouteConfig(path: string, method: string): RouteConfig | null {
    // Find matching route configuration
    for (const route of this.routeConfigs) {
      const pathRegex = this.pathToRegex(route.path);
      if (pathRegex.test(path) && route.method === method) {
        return route;
      }
    }
    return null;
  }

  transformRequest(req: Request): GatewayRequest {
    return {
      id: req.headers['x-request-id'] as string || this.generateRequestId(),
      method: req.method,
      path: req.path,
      query: req.query,
      headers: req.headers,
      body: req.body,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      protocol: req.protocol,
      originalUrl: req.originalUrl,
    };
  }

  transformResponse(res: Response, serviceResponse: any): GatewayResponse {
    return {
      requestId: res.getHeader('x-request-id') as string || 'unknown',
      status: serviceResponse.status || 200,
      headers: serviceResponse.headers || {},
      data: serviceResponse.data,
      timestamp: new Date(),
      duration: Date.now() - (res.locals.startTime as number || Date.now()),
      serviceId: serviceResponse.serviceId,
    };
  }

  async selectService(route: RouteConfig, request: GatewayRequest): Promise<any> {
    // Get service instances from registry
    const serviceInstances = serviceRegistry.get(route.service);
    
    if (!serviceInstances || serviceInstances.length === 0) {
      return null;
    }

    // Use load balancer to select service
    const selectedService = loadBalancer.select(route.service, request);
    
    if (!selectedService) {
      return null;
    }

    return selectedService;
  }

  private async forwardRequest(service: any, request: GatewayRequest, route: RouteConfig): Promise<any> {
    // Get circuit breaker for this service
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker(service.id);
    
    try {
      // Execute request through circuit breaker
      const response = await circuitBreaker.execute(async () => {
        const startTime = Date.now();
        
        // Build service URL
        const serviceUrl = `${service.protocol}://${service.host}:${service.port}${request.path}`;
        
        // Make HTTP request
        const fetch = require('node-fetch');
        const response = await fetch(serviceUrl, {
          method: request.method,
          headers: {
            ...request.headers,
            'x-request-id': request.id,
            'x-forwarded-for': request.ip,
            'x-forwarded-proto': request.protocol,
            'x-service-id': service.id,
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        const data = await response.json();
        
        return {
          status: response.status,
          headers: response.headers.raw(),
          data: data,
          duration: Date.now() - startTime,
          serviceId: service.id,
        };
      });

      // Update load balancer stats
      loadBalancer.markRequestComplete(service.id, response.duration);

      return response;

    } catch (error) {
      // Update load balancer stats for failed requests
      loadBalancer.markRequestComplete(service.id);
      throw error;
    }
  }

  private sendResponse(res: Response, response: GatewayResponse): void {
    res.status(response.status);
    res.set(response.headers);
    res.json(response.data);
  }

  private handleError(res: Response, error: any): void {
    const statusCode = error.status || error.statusCode || 500;
    const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
    const message = error.message || 'An unexpected error occurred';

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: message,
        details: error.details || null,
      },
      timestamp: new Date().toISOString(),
      requestId: res.getHeader('x-request-id') || 'unknown',
    });
  }

  private pathToRegex(path: string): RegExp {
    // Convert path pattern to regex
    // Support for wildcards like /auth/*
    const regex = path
      .replace(/\*/g, '.*')
      .replace(/\/:([^/]+)/g, '/([^/]+)')
      .replace(/\//g, '\\/');
    
    return new RegExp(`^${regex}$`);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Path Transformation Service
export class PathTransformationService {
  private transformations: Map<string, string> = new Map();

  addTransformation(pattern: string, replacement: string): void {
    this.transformations.set(pattern, replacement);
  }

  transformPath(path: string): string {
    let transformedPath = path;

    for (const [pattern, replacement] of this.transformations) {
      const regex = new RegExp(pattern, 'g');
      transformedPath = transformedPath.replace(regex, replacement);
    }

    return transformedPath;
  }

  removeTransformation(pattern: string): void {
    this.transformations.delete(pattern);
  }

  clearTransformations(): void {
    this.transformations.clear();
  }
}

// Request Transformation Service
export class RequestTransformationService {
  transformHeaders(headers: Record<string, any>): Record<string, any> {
    // Add gateway-specific headers
    return {
      ...headers,
      'x-gateway-version': '1.0.0',
      'x-gateway-timestamp': new Date().toISOString(),
      'x-forwarded-by': 'maysar-api-gateway',
    };
  }

  transformBody(body: any, transformationRules: any): any {
    if (!body || !transformationRules) {
      return body;
    }

    let transformedBody = { ...body };

    // Apply transformation rules
    for (const [field, rule] of Object.entries(transformationRules)) {
      if (transformedBody[field] !== undefined) {
        transformedBody[field] = this.applyTransformation(transformedBody[field], rule);
      }
    }

    return transformedBody;
  }

  private applyTransformation(value: any, rule: any): any {
    switch (rule.type) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'date':
        return new Date(value).toISOString();
      case 'number':
        return Number(value);
      default:
        return value;
    }
  }
}

// Response Transformation Service
export class ResponseTransformationService {
  transformResponse(response: any, transformationRules: any): any {
    if (!response || !transformationRules) {
      return response;
    }

    let transformedResponse = { ...response };

    // Apply transformation rules
    for (const [field, rule] of Object.entries(transformationRules)) {
      if (transformedResponse[field] !== undefined) {
        transformedResponse[field] = this.applyTransformation(transformedResponse[field], rule);
      }
    }

    return transformedResponse;
  }

  private applyTransformation(value: any, rule: any): any {
    switch (rule.type) {
      case 'mask':
        return this.maskValue(value, rule.maskChar || '*', rule.maskLength || 4);
      case 'format':
        return this.formatValue(value, rule.format);
      case 'rename':
        return value;
      default:
        return value;
    }
  }

  private maskValue(value: any, maskChar: string, maskLength: number): string {
    if (typeof value !== 'string') {
      return value;
    }

    if (value.length <= maskLength) {
      return '*'.repeat(value.length);
    }

    return value.substring(0, value.length - maskLength) + '*'.repeat(maskLength);
  }

  private formatValue(value: any, format: string): string {
    if (typeof value !== 'string') {
      return value;
    }

    switch (format) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
      case 'phone':
        return value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      default:
        return value;
    }
  }
}

// Export default routing service
export const routingService = new GatewayRoutingService();
export const pathTransformationService = new PathTransformationService();
export const requestTransformationService = new RequestTransformationService();
export const responseTransformationService = new ResponseTransformationService();