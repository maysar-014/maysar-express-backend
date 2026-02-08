import { SagaEventHandler } from '../saga-event-handler';
import { executeUserRegistrationSaga } from '../user-registration.saga';
import { executeEmailVerificationSaga } from '../email-verification.saga';
import { executePasswordResetSaga } from '../password-reset.saga';
import { executeProfileUpdateSaga } from '../profile-update.saga';
import { executeTwoFactorSetupSaga } from '../two-factor-setup.saga';
import { executeAccountSuspensionSaga } from '../account-suspension.saga';
import { executeAccountDeletionSaga } from '../account-deletion.saga';
import { executeRoleChangeSaga } from '../role-change.saga';
import { executePhoneVerificationSaga } from '../phone-verification.saga';
import { executeSecurityPolicyBreachSaga } from '../security-policy-breach.saga';

jest.mock('../user-registration.saga');
jest.mock('../email-verification.saga');
jest.mock('../password-reset.saga');
jest.mock('../profile-update.saga');
jest.mock('../two-factor-setup.saga');
jest.mock('../account-suspension.saga');
jest.mock('../account-deletion.saga');
jest.mock('../role-change.saga');
jest.mock('../phone-verification.saga');
jest.mock('../security-policy-breach.saga');

describe('SagaEventHandler', () => {
  let handler: SagaEventHandler;
  const mockEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendSecurityAlert: jest.fn().mockResolvedValue(undefined)
  };
  const mockNotificationClient = {
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    sendSmsNotification: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    handler = new SagaEventHandler();
    jest.clearAllMocks();
  });

  describe('handleUserRegisteredEvent', () => {
    test('calls executeUserRegistrationSaga with event', async () => {
      const event = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      (executeUserRegistrationSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleUserRegisteredEvent(event, mockEmailService as any, mockNotificationClient as any);

      expect(executeUserRegistrationSaga).toHaveBeenCalledWith(event, mockEmailService, mockNotificationClient);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeUserRegistrationSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleUserRegisteredEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleUserEmailVerifiedEvent', () => {
    test('calls executeEmailVerificationSaga with event', async () => {
      const event = { eventId: 'evt-2', aggregateId: 'user-1' } as any;
      (executeEmailVerificationSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleUserEmailVerifiedEvent(event, mockEmailService as any, mockNotificationClient as any);

      expect(executeEmailVerificationSaga).toHaveBeenCalledWith(event, mockEmailService, mockNotificationClient);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-2', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeEmailVerificationSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleUserEmailVerifiedEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleUserPasswordChangedEvent', () => {
    test('calls executePasswordResetSaga with event', async () => {
      const event = { eventId: 'evt-3', aggregateId: 'user-1' } as any;
      (executePasswordResetSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleUserPasswordChangedEvent(event, mockEmailService as any, mockNotificationClient as any);

      expect(executePasswordResetSaga).toHaveBeenCalledWith(event, mockEmailService, mockNotificationClient);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-3', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executePasswordResetSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleUserPasswordChangedEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleUserProfileUpdatedEvent', () => {
    test('calls executeProfileUpdateSaga with event', async () => {
      const event = { eventId: 'evt-4', aggregateId: 'user-1' } as any;
      (executeProfileUpdateSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleUserProfileUpdatedEvent(event, mockEmailService as any, mockNotificationClient as any);

      expect(executeProfileUpdateSaga).toHaveBeenCalledWith(event, mockEmailService, mockNotificationClient);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-4', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeProfileUpdateSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleUserProfileUpdatedEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleTwoFactorSetupEvent', () => {
    test('calls executeTwoFactorSetupSaga with event', async () => {
      const event = { eventId: 'evt-5', aggregateId: 'user-1' } as any;
      (executeTwoFactorSetupSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleTwoFactorSetupEvent(event, mockEmailService as any, mockNotificationClient as any);

      expect(executeTwoFactorSetupSaga).toHaveBeenCalledWith(event, mockEmailService, mockNotificationClient);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-5', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeTwoFactorSetupSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleTwoFactorSetupEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleAccountSuspensionEvent', () => {
    test('calls executeAccountSuspensionSaga with event', async () => {
      const event = { eventId: 'evt-6', aggregateId: 'user-1' } as any;
      (executeAccountSuspensionSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleAccountSuspensionEvent(event, mockEmailService as any, mockNotificationClient as any);

      expect(executeAccountSuspensionSaga).toHaveBeenCalledWith(event, mockEmailService, mockNotificationClient);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-6', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeAccountSuspensionSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleAccountSuspensionEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleAccountDeletionEvent', () => {
    test('calls executeAccountDeletionSaga with event', async () => {
      const event = { eventId: 'evt-7', aggregateId: 'user-1' } as any;
      (executeAccountDeletionSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleAccountDeletionEvent(event, mockEmailService as any, mockNotificationClient as any);

      expect(executeAccountDeletionSaga).toHaveBeenCalledWith(event, mockEmailService, mockNotificationClient);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-7', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeAccountDeletionSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleAccountDeletionEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleRoleChangeEvent', () => {
    test('calls executeRoleChangeSaga with event', async () => {
      const event = { eventId: 'evt-8', aggregateId: 'user-1' } as any;
      (executeRoleChangeSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleRoleChangeEvent(event, mockEmailService as any, mockNotificationClient as any);

      expect(executeRoleChangeSaga).toHaveBeenCalledWith(event, mockEmailService, mockNotificationClient);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-8', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeRoleChangeSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleRoleChangeEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga failed');
    });
  });

  describe('handlePhoneVerificationEvent', () => {
    test('calls executePhoneVerificationSaga with event', async () => {
      const event = { eventId: 'evt-9', aggregateId: 'user-1' } as any;
      (executePhoneVerificationSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handlePhoneVerificationEvent(event, mockEmailService as any, mockNotificationClient as any);

      expect(executePhoneVerificationSaga).toHaveBeenCalledWith(event, mockEmailService, mockNotificationClient);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-9', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executePhoneVerificationSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handlePhoneVerificationEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleSecurityPolicyBreachEvent', () => {
    test('calls executeSecurityPolicyBreachSaga with event', async () => {
      const event = { eventId: 'evt-10', aggregateId: 'user-1' } as any;
      (executeSecurityPolicyBreachSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleSecurityPolicyBreachEvent(event, mockEmailService as any, mockNotificationClient as any);

      expect(executeSecurityPolicyBreachSaga).toHaveBeenCalledWith(event, mockEmailService, mockNotificationClient);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-10', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeSecurityPolicyBreachSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleSecurityPolicyBreachEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga failed');
    });
  });

  describe('multiple event handling', () => {
    test('handles multiple events sequentially', async () => {
      const event1 = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      const event2 = { eventId: 'evt-2', aggregateId: 'user-1' } as any;

      (executeUserRegistrationSaga as jest.Mock).mockResolvedValue(undefined);
      (executeEmailVerificationSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleUserRegisteredEvent(event1, mockEmailService as any, mockNotificationClient as any);
      await handler.handleUserEmailVerifiedEvent(event2, mockEmailService as any, mockNotificationClient as any);

      expect(executeUserRegistrationSaga).toHaveBeenCalledWith(event1, mockEmailService, mockNotificationClient);
      expect(executeEmailVerificationSaga).toHaveBeenCalledWith(event2, mockEmailService, mockNotificationClient);
    });

    test('handles concurrent events', async () => {
      const event1 = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      const event2 = { eventId: 'evt-2', aggregateId: 'user-1' } as any;

      (executeUserRegistrationSaga as jest.Mock).mockResolvedValue(undefined);
      (executeEmailVerificationSaga as jest.Mock).mockResolvedValue(undefined);

      await Promise.all([
        handler.handleUserRegisteredEvent(event1, mockEmailService as any, mockNotificationClient as any),
        handler.handleUserEmailVerifiedEvent(event2, mockEmailService as any, mockNotificationClient as any)
      ]);

      expect(executeUserRegistrationSaga).toHaveBeenCalledWith(event1, mockEmailService, mockNotificationClient);
      expect(executeEmailVerificationSaga).toHaveBeenCalledWith(event2, mockEmailService, mockNotificationClient);
    });
  });

  describe('error handling', () => {
    test('propagates saga execution errors', async () => {
      const event = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      const error = new Error('Saga execution failed');
      (executeUserRegistrationSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleUserRegisteredEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toThrow('Saga execution failed');
    });

    test('handles non-Error exceptions', async () => {
      const event = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      (executeUserRegistrationSaga as jest.Mock).mockRejectedValue('String error');

      await expect(handler.handleUserRegisteredEvent(event, mockEmailService as any, mockNotificationClient as any)).rejects.toBe('String error');
    });
  });
});
