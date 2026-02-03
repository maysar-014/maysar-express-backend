import { BaseSaga } from './saga-base';
import { notificationClient, auditClient, sessionClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';

export interface AccountSuspensionEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  reason: string;
  suspendedBy: string;
  duration?: number; // ms, undefined = permanent
  timestamp: Date;
}

export async function executeAccountSuspensionSaga(event: AccountSuspensionEvent): Promise<void> {
  const saga = new BaseSaga(event.eventId, event);

  saga.addStep({
    name: 'TerminateActiveSessions',
    execute: async () => {
      await sessionClient.invalidateUserSessions(event.userId, `Account suspended: ${event.reason}`);
    },
    compensate: async () => {
      logger.info('Restoring sessions after suspension compensation', { userId: event.userId });
      // Sessions cannot be restored, but log for manual recovery
    }
  });

  saga.addStep({
    name: 'RecordAuditEvent',
    execute: async () => {
      await auditClient.recordEvent(event.userId, 'account_suspended', {
        reason: event.reason,
        suspendedBy: event.suspendedBy,
        duration: event.duration
      });
    },
    compensate: async () => {
      await auditClient.recordEvent(event.userId, 'account_suspension_compensated', {
        originalEventId: event.eventId
      });
    }
  });

  saga.addStep({
    name: 'NotifySuspension',
    execute: async () => {
      await notificationClient.sendEmail(event.userId, 'account_suspended', {
        reason: event.reason,
        duration: event.duration ? `${event.duration / 1000 / 60} minutes` : 'permanent',
        timestamp: new Date().toISOString()
      });
    },
    compensate: async () => {
      // Cannot unsend notification
    }
  });

  saga.addStep({
    name: 'NotifyAdministrator',
    execute: async () => {
      await auditClient.recordEvent(event.suspendedBy, 'suspension_action_logged', {
        targetUserId: event.userId,
        reason: event.reason
      });
    },
    compensate: async () => {
      // Log compensation
    }
  });

  await saga.execute();
}
