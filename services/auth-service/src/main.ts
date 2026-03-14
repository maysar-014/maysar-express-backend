import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import dotenv from 'dotenv';
import { csrfTokenMiddleware } from '@shared/middleware/csrf.middleware';
import { createLogger } from '@shared/logger/logger';
import { tracingService, correlationMiddleware } from '@shared/tracing/openTelemetry';

const mainLogger = createLogger('AuthService-Bootstrap', 'auth-service');

// Import configuration
import { config } from './config';

// Import middleware
import { errorHandler } from './api/middleware/error-handler.middleware';
import { rateLimiter } from './api/middleware/rate-limiting.middleware';
import { requestLogger } from './api/middleware/logging.middleware';

// Import routes
import { createAuthRoutes } from './api/routes/auth.routes';
import { AuthController } from './api/controllers/auth.controller';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user.use-case';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { UserSyncEventHandlers } from './infrastructure/events/user-sync.event-handlers';
import { AuthEventPublisher } from './infrastructure/messaging/auth-event-publisher';
import { OutboxRepository } from '@shared/outbox/outbox.repository';
import { healthRoutes } from './api/routes/health.routes';
import { adminRoutes } from './api/routes/admin.routes';

// 2FA Imports
import { EncryptionService } from './2fa/infrastructure/services/encryption.service';
import { PrismaTwoFactorRepository } from './2fa/infrastructure/repositories/prisma-two-factor.repository';
import { SetupTwoFactorUseCase } from './2fa/application/use-cases/setup-two-factor.use-case';
import { VerifyTwoFactorSetupUseCase } from './2fa/application/use-cases/verify-two-factor-setup.use-case';
import { VerifyTwoFactorLoginUseCase } from './2fa/application/use-cases/verify-two-factor-login.use-case';
import { VerifyBackupCodeUseCase } from './2fa/application/use-cases/verify-backup-code.use-case';
import { DisableTwoFactorUseCase } from './2fa/application/use-cases/disable-two-factor.use-case';
import { RegenerateBackupCodesUseCase } from './2fa/application/use-cases/regenerate-backup-codes.use-case';
import { GetTwoFactorStatusUseCase } from './2fa/application/use-cases/get-two-factor-status.use-case';
import { TwoFactorController } from './2fa/api/controllers/two-factor.controller';
import { createTwoFactorRouter } from './2fa/api/routes/two-factor.routes';
import { QRCodeService } from './2fa/infrastructure/services/qr-code.service';

// Session Imports
import { createSessionRouter } from './session/api/routes/session.routes';
import { SessionEngine } from './domain/engines/session.engine';


// Import services
import { logger } from './infrastructure/services/logger.service';
import { initializeDatabase } from './infrastructure/database/connection';
import { initializeRedis } from './infrastructure/cache/connection';
import { metricsRegistry } from './infrastructure/monitoring/metrics';

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.port || 3001;

// Set up correlation ID tracking before anything else
app.use(correlationMiddleware());
app.use(cookieParser());
app.use(csrfTokenMiddleware);

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-CSRF-Token']
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

// Wire up AuthController and routes
const authPrisma = new PrismaClient();
const authOutboxRepository = new OutboxRepository(authPrisma, 'sharedOutboxEvent');
const authEventPublisher = new AuthEventPublisher(authOutboxRepository);
const userRepository = new PrismaUserRepository(authPrisma);
const registerUserUseCase = new RegisterUserUseCase(userRepository);
const authenticateUserUseCase = new AuthenticateUserUseCase(undefined, authEventPublisher);
const authController = new AuthController(registerUserUseCase, authenticateUserUseCase);
const authRoutes = createAuthRoutes(authController);

const userSyncHandlers = new UserSyncEventHandlers(authPrisma);
userSyncHandlers.registerHandlers();

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);

// Wire up 2FA
const encryptionService = new EncryptionService(process.env.TWO_FACTOR_ENCRYPTION_KEY || 'default-two-factor-encryption-key-32-chars!!');

const twoFactorRepository = new PrismaTwoFactorRepository(authPrisma, encryptionService);
const qrCodeService = new QRCodeService();

const setupTwoFactorUseCase = new SetupTwoFactorUseCase(twoFactorRepository, qrCodeService);
const verifyTwoFactorSetupUseCase = new VerifyTwoFactorSetupUseCase(twoFactorRepository, authEventPublisher);
const verifyTwoFactorLoginUseCase = new VerifyTwoFactorLoginUseCase(twoFactorRepository);
const verifyBackupCodeUseCase = new VerifyBackupCodeUseCase(twoFactorRepository);
const disableTwoFactorUseCase = new DisableTwoFactorUseCase(twoFactorRepository, authEventPublisher);
const regenerateBackupCodesUseCase = new RegenerateBackupCodesUseCase(twoFactorRepository);
const getTwoFactorStatusUseCase = new GetTwoFactorStatusUseCase(twoFactorRepository);

const twoFactorController = new TwoFactorController(
  setupTwoFactorUseCase,
  verifyTwoFactorSetupUseCase,
  verifyTwoFactorLoginUseCase,
  verifyBackupCodeUseCase,
  disableTwoFactorUseCase,
  regenerateBackupCodesUseCase,
  getTwoFactorStatusUseCase
);

app.use('/api/v1/auth/2fa', createTwoFactorRouter(twoFactorController));

// Wire up Session
const sessionEngine = new SessionEngine();
app.use('/api/v1/sessions', createSessionRouter(sessionEngine));


// Swagger documentation (development only)
if (config.environment === 'development') {
  // Swagger setup would go here in future phases
}

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

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
  logger.error('Unhandled Rejection', { at: promise, reason });
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

let server: any;

// Start server
async function startServer() {
  try {
    // Initialize tracing
    tracingService.start();

    // Initialize infrastructure
    logger.info('Initializing infrastructure...');

    await Promise.all([
      initializeDatabase(),
      initializeRedis()
    ]);

    logger.info('Infrastructure initialized successfully');

    // Start HTTP server
    server = app.listen(config.port, () => {
      mainLogger.info(`Auth service started on port ${config.port}`);
      logger.info(`📍 Server running on http://${config.host}:${PORT}`);
      logger.info(`🌍 Environment: ${config.environment}`);
      logger.info(`📊 Health check: http://${config.host}:${PORT}/health`);
      logger.info(`🔐 API endpoints: http://${config.host}:${PORT}/api/v1`);
    });

    // Handle server errors
    server.on('error', (error: Error) => {
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
