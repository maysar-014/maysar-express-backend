import { BaseSaga } from './saga-base';
import { notificationClient, auditClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';

export interface PhoneVerificationEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  phoneNumber: string;
  verificationMethod: 'otp' | 'call';
  timestamp: Date;
}

export async function executePhoneVerificationSaga(event: PhoneVerificationEvent): Promise<void> {
  const saga = new BaseSaga(event.eventId, event);

  saga.addStep({
    name: 'ValidateOTP',
    execute: async () => {
      logger.info('Validating OTP', { userId: event.userId, method: event.verificationMethod });
      // OTP validation logic
    },
    compensate: async () => {
      logger.info('Invalidating OTP', { userId: event.userId });
      // Invalidate OTP
    }
  });

  saga.addStep({
    name: 'UpdatePhoneStatus',
    execute: async () => {
      logger.info('Updating phone verification status', { userId: event.userId });
      // Mark phone as verified in database
    },
    compensate: async () => {
      logger.info('Reverting phone verification status', { userId: event.userId });
      // Mark phone as unverified
    }
  });

  saga.addStep({
    name: 'RecordAuditEvent',
    execute: async () => {
      await auditClient.recordEvent(event.userId, 'phone_verified', {
        phoneNumber: event.phoneNumber,
        method: event.verificationMethod
      });
    },
    compensate: async () => {
      await auditClient.recordEvent(event.userId, 'phone_verification_compensated', {
        originalEventId: event.eventId
      });
    }
  });

  saga.addStep({
    name: 'SendConfirmationNotification',
    execute: async () => {
      await notificationClient.sendSMS(event.userId, 'Phone number verified successfully');
    },
    compensate: async () => {
      // Cannot unsend SMS
    }
  });

  await saga.execute();
}
