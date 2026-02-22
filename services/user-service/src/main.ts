import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { DatabaseConnection } from './infrastructure/database/prisma-client';
import { logger } from './infrastructure/services/logger.service';
import { createUserRoutes } from './api/routes/user.routes';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { validationErrorHandler } from './api/middleware/validation.middleware';

/**
 * User Service - Enterprise-grade user management microservice
 * Handles user registration, profile management, verification, and search
 */

class UserServiceApplication {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3001', 10);

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeEventHandlers();
  }

  /**
   * Initialize Express middleware
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
          'http://localhost:3000',     // Development frontend
          'https://maysar.com',        // Production domain
          'https://admin.maysar.com',  // Admin console
          'https://api.maysar.com'     // API gateway
        ];

        // Check if origin is allowed
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Allow all subdomains of maysar.com
        if (origin.endsWith('.maysar.com')) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Request-ID',
        'X-Forwarded-For'
      ]
    }));

    // Compression
    this.app.use(compression({
      level: 6, // Good balance between compression and performance
      threshold: 1024, // Only compress responses larger than 1KB
      filter: (req, res) => {
        // Don't compress responses with this request header
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Body parsing
    this.app.use(express.json({
      limit: '10mb',
      strict: true,
      verify: (_req, _res, buf) => {
        // Store raw body for webhook signature verification
        (_req as any).rawBody = buf;
      }
    }));

    this.app.use(express.urlencoded({
      extended: true,
      limit: '10mb'
    }));

    // Request logging
    this.app.use(requestLogger);

    // Health check (no rate limiting)
    this.app.use('/health', healthRoutes);
  }

  /**
   * Initialize API routes
   */
  private initializeRoutes(): void {
    // Create user routes
    const userRoutes = createUserRoutes();

    // API versioning
    this.app.use('/api/v1', userRoutes);

    // Root endpoint
    this.app.get('/', (_req: express.Request, res: express.Response) => {
      res.json({
        service: 'User Service',
        version: '1.0.0',
        description: 'Enterprise-grade user management microservice',
        endpoints: {
          health: '/health',
          users: '/api/v1/users',
          docs: '/api/docs'
        },
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use('*', (req: express.Request, res: express.Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // Validation error handler
    this.app.use(validationErrorHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Initialize event handlers for asynchronous background processing
   */
  private async initializeEventHandlers(): Promise<void> {
    try {
      const { CODReputationEngine } = await import('./domain/engines/cod-reputation.engine');
      const { UpdateCODReputationUseCase } = await import('./application/use-cases/update-cod-reputation.use-case');
      const { CODEventHandler } = await import('./infrastructure/messaging/cod-event-handlers');
      // Using the concrete repository
      const { DatabaseUserRepository } = await import('./infrastructure/repositories/user.repository');

      const userRepository = new DatabaseUserRepository();
      const reputationEngine = new CODReputationEngine();
      const updateCODReputationUseCase = new UpdateCODReputationUseCase(userRepository, reputationEngine);

      const codEventHandler = new CODEventHandler(updateCODReputationUseCase);
      codEventHandler.setupSubscriptions();

      logger.info('✅ COD Event Handlers initialized');
    } catch (error) {
      logger.warn('⚠️ Failed to initialize COD Event Handlers', { error });
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Initialize database connection
      await DatabaseConnection.initialize();

      // Start HTTP server
      this.app.listen(this.port, '0.0.0.0', () => {
        logger.info('User Service started successfully', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0'
        });
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start User Service', { error });
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handling
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);

      try {
        // Close database connections
        await DatabaseConnection.close();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', { error });
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      shutdown('unhandledRejection');
    });
  }

  /**
   * Get the Express application instance
   * Useful for testing
   */
  getApp(): express.Application {
    return this.app;
  }
}

// Create and start the application
const application = new UserServiceApplication();

// Start the server if this file is run directly
if (require.main === module) {
  application.start().catch((error) => {
    logger.error('Failed to start application', { error });
    process.exit(1);
  });
}

export default application;
