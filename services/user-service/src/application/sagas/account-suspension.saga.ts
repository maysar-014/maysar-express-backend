import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { auditClient, sessionClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from './service-clients';

export interface AccountSuspensionEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  reason: string;
  suspendedBy: string;
  duration?: number; // ms, undefined = permanent
  timestamp: Date;
  metadata?: { correlationId: string };
}

export class AccountSuspensionSaga extends DistributedSagaOrchestrator<AccountSuspensionEvent> {
  protected sagaType = 'AccountSuspensionSaga';

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationClient: NotificationServiceClient
  ) {
    super(sagaLogRepository, 'user-service');
  }

  protected async onStart(sagaId: string, payload: AccountSuspensionEvent, correlationId?: string): Promise<void> {
    logger.info(`Starting AccountSuspensionSaga for user ${payload.userId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating AccountSuspensionSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<AccountSuspensionEvent>[] {
    return [
      {
        name: 'TerminateActiveSessions',
        execute: async (payload, sagaId) => {
          await sessionClient.invalidateUserSessions(payload.userId, `Account suspended: ${payload.reason}`);
        },
        compensate: async (payload, sagaId) => {
          logger.info('Restoring sessions after suspension compensation', { userId: payload.userId, sagaId });
          // Sessions cannot be restored, but log for manual recovery
        }
      },
      {
        name: 'RecordAuditEvent',
        execute: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, 'account_suspended', {
            reason: payload.reason,
            suspendedBy: payload.suspendedBy,
            duration: payload.duration
          });
        },
        compensate: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, 'account_suspension_compensated', {
            originalEventId: payload.eventId
          });
        }
      },
      {
        name: 'NotifySuspension',
        execute: async (payload, sagaId) => {
          await this.notificationClient.sendPushNotification(
            payload.userId,
            'Account Suspended',
            `Your account has been suspended. Reason: ${payload.reason}`
          );
        },
        compensate: async (payload, sagaId) => {
          // Cannot unsend notification
        }
      },
      {
        name: 'NotifyAdministrator',
        execute: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.suspendedBy, 'suspension_action_logged', {
            targetUserId: payload.userId,
            reason: payload.reason
          });
        },
        compensate: async (payload, sagaId) => {
          // Log compensation
        }
      }
    ];
  }
}

export async function executeAccountSuspensionSaga(
  event: AccountSuspensionEvent,
  emailService: EmailService,
  notificationClient: NotificationServiceClient
): Promise<void> {
  const saga = new AccountSuspensionSaga(emailService, notificationClient);
  const correlationId = event.metadata?.correlationId || uuidv4();

  try {
    await saga.start(event, correlationId);
  } catch (error) {
    logger.error('Account suspension saga failed to start', {
      error: error instanceof Error ? error.message : String(error),
      userId: event.userId,
      correlationId
    });
    throw error;
  }
}
