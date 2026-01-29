import { BaseSaga } from './saga-base';
import { notificationClient, auditClient, sessionClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';

export interface AccountDeletionEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  reason?: string;
  deletedBy: string;
  timestamp: Date;
}

export async function executeAccountDeletionSaga(event: AccountDeletionEvent): Promise<void> {
  const saga = new BaseSaga(event.eventId, event);
  let dataAnonymized = false;

  saga.addStep({
    name: 'TerminateAllSessions',
    execute: async () => {
      await sessionClient.invalidateUserSessions(event.userId, 'Account deletion');
    },
    compensate: async () => {
      logger.info('Cannot restore sessions after deletion', { userId: event.userId });
    }
  });

  saga.addStep({
    name: 'AnonymizePersonalData',
    execute: async () => {
      logger.info('Anonymizing user data', { userId: event.userId });
      // Replace PII with anonymized values
      dataAnonymized = true;
    },
    compensate: async () => {
      if (dataAnonymized) {
        logger.info('Restoring anonymized data', { userId: event.userId });
        // Restore from backup if available
      }
    }
  });

  saga.addStep({
    name: 'ArchiveForRetention',
    execute: async () => {
      logger.info('Archiving user data for retention', { userId: event.userId });
      // Archive to cold storage for compliance retention period
    },
    compensate: async () => {
      logger.info('Removing archived data', { userId: event.userId });
      // Remove from archive
    }
  });

  saga.addStep({
    name: 'RecordDeletionAudit',
    execute: async () => {
      await auditClient.recordEvent(event.userId, 'account_deleted', {
        reason: event.reason,
        deletedBy: event.deletedBy,
        timestamp: new Date().toISOString()
      });
    },
    compensate: async () => {
      await auditClient.recordEvent(event.userId, 'account_deletion_compensated', {
        originalEventId: event.eventId
      });
    }
  });

  saga.addStep({
    name: 'SendDeletionConfirmation',
    execute: async () => {
      await notificationClient.sendEmail(event.userId, 'account_deleted', {
        reason: event.reason,
        retentionPeriod: '90 days',
        timestamp: new Date().toISOString()
      });
    },
    compensate: async () => {
      // Cannot unsend notification
    }
  });

  await saga.execute();
}
