import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { DatabaseConnection } from './infrastructure/database/prisma-client';
import { logger } from './infrastructure/services/logger.service';
import { tracingService, correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';
import { createNotificationRoutes } from './api/routes/notification.routes';
import { createTemplateRoutes } from './api/routes/template.routes';
import { createPreferenceRoutes } from './api/routes/preference.routes';
import { createSmsRouter } from './sms/api/routes';
import { eventBus } from '@shared/events/eventBus';
import { i18next, i18nextMiddleware } from '@shared/i18n/i18n';

import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { validationErrorHandler } from './api/middleware/validation.middleware';
import { NotificationController } from './api/controllers/notification.controller';
import { TemplateController } from './api/controllers/template.controller';
import { PreferenceController } from './api/controllers/preference.controller';
import { SendNotificationUseCase } from './application/use-cases/send-notification.use-case';
import { GetNotificationHistoryUseCase } from './application/use-cases/get-notification-history.use-case';
import { RetryFailedNotificationUseCase } from './application/use-cases/retry-failed-notification.use-case';
import { CreateTemplateUseCase } from './application/use-cases/create-template.use-case';
import { UpdatePreferenceUseCase } from './application/use-cases/update-preference.use-case';
import { NotificationValidationService } from './domain/services/notification-validation.service';
import { NotificationDeliveryPolicy } from './domain/policies/notification-delivery.policy';
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository';
import { PrismaTemplateRepository } from './infrastructure/repositories/prisma-template.repository';
import { PrismaPreferenceRepository } from './infrastructure/repositories/prisma-preference.repository';
import { executeNotificationDeliverySaga } from './application/sagas/notification-delivery.saga';
import { Notification } from './domain/entities/notification.entity';

/**
 * Notification Service - Multi-channel notification microservice
 */

const notificationRepository = new PrismaNotificationRepository();
const templateRepository = new PrismaTemplateRepository();
const preferenceRepository = new PrismaPreferenceRepository();
const validationService = new NotificationValidationService();
const deliveryPolicy = new NotificationDeliveryPolicy();

async function sendViaChannel(notification: Notification): Promise<void> {
  const content = notification.content.getValue();
  const subject = notification.subject;
  if (notification.channel === 'email' && notification.deliveryAddress) {
    const { EmailProviderAdapter } = await import('./infrastructure/adapters/email-provider.adapter');
    const email = new EmailProviderAdapter();
    await email.send(notification.deliveryAddress.getValue(), subject, content);
  } else if (notification.channel === 'sms' && notification.deliveryAddress) {
    const { SmsProviderAdapter } = await import('./infrastructure/adapters/sms-provider.adapter');
    const sms = new SmsProviderAdapter();
    await sms.send(notification.deliveryAddress.getValue(), content);
  } else if (notification.channel === 'push' && notification.deliveryAddress) {
    const { PushProviderAdapter } = await import('./infrastructure/adapters/push-provider.adapter');
    const push = new PushProviderAdapter();
    await push.send(notification.deliveryAddress.getValue(), { title: subject, body: content });
  }
  // in-app: stored in DB already
}

async function recordMetrics(notificationId: string, channel: string): Promise<void> {
  logger.debug('Record delivery metrics', { notificationId, channel });
}

async function triggerDeliverySaga(notification: Notification): Promise<void> {
  await executeNotificationDeliverySaga(
    notification,
    notificationRepository,
    preferenceRepository,
    validationService,
    sendViaChannel,
    recordMetrics
  );
}

const sendNotificationUseCase = new SendNotificationUseCase(
  notificationRepository,
  preferenceRepository,
  validationService,
  deliveryPolicy,
  triggerDeliverySaga
);
const getHistoryUseCase = new GetNotificationHistoryUseCase(notificationRepository);
const retryFailedUseCase = new RetryFailedNotificationUseCase(
  notificationRepository,
  deliveryPolicy,
  triggerDeliverySaga
);
const createTemplateUseCase = new CreateTemplateUseCase(templateRepository, validationService);
const updatePreferenceUseCase = new UpdatePreferenceUseCase(preferenceRepository);

const notificationController = new NotificationController(
  sendNotificationUseCase,
  getHistoryUseCase,
  retryFailedUseCase,
  notificationRepository
);
const templateController = new TemplateController(createTemplateUseCase, templateRepository);
const preferenceController = new PreferenceController(updatePreferenceUseCase, preferenceRepository);

class NotificationServiceApplication {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3004', 10);
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    this.app.use(correlationMiddleware()); // Correlation ID tracking
    this.app.use(i18nextMiddleware.handle(i18next));
    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(cors({ origin: true, credentials: true }));
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(requestLogger);
    this.app.use('/health', healthRoutes);

    // Prometheus metrics
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', metricsRegistry.contentType);
      res.end(await metricsRegistry.metrics());
    });
  }

  private initializeRoutes(): void {
    this.app.use('/api/v1/notifications', createNotificationRoutes(notificationController));
    this.app.use('/api/v1/templates', createTemplateRoutes(templateController));
    this.app.use('/api/v1/preferences', createPreferenceRoutes(preferenceController));
    this.app.use('/api/v1/sms', createSmsRouter());

    this.app.get('/', (_req, res) => {
      res.json({
        service: 'Notification Service',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          notifications: '/api/v1/notifications',
          templates: '/api/v1/templates',
          preferences: '/api/v1/preferences',
          sms: '/api/v1/sms'
        },

        timestamp: new Date().toISOString()
      });
    });
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.originalUrl} not found` });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(validationErrorHandler);
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    try {
      await DatabaseConnection.initialize();
      
      // Initialize Saga Event Handlers
      await this.initializeEventHandlers();
      
      this.app.listen(this.port, '0.0.0.0', () => {
        logger.info(`Notification Service running on port ${this.port} `, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development'
        });
      });
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start Notification Service', { error });
      process.exit(1);
    }
  }

  private async initializeEventHandlers(): Promise<void> {
    try {
      const { eventBus } = await import('@shared/events/eventBus');
      const { SagaEventHandler } = await import('./application/sagas/saga-event-handler');
      
      const sagaEventHandler = new SagaEventHandler(
        notificationRepository,
        preferenceRepository,
        validationService,
        sendViaChannel,
        recordMetrics
      );
      sagaEventHandler.setupSubscriptions(eventBus);
      
      logger.info('✅ Notification Saga Event Handlers initialized');
    } catch (error) {
      logger.warn('⚠️ Failed to initialize Notification Saga Event Handlers', { error });
    }

    // Initialize Saga Recovery Worker
    try {
      const { NotificationDeliverySaga } = await import('./application/sagas/notification-delivery.saga');
      const { BatchNotificationSaga } = await import('./application/sagas/batch-notification.saga');
      const { ScheduledNotificationSaga } = await import('./application/sagas/scheduled-notification.saga');
      const { sagaLogRepository } = await import('./infrastructure/repositories/saga.repository');
      const { SagaRecoveryWorker } = await import('@shared/saga/saga-recovery.worker');

      const notificationDeliverySaga = new NotificationDeliverySaga(
        notificationRepository,
        preferenceRepository,
        validationService,
        sendViaChannel,
        recordMetrics
      );
      
      const batchNotificationSaga = new BatchNotificationSaga(async (n) => {
        await triggerDeliverySaga(n);
      });
      
      const scheduledNotificationSaga = new ScheduledNotificationSaga(
        notificationRepository,
        triggerDeliverySaga
      );
      
      const orchestratorRegistry = new Map<string, any>();
      orchestratorRegistry.set('NotificationDeliverySaga', notificationDeliverySaga as any);
      orchestratorRegistry.set('BatchNotificationSaga', batchNotificationSaga as any);
      orchestratorRegistry.set('ScheduledNotificationSaga', scheduledNotificationSaga as any);

      const sagaRecoveryWorker = new SagaRecoveryWorker(sagaLogRepository, orchestratorRegistry, {
        stuckThresholdMs: 5 * 60 * 1000,
        pollIntervalMs: 60 * 1000
      });
      sagaRecoveryWorker.start();

      logger.info('✅ Saga Recovery Worker initialized with 3 registered saga types');
    } catch (error) {
      logger.warn('⚠️ Failed to initialize Saga Recovery Worker', { error });
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down...`);
      try {
        await DatabaseConnection.close();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  getApp(): express.Application {
    return this.app;
  }
}

// Initialize Tracing
tracingService.start();

const application = new NotificationServiceApplication();

if (require.main === module) {
  application.start().catch((error) => {
    logger.error('Failed to start application', { error });
    process.exit(1);
  });
}

export default application;
