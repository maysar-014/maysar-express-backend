import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { createPrismaClient } from '@shared/database/prisma-client';
import { createSafeFileTransports } from '../../../shared/logger/file-transports';

// Infrastructure components
import { PrismaPostRepository } from './infrastructure/repositories/prisma-post.repository';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { EventBus, eventBus } from '@shared-events/eventBus';
import { RedisCache } from './infrastructure/cache/redis-cache';
import { UuidGeneratorService } from './infrastructure/services/uuid-generator.service';

// Application components
import { CreatePostUseCase } from './application/use-cases/create-post.use-case';

// API components
import { PostsController } from './api/controllers/posts.controller';
import { createPostsRoutes } from './api/routes/posts.routes';

// Domain components
import { FeedEngine } from './domain/engines/feed-engine';

import { tracingService, correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';
import { createRateLimitMiddleware } from './api/middleware/rate-limiting.middleware';

/**
 * Community Service Main Application
 * Production-ready microservice with clean architecture
 */
class CommunityService {
  private app: express.Application;
  private prisma!: PrismaClient;
  private eventPublisher!: EventBus;
  private cache!: RedisCache;
  private logger: winston.Logger;


  constructor() {
    this.app = express();
    this.prisma = createPrismaClient();
    this.logger = this.setupLogger();
    this.cache = new RedisCache();

    this.initializeInfrastructure();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Initialize infrastructure components
   */
  private async initializeInfrastructure(): Promise<void> {
    try {
      // Initialize database
      await this.prisma.$connect();
      this.logger.info('Database connected successfully');

      // Initialize cache
      await this.cache.connect();
      this.logger.info('Cache connected successfully');

      // Initialize event publisher
      this.eventPublisher = eventBus;
      this.logger.info('Shared event bus initialized');

    } catch (error) {

      this.logger.error('Failed to initialize infrastructure:', error);
      process.exit(1);
    }
  }

  /**
   * Setup logging
   */
  private setupLogger(): winston.Logger {
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'community-service' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        ...createSafeFileTransports([
          {
            filename: 'logs/error.log',
            level: 'error'
          },
          {
            filename: 'logs/combined.log'
          }
        ])
      ]
    });
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(correlationMiddleware());

    // Rate limiting (Redis-backed)
    this.app.use(createRateLimitMiddleware(this.cache));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'community-service',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // Prometheus metrics
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', metricsRegistry.contentType);
      res.end(await metricsRegistry.metrics());
    });

    // API routes
    const postRepository = new PrismaPostRepository(this.prisma);
    const userRepository = new PrismaUserRepository(this.prisma);
    const idGenerator = new UuidGeneratorService();
    const feedEngine = new FeedEngine();

    // Use cases
    const createPostUseCase = new CreatePostUseCase(postRepository, idGenerator);

    // Controllers
    const postsController = new PostsController(createPostUseCase, postRepository, feedEngine);

    // Routes
    this.app.use('/api/posts', createPostsRoutes(this.prisma));

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'NotFoundError',
        message: `Route ${req.method} ${req.path} not found`
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
      });

      res.status(500).json({
        error: 'InternalServerError',
        message: 'An unexpected error occurred'
      });
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const port = process.env.PORT || 3002;

    this.app.listen(port, () => {
      this.logger.info(`Community Service listening on port ${port}`);
      this.logger.info('Service started successfully');
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Community Service...');

    try {
      // EventBus doesn't have shutdown method - it's in-memory
      // Close database connection
      await this.prisma.$disconnect();
      this.logger.info('Database disconnected');

      // Close cache connection
      await this.cache.disconnect();
      this.logger.info('Cache disconnected');

      this.logger.info('Community Service shut down gracefully');
      process.exit(0);

    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Initialize Tracing
tracingService.start();

// Start the application
const service = new CommunityService();

// Graceful shutdown handlers
process.on('SIGTERM', () => service.shutdown());
process.on('SIGINT', () => service.shutdown());

// Start the service
service.start().catch((error) => {
  console.error('Failed to start Community Service:', error);
  process.exit(1);
});
