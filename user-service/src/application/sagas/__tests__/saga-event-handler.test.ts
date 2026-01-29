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

  beforeEach(() => {
    handler = new SagaEventHandler();
    jest.clearAllMocks();
  });

  describe('handleUserRegisteredEvent', () => {
    test('calls executeUserRegistrationSaga with event', async () => {
      const event = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      (executeUserRegistrationSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleUserRegisteredEvent(event);

      expect(executeUserRegistrationSaga).toHaveBeenCalledWith(event);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeUserRegistrationSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleUserRegisteredEvent(event)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleUserEmailVerifiedEvent', () => {
    test('calls executeEmailVerificationSaga with event', async () => {
      const event = { eventId: 'evt-2', aggregateId: 'user-1' } as any;
      (executeEmailVerificationSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleUserEmailVerifiedEvent(event);

      expect(executeEmailVerificationSaga).toHaveBeenCalledWith(event);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-2', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeEmailVerificationSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleUserEmailVerifiedEvent(event)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleUserPasswordChangedEvent', () => {
    test('calls executePasswordResetSaga with event', async () => {
      const event = { eventId: 'evt-3', aggregateId: 'user-1' } as any;
      (executePasswordResetSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleUserPasswordChangedEvent(event);

      expect(executePasswordResetSaga).toHaveBeenCalledWith(event);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-3', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executePasswordResetSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleUserPasswordChangedEvent(event)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleUserProfileUpdatedEvent', () => {
    test('calls executeProfileUpdateSaga with event', async () => {
      const event = { eventId: 'evt-4', aggregateId: 'user-1' } as any;
      (executeProfileUpdateSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleUserProfileUpdatedEvent(event);

      expect(executeProfileUpdateSaga).toHaveBeenCalledWith(event);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-4', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeProfileUpdateSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleUserProfileUpdatedEvent(event)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleTwoFactorSetupEvent', () => {
    test('calls executeTwoFactorSetupSaga with event', async () => {
      const event = { eventId: 'evt-5', aggregateId: 'user-1' } as any;
      (executeTwoFactorSetupSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleTwoFactorSetupEvent(event);

      expect(executeTwoFactorSetupSaga).toHaveBeenCalledWith(event);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-5', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeTwoFactorSetupSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleTwoFactorSetupEvent(event)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleAccountSuspensionEvent', () => {
    test('calls executeAccountSuspensionSaga with event', async () => {
      const event = { eventId: 'evt-6', aggregateId: 'user-1' } as any;
      (executeAccountSuspensionSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleAccountSuspensionEvent(event);

      expect(executeAccountSuspensionSaga).toHaveBeenCalledWith(event);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-6', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeAccountSuspensionSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleAccountSuspensionEvent(event)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleAccountDeletionEvent', () => {
    test('calls executeAccountDeletionSaga with event', async () => {
      const event = { eventId: 'evt-7', aggregateId: 'user-1' } as any;
      (executeAccountDeletionSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleAccountDeletionEvent(event);

      expect(executeAccountDeletionSaga).toHaveBeenCalledWith(event);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-7', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeAccountDeletionSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleAccountDeletionEvent(event)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleRoleChangeEvent', () => {
    test('calls executeRoleChangeSaga with event', async () => {
      const event = { eventId: 'evt-8', aggregateId: 'user-1' } as any;
      (executeRoleChangeSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleRoleChangeEvent(event);

      expect(executeRoleChangeSaga).toHaveBeenCalledWith(event);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-8', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeRoleChangeSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleRoleChangeEvent(event)).rejects.toThrow('Saga failed');
    });
  });

  describe('handlePhoneVerificationEvent', () => {
    test('calls executePhoneVerificationSaga with event', async () => {
      const event = { eventId: 'evt-9', aggregateId: 'user-1' } as any;
      (executePhoneVerificationSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handlePhoneVerificationEvent(event);

      expect(executePhoneVerificationSaga).toHaveBeenCalledWith(event);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-9', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executePhoneVerificationSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handlePhoneVerificationEvent(event)).rejects.toThrow('Saga failed');
    });
  });

  describe('handleSecurityPolicyBreachEvent', () => {
    test('calls executeSecurityPolicyBreachSaga with event', async () => {
      const event = { eventId: 'evt-10', aggregateId: 'user-1' } as any;
      (executeSecurityPolicyBreachSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleSecurityPolicyBreachEvent(event);

      expect(executeSecurityPolicyBreachSaga).toHaveBeenCalledWith(event);
    });

    test('throws error when saga fails', async () => {
      const event = { eventId: 'evt-10', aggregateId: 'user-1' } as any;
      const error = new Error('Saga failed');
      (executeSecurityPolicyBreachSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleSecurityPolicyBreachEvent(event)).rejects.toThrow('Saga failed');
    });
  });

  describe('multiple event handling', () => {
    test('handles multiple events sequentially', async () => {
      const event1 = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      const event2 = { eventId: 'evt-2', aggregateId: 'user-1' } as any;

      (executeUserRegistrationSaga as jest.Mock).mockResolvedValue(undefined);
      (executeEmailVerificationSaga as jest.Mock).mockResolvedValue(undefined);

      await handler.handleUserRegisteredEvent(event1);
      await handler.handleUserEmailVerifiedEvent(event2);

      expect(executeUserRegistrationSaga).toHaveBeenCalledWith(event1);
      expect(executeEmailVerificationSaga).toHaveBeenCalledWith(event2);
    });

    test('handles concurrent events', async () => {
      const event1 = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      const event2 = { eventId: 'evt-2', aggregateId: 'user-1' } as any;

      (executeUserRegistrationSaga as jest.Mock).mockResolvedValue(undefined);
      (executeEmailVerificationSaga as jest.Mock).mockResolvedValue(undefined);

      await Promise.all([
        handler.handleUserRegisteredEvent(event1),
        handler.handleUserEmailVerifiedEvent(event2)
      ]);

      expect(executeUserRegistrationSaga).toHaveBeenCalledWith(event1);
      expect(executeEmailVerificationSaga).toHaveBeenCalledWith(event2);
    });
  });

  describe('error handling', () => {
    test('propagates saga execution errors', async () => {
      const event = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      const error = new Error('Saga execution failed');
      (executeUserRegistrationSaga as jest.Mock).mockRejectedValue(error);

      await expect(handler.handleUserRegisteredEvent(event)).rejects.toThrow('Saga execution failed');
    });

    test('handles non-Error exceptions', async () => {
      const event = { eventId: 'evt-1', aggregateId: 'user-1' } as any;
      (executeUserRegistrationSaga as jest.Mock).mockRejectedValue('String error');

      await expect(handler.handleUserRegisteredEvent(event)).rejects.toBe('String error');
    });
  });
});
