import { UserEmailVerifiedEvent } from '../../domain/events';
import { logger } from '../../infrastructure/services/logger.service';
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from './service-clients';

export interface EmailVerificationContext {
  event: UserEmailVerifiedEvent;
  metadata: {
    correlationId: string;
    userId: string;
    timestamp: Date;
  };
}

export class EmailVerificationSaga extends DistributedSagaOrchestrator<EmailVerificationContext> {
  protected sagaType = 'EmailVerificationSaga';

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationClient: NotificationServiceClient
  ) {
    super(sagaLogRepository, 'user-service');
  }

  protected async onStart(sagaId: string, payload: EmailVerificationContext, correlationId?: string): Promise<void> {
    logger.info(`Starting EmailVerificationSaga for user ${payload.metadata.userId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating EmailVerificationSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<EmailVerificationContext>[] {
    return [
      {
        name: 'UpdateUserStatus',
        execute: async (context, sagaId) => {
          logger.info('Updating user status to verified', { userId: context.metadata.userId, sagaId });
        },
        compensate: async (context, sagaId) => {
          logger.info('Compensating: Reverting user status', { userId: context.metadata.userId, sagaId });
        }
      },
      {
        name: 'SendConfirmationEmail',
        execute: async (context, sagaId) => {
          logger.info('Sending confirmation email', { userId: context.metadata.userId, sagaId });
          const subject = 'Your email has been verified';
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Email Verified</h2>
              <p>Hi,</p>
              <p>Your email address has been successfully verified.</p>
              <p>If you did not perform this action, please contact support immediately.</p>
              <p>Best regards,<br/>The Maysar Team</p>
            </div>
          `;
          await this.emailService.sendEmail(context.event.email, subject, html);
        },
        compensate: async (context, sagaId) => {
          logger.info('Compensating: Removing confirmation email', { userId: context.metadata.userId, sagaId });
        }
      }
    ];
  }
}

export async function executeEmailVerificationSaga(
  event: UserEmailVerifiedEvent,
  emailService: EmailService,
  notificationClient: NotificationServiceClient
): Promise<void> {
  const saga = new EmailVerificationSaga(emailService, notificationClient);
  const correlationId = event.metadata?.correlationId || uuidv4();
  const context: EmailVerificationContext = {
    event,
    metadata: {
      correlationId,
      userId: event.aggregateId,
      timestamp: new Date()
    }
  };

  try {
    await saga.start(context, correlationId);
  } catch (error) {
    logger.error('Email verification saga failed to start', {
      error: error instanceof Error ? error.message : String(error),
      userId: event.aggregateId,
      correlationId
    });
    throw error;
  }
}
