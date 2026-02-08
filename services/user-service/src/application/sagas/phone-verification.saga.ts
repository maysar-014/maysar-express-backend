import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { auditClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from './service-clients';

export interface PhoneVerificationEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  phoneNumber: string;
  verificationMethod: 'otp' | 'call';
  timestamp: Date;
  metadata?: { correlationId: string };
}

export class PhoneVerificationSaga extends DistributedSagaOrchestrator<PhoneVerificationEvent> {
  protected sagaType = 'PhoneVerificationSaga';

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationClient: NotificationServiceClient
  ) {
    super(sagaLogRepository, 'user-service');
  }

  protected async onStart(sagaId: string, payload: PhoneVerificationEvent, correlationId?: string): Promise<void> {
    logger.info(`Starting PhoneVerificationSaga for user ${payload.userId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating PhoneVerificationSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<PhoneVerificationEvent>[] {
    return [
      {
        name: 'ValidateOTP',
        execute: async (payload, sagaId) => {
          logger.info('Validating OTP', { userId: payload.userId, method: payload.verificationMethod, sagaId });
          // OTP validation logic
        },
        compensate: async (payload, sagaId) => {
          logger.info('Invalidating OTP', { userId: payload.userId, sagaId });
          // Invalidate OTP
        }
      },
      {
        name: 'UpdatePhoneStatus',
        execute: async (payload, sagaId) => {
          logger.info('Updating phone verification status', { userId: payload.userId, sagaId });
          // Mark phone as verified in database
        },
        compensate: async (payload, sagaId) => {
          logger.info('Reverting phone verification status', { userId: payload.userId, sagaId });
          // Mark phone as unverified
        }
      },
      {
        name: 'RecordAuditEvent',
        execute: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, 'phone_verified', {
            phoneNumber: payload.phoneNumber,
            method: payload.verificationMethod
          });
        },
        compensate: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, 'phone_verification_compensated', {
            originalEventId: payload.eventId
          });
        }
      },
      {
        name: 'SendConfirmationNotification',
        execute: async (payload, sagaId) => {
          await this.notificationClient.sendSMS(
            payload.userId,
            'Phone number verified successfully'
          );
        },
        compensate: async (payload, sagaId) => {
          // Cannot unsend SMS
        }
      }
    ];
  }
}

export async function executePhoneVerificationSaga(
  event: PhoneVerificationEvent,
  emailService: EmailService,
  notificationClient: NotificationServiceClient
): Promise<void> {
  const saga = new PhoneVerificationSaga(emailService, notificationClient);
  const correlationId = event.metadata?.correlationId || uuidv4();

  try {
    await saga.start(event, correlationId);
  } catch (error) {
    logger.error('Phone verification saga failed to start', {
      error: error instanceof Error ? error.message : String(error),
      userId: event.userId,
      correlationId
    });
    throw error;
  }
}
