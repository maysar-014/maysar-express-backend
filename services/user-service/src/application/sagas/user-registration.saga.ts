import { UserRegisteredEvent } from '../../domain/events';
import { logger } from '../../infrastructure/services/logger.service';
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from './service-clients';

export interface UserRegistrationContext {
  event: UserRegisteredEvent;
  emailSent?: boolean;
  notificationSent?: boolean;
  metadata: {
    correlationId: string;
    userId: string;
    timestamp: Date;
  };
}

export class UserRegistrationSaga extends DistributedSagaOrchestrator<UserRegistrationContext> {
  protected sagaType = 'UserRegistrationSaga';

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationClient: NotificationServiceClient
  ) {
    super(sagaLogRepository, 'user-service');
  }

  protected async onStart(sagaId: string, payload: UserRegistrationContext, correlationId?: string): Promise<void> {
    logger.info(`Starting UserRegistrationSaga for user ${payload.metadata.userId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating UserRegistrationSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<UserRegistrationContext>[] {
    return [
      {
        name: 'SendWelcomeEmail',
        execute: async (context, sagaId) => {
          const { userId } = context.metadata;
          const { email } = context.event;

          logger.info('Sending welcome email', { userId, sagaId });

          await this.emailService.sendWelcomeEmail(email, 'User');

          context.emailSent = true;
          logger.info('Welcome email sent successfully', { userId });
        },
        compensate: async (context, sagaId) => {
          if (!context.emailSent) return;
          const { userId } = context.metadata;
          logger.info('Compensating: Sending welcome email cancellation', { userId, sagaId });
          context.emailSent = false;
        }
      },
      {
        name: 'SendNotification',
        execute: async (context, sagaId) => {
          const { userId } = context.metadata;
          logger.info('Sending registration notification', { userId, sagaId });

          await this.notificationClient.sendPushNotification(
            userId,
            'Welcome!',
            'Thank you for registering with Maysar.'
          );

          context.notificationSent = true;
          logger.info('Registration notification sent successfully', { userId });
        },
        compensate: async (context, sagaId) => {
          if (!context.notificationSent) return;
          const { userId } = context.metadata;
          logger.info('Compensating: Reverting notification', { userId, sagaId });
          context.notificationSent = false;
        }
      }
    ];
  }
}

export async function executeUserRegistrationSaga(
  event: UserRegisteredEvent,
  emailService: EmailService,
  notificationClient: NotificationServiceClient
): Promise<void> {
  const saga = new UserRegistrationSaga(emailService, notificationClient);

  const correlationId = event.metadata?.correlationId || uuidv4();
  const context: UserRegistrationContext = {
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
    logger.error('User registration saga failed to start', {
      error: error instanceof Error ? error.message : String(error),
      userId: event.aggregateId,
      correlationId
    });
    throw error;
  }
}
