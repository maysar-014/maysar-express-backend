import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { DatabaseConnection } from './src/infrastructure/database/prisma-client';

import { createSmsRouter } from './src/sms/api/routes';
import { healthRoutes as smsHealthRoutes } from './src/sms/api/routes/health.routes';
import { createNotificationRoutes } from './src/api/routes/notification.routes';
import { createTemplateRoutes } from './src/api/routes/template.routes';
import { createPreferenceRoutes } from './src/api/routes/preference.routes';
import { healthRoutes as notificationHealthRoutes } from './src/api/routes/health.routes';
import { NotificationController } from './src/api/controllers/notification.controller';
import { TemplateController } from './src/api/controllers/template.controller';
import { PreferenceController } from './src/api/controllers/preference.controller';
import { SendNotificationUseCase } from './src/application/use-cases/send-notification.use-case';
import { GetNotificationHistoryUseCase } from './src/application/use-cases/get-notification-history.use-case';
import { RetryFailedNotificationUseCase } from './src/application/use-cases/retry-failed-notification.use-case';
import { CreateTemplateUseCase } from './src/application/use-cases/create-template.use-case';
import { UpdatePreferenceUseCase } from './src/application/use-cases/update-preference.use-case';
import { NotificationValidationService } from './src/domain/services/notification-validation.service';
import { NotificationDeliveryPolicy } from './src/domain/policies/notification-delivery.policy';
import { PrismaNotificationRepository } from './src/infrastructure/repositories/prisma-notification.repository';
import { PrismaTemplateRepository } from './src/infrastructure/repositories/prisma-template.repository';
import { PrismaPreferenceRepository } from './src/infrastructure/repositories/prisma-preference.repository';
import { executeNotificationDeliverySaga } from './src/application/sagas/notification-delivery.saga';
import { Notification } from './src/domain/entities/notification.entity';
import { eventBus } from '../../shared/events/eventBus';

const notificationRepository = new PrismaNotificationRepository();
const templateRepository = new PrismaTemplateRepository();
const preferenceRepository = new PrismaPreferenceRepository();
const validationService = new NotificationValidationService();
const deliveryPolicy = new NotificationDeliveryPolicy();

async function sendViaChannel(notification: Notification): Promise<void> {
    const content = notification.content.getValue();
    const subject = notification.subject;
    if (notification.channel === 'email' && notification.deliveryAddress) {
        const { EmailProviderAdapter } = await import('./src/infrastructure/adapters/email-provider.adapter');
        const email = new EmailProviderAdapter();
        await email.send(notification.deliveryAddress.getValue(), subject, content);
    } else if (notification.channel === 'sms' && notification.deliveryAddress) {
        const { SmsProviderAdapter } = await import('./src/infrastructure/adapters/sms-provider.adapter');
        const sms = new SmsProviderAdapter();
        await sms.send(notification.deliveryAddress.getValue(), content);
    } else if (notification.channel === 'push' && notification.deliveryAddress) {
        const { PushProviderAdapter } = await import('./src/infrastructure/adapters/push-provider.adapter');
        const push = new PushProviderAdapter();
        await push.send(notification.deliveryAddress.getValue(), { title: subject, body: content });
    }
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


export const NotificationModule: Module = {
    name: 'notification-service',
    initialize: async () => {
        logger.info('Initializing notification-service module (fully merged)');
        await DatabaseConnection.initialize();

        // Initialize SMS service
        try {
            const { SmsModule } = require('./src/sms/index');
            if (SmsModule && SmsModule.initialize) {
                await SmsModule.initialize();
                logger.info('SMS service initialized');
            }
        } catch (e) {
            logger.warn('SMS service not initialized:', e);
        }

        // Initialize Saga Event Handlers
        try {
            const { SagaEventHandler } = await import('./src/application/sagas/saga-event-handler');
            const sagaEventHandler = new SagaEventHandler(
                notificationRepository,
                preferenceRepository,
                validationService,
                sendViaChannel,
                recordMetrics
            );
            sagaEventHandler.setupSubscriptions(eventBus);
            logger.info('Notification Saga Event Handlers initialized');
        } catch (error) {
            logger.warn('Failed to initialize Notification Saga Event Handlers', { error });
        }

        // Initialize Saga Recovery Worker
        try {
            const { NotificationDeliverySaga } = await import('./src/application/sagas/notification-delivery.saga');
            const { BatchNotificationSaga } = await import('./src/application/sagas/batch-notification.saga');
            const { ScheduledNotificationSaga } = await import('./src/application/sagas/scheduled-notification.saga');
            const { sagaLogRepository } = await import('./src/infrastructure/repositories/saga.repository');
            const { SagaRecoveryWorker } = await import('../../shared/saga/saga-recovery.worker');

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
        } catch (error) {
            logger.warn('Failed to initialize Saga Recovery Worker', { error });
        }
    },
    routes: (() => {
        const router = Router();

        // Mount SMS routes under /sms
        router.use('/sms', createSmsRouter());
        router.use('/sms/health', smsHealthRoutes);

        // Mount notification API routes (previously unmounted)
        router.use('/notifications', createNotificationRoutes(notificationController));
        router.use('/templates', createTemplateRoutes(templateController));
        router.use('/preferences', createPreferenceRoutes(preferenceController));
        router.use('/health', notificationHealthRoutes);

        // Fallback health summary (kept for compatibility)
        router.get('/health-summary', (req, res) => {
            res.json({
                status: 'ok',
                service: 'notification-service',
                modules: ['notification', 'sms'],
                timestamp: new Date().toISOString()
            });
        });

        return router;
    })(),
    shutdown: async () => {
        logger.info('Shutting down notification-service module');
        try {
            const { SmsModule } = require('./src/sms/index');
            if (SmsModule && SmsModule.shutdown) {
                await SmsModule.shutdown();
            }
        } catch (e) {
            logger.warn('SMS shutdown error:', e);
        }
        try {
            await DatabaseConnection.close();
        } catch (e) {
            logger.warn('Database shutdown error:', e);
        }
    }
};
