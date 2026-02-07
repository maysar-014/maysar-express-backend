import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { notificationClient, auditClient, sessionClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';
import { v4 as uuidv4 } from 'uuid';

export interface AccountDeletionEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  reason?: string;
  deletedBy: string;
  timestamp: Date;
  metadata?: { correlationId: string };
}

export class AccountDeletionSaga extends DistributedSagaOrchestrator<AccountDeletionEvent> {
  protected sagaType = 'AccountDeletionSaga';
  private dataAnonymized = false;

  constructor() {
    super(sagaLogRepository, 'user-service');
  }

  protected async onStart(sagaId: string, payload: AccountDeletionEvent, correlationId?: string): Promise<void> {
    logger.info(`Starting AccountDeletionSaga for user ${payload.userId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating AccountDeletionSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<AccountDeletionEvent>[] {
    return [
      {
        name: 'TerminateAllSessions',
        execute: async (payload, sagaId) => {
          await sessionClient.invalidateUserSessions(payload.userId, 'Account deletion');
        },
        compensate: async (payload, sagaId) => {
          logger.info('Cannot restore sessions after deletion', { userId: payload.userId, sagaId });
        }
      },
      {
        name: 'AnonymizePersonalData',
        execute: async (payload, sagaId) => {
          logger.info('Anonymizing user data', { userId: payload.userId, sagaId });
          // Replace PII with anonymized values
          this.dataAnonymized = true;
        },
        compensate: async (payload, sagaId) => {
          if (this.dataAnonymized) {
            logger.info('Restoring anonymized data', { userId: payload.userId, sagaId });
            // Restore from backup if available
          }
        }
      },
      {
        name: 'ArchiveForRetention',
        execute: async (payload, sagaId) => {
          logger.info('Archiving user data for retention', { userId: payload.userId, sagaId });
          // Archive to cold storage for compliance retention period
        },
        compensate: async (payload, sagaId) => {
          logger.info('Removing archived data', { userId: payload.userId, sagaId });
          // Remove from archive
        }
      },
      {
        name: 'RecordDeletionAudit',
        execute: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, 'account_deleted', {
            reason: payload.reason,
            deletedBy: payload.deletedBy,
            timestamp: new Date().toISOString()
          });
        },
        compensate: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, 'account_deletion_compensated', {
            originalEventId: payload.eventId
          });
        }
      },
      {
        name: 'SendDeletionConfirmation',
        execute: async (payload, sagaId) => {
          await notificationClient.sendEmail(payload.userId, 'account_deleted', {
            reason: payload.reason,
            retentionPeriod: '90 days',
            timestamp: new Date().toISOString()
          });
        },
        compensate: async () => {
          // Cannot unsend notification
        }
      }
    ];
  }
}

export async function executeAccountDeletionSaga(event: AccountDeletionEvent): Promise<void> {
  const saga = new AccountDeletionSaga();
  const correlationId = event.metadata?.correlationId || uuidv4();

  try {
    await saga.start(event, correlationId);
  } catch (error) {
    logger.error('Account deletion saga failed to start', {
      error: error instanceof Error ? error.message : String(error),
      userId: event.userId,
      correlationId
    });
    throw error;
  }
}
