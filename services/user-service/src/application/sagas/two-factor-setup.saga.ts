import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { auditClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from './service-clients';

export interface TwoFactorSetupEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  method: 'totp' | 'sms';
  deviceId?: string;
  timestamp: Date;
  metadata?: { correlationId: string };
}

export class TwoFactorSetupSaga extends DistributedSagaOrchestrator<TwoFactorSetupEvent> {
  protected sagaType = 'TwoFactorSetupSaga';
  private backupCodesGenerated = false;

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationClient: NotificationServiceClient
  ) {
    super(sagaLogRepository, 'user-service');
  }

  protected async onStart(sagaId: string, payload: TwoFactorSetupEvent, correlationId?: string): Promise<void> {
    logger.info(`Starting TwoFactorSetupSaga for user ${payload.userId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating TwoFactorSetupSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<TwoFactorSetupEvent>[] {
    return [
      {
        name: 'RegisterDevice',
        execute: async (payload, sagaId) => {
          logger.info('Registering 2FA device', { userId: payload.userId, method: payload.method, sagaId });
          // Device registration logic
        },
        compensate: async (payload, sagaId) => {
          logger.info('Unregistering 2FA device', { userId: payload.userId, sagaId });
          // Remove device registration
        }
      },
      {
        name: 'GenerateBackupCodes',
        execute: async (payload, sagaId) => {
          logger.info('Generating backup codes', { userId: payload.userId, sagaId });
          this.backupCodesGenerated = true;
          // Generate and store backup codes
        },
        compensate: async (payload, sagaId) => {
          if (this.backupCodesGenerated) {
            logger.info('Invalidating backup codes', { userId: payload.userId, sagaId });
            // Invalidate backup codes
          }
        }
      },
      {
        name: 'RecordAuditEvent',
        execute: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, '2fa_setup', {
            method: payload.method,
            deviceId: payload.deviceId
          });
        },
        compensate: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, '2fa_setup_compensated', {
            originalEventId: payload.eventId
          });
        }
      },
      {
        name: 'SendConfirmationNotification',
        execute: async (payload, sagaId) => {
          await this.notificationClient.sendPushNotification(
            payload.userId,
            '2FA Enabled',
            `Two-factor authentication using ${payload.method} has been enabled.`
          );
        },
        compensate: async (payload, sagaId) => {
          // Cannot unsend notification
        }
      }
    ];
  }
}

export async function executeTwoFactorSetupSaga(
  event: TwoFactorSetupEvent,
  emailService: EmailService,
  notificationClient: NotificationServiceClient
): Promise<void> {
  const saga = new TwoFactorSetupSaga(emailService, notificationClient);
  const correlationId = event.metadata?.correlationId || uuidv4();

  try {
    await saga.start(event, correlationId);
  } catch (error) {
    logger.error('Two factor setup saga failed to start', {
      error: error instanceof Error ? error.message : String(error),
      userId: event.userId,
      correlationId
    });
    throw error;
  }
}
