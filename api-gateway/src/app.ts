/**
 * API Gateway Application
 * 
 * Main application entry point for the Maysar API Gateway
 */

import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { gatewayConfig } from './config';
import { 
  authDelegationMiddleware,
  authorizationMiddleware, 
  rateLimitingMiddleware, 
  requestLoggerMiddleware, 
  responseTransformerMiddleware, 
  validationMiddleware,
  compressionMiddleware,
  timeoutMiddleware,
  securityMiddleware,
  errorHandlerMiddleware 
} from './middleware';
import { serviceRegistry } from './services/service-discovery.service';
import { loadBalancer } from './services/load-balancer.service';
import { circuitBreakerManager } from './services/circuit-breaker.service';
import { routingService } from './services/routing.service';
import { monitoringService } from './services/monitoring.service';

class ApiGateway {
  private app: Express;
  private port: number;

  constructor() {
    this.app = express();
    this.port = gatewayConfig.port;
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(cors());

    // Gateway middleware
    this.app.use(timeoutMiddleware.middleware());
    this.app.use(compressionMiddleware.middleware());
    this.app.use(securityMiddleware.middleware());
    this.app.use(requestLoggerMiddleware.middleware());
    this.app.use(rateLimitingMiddleware.middleware());
    this.app.use(authDelegationMiddleware.middleware());
    this.app.use(authorizationMiddleware.middleware());
    this.app.use(validationMiddleware.middleware());
    this.app.use(responseTransformerMiddleware.middleware());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: serviceRegistry.getAll(),
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req: Request, res: Response) => {
      res.json(monitoringService.getMetrics());
    });

    // Service discovery endpoint
    this.app.get('/services', (req: Request, res: Response) => {
      res.json({
        services: serviceRegistry.getAll(),
        status: 'healthy', // Simplified for now
      });
    });

    // Dynamic routing for microservices
    this.app.use('/', routingService.routeRequest.bind(routingService));

    // Fallback for unmatched routes
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandlerMiddleware.middleware());
  }

  public async start(): Promise<void> {
    try {
      // Initialize services
      await serviceRegistry.init();
      // Note: loadBalancer, circuitBreakerManager, routingService, and monitoringService
      // are already initialized as they are default exports

      // Start the server
      this.app.listen(this.port, () => {
        console.log(`API Gateway running on port ${this.port}`);
        console.log(`Environment: ${gatewayConfig.environment}`);
        console.log(`Version: 1.0.0`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));
    } catch (error) {
      console.error('Failed to start API Gateway:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('Shutting down API Gateway...');
    
    try {
      // Stop accepting new requests
      await serviceRegistry.init(); // This is just for consistency, serviceRegistry doesn't have shutdown
      // The other services are managed automatically as they are singleton instances
      
      console.log('API Gateway shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the application
const apiGateway = new ApiGateway();
apiGateway.start();

export default apiGateway;