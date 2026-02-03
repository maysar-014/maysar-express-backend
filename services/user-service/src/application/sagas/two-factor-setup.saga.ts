import { BaseSaga } from './saga-base';
import { notificationClient, auditClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';

export interface TwoFactorSetupEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  method: 'totp' | 'sms';
  deviceId?: string;
  timestamp: Date;
}

export async function executeTwoFactorSetupSaga(event: TwoFactorSetupEvent): Promise<void> {
  const saga = new BaseSaga(event.eventId, event);
  let backupCodesGenerated = false;

  saga.addStep({
    name: 'RegisterDevice',
    execute: async () => {
      logger.info('Registering 2FA device', { userId: event.userId, method: event.method });
      // Device registration logic
    },
    compensate: async () => {
      logger.info('Unregistering 2FA device', { userId: event.userId });
      // Remove device registration
    }
  });

  saga.addStep({
    name: 'GenerateBackupCodes',
    execute: async () => {
      logger.info('Generating backup codes', { userId: event.userId });
      backupCodesGenerated = true;
      // Generate and store backup codes
    },
    compensate: async () => {
      if (backupCodesGenerated) {
        logger.info('Invalidating backup codes', { userId: event.userId });
        // Invalidate backup codes
      }
    }
  });

  saga.addStep({
    name: 'RecordAuditEvent',
    execute: async () => {
      await auditClient.recordEvent(event.userId, '2fa_setup', {
        method: event.method,
        deviceId: event.deviceId
      });
    },
    compensate: async () => {
      await auditClient.recordEvent(event.userId, '2fa_setup_compensated', {
        originalEventId: event.eventId
      });
    }
  });

  saga.addStep({
    name: 'SendConfirmationNotification',
    execute: async () => {
      await notificationClient.sendEmail(event.userId, '2fa_enabled', {
        method: event.method,
        timestamp: new Date().toISOString()
      });
    },
    compensate: async () => {
      // Cannot unsend notification
    }
  });

  await saga.execute();
}
