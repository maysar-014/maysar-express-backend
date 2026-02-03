import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import dotenv from 'dotenv';

// Import configuration
import { config } from './config';

// Import middleware
import { errorHandler } from './api/middleware/error-handler.middleware';
import { rateLimiter } from './api/middleware/rate-limiting.middleware';
import { requestLogger } from './api/middleware/logging.middleware';
import { validationMiddleware } from './api/middleware/validation.middleware';

// Import routes
import { authRoutes } from './api/routes/auth.routes';
import { healthRoutes } from './api/routes/health.routes';
import { adminRoutes } from './api/routes/admin.routes';

// Import services
import { logger } from './infrastructure/services/logger.service';
import { initializeDatabase } from './infrastructure/database/connection';
import { initializeRedis } from './infrastructure/cache/connection';
import { initializeKafka } from './infrastructure/messaging/connection';

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.port || 3001;

// Security middleware
app.use(helmet({
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
  app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
  }));

  // Compression middleware
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req: any, res: any) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Body parsing middleware
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Logging middleware
  app.use(requestLogger);

  // Rate limiting
  app.use(rateLimiter);

  // Health check (no auth required)
  app.use('/health', healthRoutes);

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // Swagger documentation (development only)
  if (config.environment === 'development') {
    // Swagger setup would go here in future phases
  }

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, initiating graceful shutdown`);

  server.close(async () => {
    logger.info('HTTP server closed');

    // Close database connections
    await Promise.all([
      // Database cleanup
      // Redis cleanup
      // Kafka cleanup
    ]);

    logger.info('All connections closed, exiting');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, but log the error
  if (config.environment === 'development') {
    process.exit(1);
  }
});

// Uncaught exception handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
async function startServer() {
  try {
    // Initialize infrastructure
    logger.info('Initializing infrastructure...');

    await Promise.all([
      initializeDatabase(),
      initializeRedis(),
      initializeKafka()
    ]);

    logger.info('Infrastructure initialized successfully');

    // Start HTTP server
    const server = app.listen(PORT, config.host, () => {
      logger.info(`🚀 Auth Service started successfully`);
      logger.info(`📍 Server running on http://${config.host}:${PORT}`);
      logger.info(`🌍 Environment: ${config.environment}`);
      logger.info(`📊 Health check: http://${config.host}:${PORT}/health`);
      logger.info(`🔐 API endpoints: http://${config.host}:${PORT}/api/v1`);
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });

    return server;

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer().catch((error) => {
  logger.error('Application startup failed:', error);
  process.exit(1);
});
