import { UserProfileUpdatedEvent } from '../../domain/events';
import { BaseSaga } from './saga-base';
import { notificationClient, auditClient } from './service-clients';

export async function executeProfileUpdateSaga(event: UserProfileUpdatedEvent): Promise<void> {
  const saga = new BaseSaga(event.eventId, event);

  saga.addStep({
    name: 'RecordAuditTrail',
    execute: async () => {
      await auditClient.recordEvent(event.aggregateId, 'profile_updated', {
        changes: event.changes,
        oldValues: event.oldValues,
        newValues: event.newValues,
        updatedBy: event.updatedBy
      });
    },
    compensate: async () => {
      await auditClient.recordEvent(event.aggregateId, 'profile_update_compensated', {
        originalEventId: event.eventId
      });
    }
  });

  saga.addStep({
    name: 'SyncPreferences',
    execute: async () => {
      if (event.changes.includes('preferences')) {
        // Sync with preference service
      }
    },
    compensate: async () => {
      // Revert preference sync
    }
  });

  saga.addStep({
    name: 'NotifyProfileUpdate',
    execute: async () => {
      await notificationClient.sendEmail(event.aggregateId, 'profile_updated', {
        changes: event.changes,
        timestamp: new Date().toISOString()
      });
    },
    compensate: async () => {
      // Notification cannot be unsent, but log compensation
    }
  });

  await saga.execute();
}
