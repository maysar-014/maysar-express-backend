import { executeProfileUpdateSaga } from '../profile-update.saga';
import { executeTwoFactorSetupSaga } from '../two-factor-setup.saga';
import { executeAccountSuspensionSaga } from '../account-suspension.saga';
import { executeAccountDeletionSaga } from '../account-deletion.saga';
import { executeRoleChangeSaga } from '../role-change.saga';
import { executePhoneVerificationSaga } from '../phone-verification.saga';
import { executeSecurityPolicyBreachSaga } from '../security-policy-breach.saga';
import { notificationClient, auditClient, sessionClient } from '../service-clients';

jest.mock('../service-clients');

describe('Comprehensive Saga Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile Update Saga', () => {
    it('executes profile update with audit and notification', async () => {
      const event = {
        eventId: 'evt-1',
        aggregateId: 'user-1',
        changes: ['firstName', 'lastName'],
        oldValues: { firstName: 'John' },
        newValues: { firstName: 'Jane' },
        updatedBy: 'admin-1'
      };

      await executeProfileUpdateSaga(event as any);

      expect(auditClient.recordEvent).toHaveBeenCalledWith(
        'user-1',
        'profile_updated',
        expect.objectContaining({ changes: ['firstName', 'lastName'] })
      );
      expect(notificationClient.sendEmail).toHaveBeenCalledWith(
        'user-1',
        'profile_updated',
        expect.any(Object)
      );
    });
  });

  describe('Two-Factor Setup Saga', () => {
    it('registers device and generates backup codes', async () => {
      const event = {
        eventId: 'evt-2',
        aggregateId: 'user-1',
        userId: 'user-1',
        method: 'totp' as const,
        deviceId: 'device-1',
        timestamp: new Date()
      };

      await executeTwoFactorSetupSaga(event);

      expect(auditClient.recordEvent).toHaveBeenCalledWith(
        'user-1',
        '2fa_setup',
        expect.objectContaining({ method: 'totp' })
      );
      expect(notificationClient.sendEmail).toHaveBeenCalledWith(
        'user-1',
        '2fa_enabled',
        expect.any(Object)
      );
    });
  });

  describe('Account Suspension Saga', () => {
    it('terminates sessions and notifies user', async () => {
      const event = {
        eventId: 'evt-3',
        aggregateId: 'user-1',
        userId: 'user-1',
        reason: 'Suspicious activity',
        suspendedBy: 'admin-1',
        duration: 3600000
      };

      await executeAccountSuspensionSaga(event as any);

      expect(sessionClient.invalidateUserSessions).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('suspended')
      );
      expect(auditClient.recordEvent).toHaveBeenCalledWith(
        'user-1',
        'account_suspended',
        expect.any(Object)
      );
      expect(notificationClient.sendEmail).toHaveBeenCalledWith(
        'user-1',
        'account_suspended',
        expect.any(Object)
      );
    });
  });

  describe('Account Deletion Saga', () => {
    it('anonymizes data and archives for retention', async () => {
      const event = {
        eventId: 'evt-4',
        aggregateId: 'user-1',
        userId: 'user-1',
        reason: 'User requested',
        deletedBy: 'user-1'
      };

      await executeAccountDeletionSaga(event as any);

      expect(sessionClient.invalidateUserSessions).toHaveBeenCalledWith(
        'user-1',
        'Account deletion'
      );
      expect(auditClient.recordEvent).toHaveBeenCalledWith(
        'user-1',
        'account_deleted',
        expect.any(Object)
      );
      expect(notificationClient.sendEmail).toHaveBeenCalledWith(
        'user-1',
        'account_deleted',
        expect.any(Object)
      );
    });
  });

  describe('Role Change Saga', () => {
    it('syncs permissions and notifies user', async () => {
      const event = {
        eventId: 'evt-5',
        aggregateId: 'user-1',
        userId: 'user-1',
        oldRole: 'buyer',
        newRole: 'seller',
        changedBy: 'admin-1'
      };

      await executeRoleChangeSaga(event as any);

      expect(auditClient.recordEvent).toHaveBeenCalledWith(
        'user-1',
        'role_changed',
        expect.objectContaining({ oldRole: 'buyer', newRole: 'seller' })
      );
      expect(notificationClient.sendEmail).toHaveBeenCalledWith(
        'user-1',
        'role_changed',
        expect.any(Object)
      );
    });
  });

  describe('Phone Verification Saga', () => {
    it('validates OTP and updates phone status', async () => {
      const event = {
        eventId: 'evt-6',
        aggregateId: 'user-1',
        userId: 'user-1',
        phoneNumber: '+255712345678',
        verificationMethod: 'otp' as const,
        timestamp: new Date()
      };

      await executePhoneVerificationSaga(event);

      expect(auditClient.recordEvent).toHaveBeenCalledWith(
        'user-1',
        'phone_verified',
        expect.any(Object)
      );
      expect(notificationClient.sendSMS).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('verified')
      );
    });
  });

  describe('Security Policy Breach Saga', () => {
    it('alerts security team and reviews sessions', async () => {
      const event = {
        eventId: 'evt-7',
        aggregateId: 'user-1',
        userId: 'user-1',
        breachType: 'suspicious_login' as const,
        severity: 'high' as const,
        details: { ipAddress: '192.168.1.1' },
        timestamp: new Date()
      };

      await executeSecurityPolicyBreachSaga(event);

      expect(auditClient.recordEvent).toHaveBeenCalledWith(
        'security_team',
        'breach_alert',
        expect.any(Object)
      );
      expect(auditClient.recordEvent).toHaveBeenCalledWith(
        'user-1',
        'security_breach_detected',
        expect.any(Object)
      );
      expect(notificationClient.sendEmail).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('security_alert'),
        expect.any(Object)
      );
    });

    it('terminates sessions on critical breach', async () => {
      const event = {
        eventId: 'evt-8',
        aggregateId: 'user-1',
        userId: 'user-1',
        breachType: 'multiple_failed_attempts' as const,
        severity: 'critical' as const,
        details: { attempts: 10 },
        timestamp: new Date()
      };

      await executeSecurityPolicyBreachSaga(event);

      expect(sessionClient.invalidateUserSessions).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('breach')
      );
    });
  });
});
