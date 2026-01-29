import { BaseSaga } from './saga-base';
import { notificationClient, auditClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';

export interface RoleChangeEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
  timestamp: Date;
}

export async function executeRoleChangeSaga(event: RoleChangeEvent): Promise<void> {
  const saga = new BaseSaga(event.eventId, event);

  saga.addStep({
    name: 'SyncPermissions',
    execute: async () => {
      logger.info('Syncing permissions for role change', { userId: event.userId, newRole: event.newRole });
      // Sync with permission service
    },
    compensate: async () => {
      logger.info('Reverting permissions to old role', { userId: event.userId, oldRole: event.oldRole });
      // Revert to old role permissions
    }
  });

  saga.addStep({
    name: 'UpdateAccessControl',
    execute: async () => {
      logger.info('Updating access control lists', { userId: event.userId, newRole: event.newRole });
      // Update ACLs in all services
    },
    compensate: async () => {
      logger.info('Reverting access control lists', { userId: event.userId });
      // Revert ACLs
    }
  });

  saga.addStep({
    name: 'RecordAuditEvent',
    execute: async () => {
      await auditClient.recordEvent(event.userId, 'role_changed', {
        oldRole: event.oldRole,
        newRole: event.newRole,
        changedBy: event.changedBy
      });
    },
    compensate: async () => {
      await auditClient.recordEvent(event.userId, 'role_change_compensated', {
        originalEventId: event.eventId
      });
    }
  });

  saga.addStep({
    name: 'NotifyRoleChange',
    execute: async () => {
      await notificationClient.sendEmail(event.userId, 'role_changed', {
        oldRole: event.oldRole,
        newRole: event.newRole,
        timestamp: new Date().toISOString()
      });
    },
    compensate: async () => {
      // Cannot unsend notification
    }
  });

  await saga.execute();
}
