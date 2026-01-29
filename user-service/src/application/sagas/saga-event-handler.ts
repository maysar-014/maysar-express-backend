import { UserRegisteredEvent, UserEmailVerifiedEvent, UserPasswordChangedEvent, UserProfileUpdatedEvent } from '../../domain/events';
import { executeUserRegistrationSaga } from './user-registration.saga';
import { executeEmailVerificationSaga } from './email-verification.saga';
import { executePasswordResetSaga } from './password-reset.saga';
import { executeProfileUpdateSaga } from './profile-update.saga';
import { executeTwoFactorSetupSaga, TwoFactorSetupEvent } from './two-factor-setup.saga';
import { executeAccountSuspensionSaga, AccountSuspensionEvent } from './account-suspension.saga';
import { executeAccountDeletionSaga, AccountDeletionEvent } from './account-deletion.saga';
import { executeRoleChangeSaga, RoleChangeEvent } from './role-change.saga';
import { executePhoneVerificationSaga, PhoneVerificationEvent } from './phone-verification.saga';
import { executeSecurityPolicyBreachSaga, SecurityPolicyBreachEvent } from './security-policy-breach.saga';
import { logger } from '../../infrastructure/services/logger.service';

export class SagaEventHandler {
  async handleUserRegisteredEvent(event: UserRegisteredEvent): Promise<void> {
    try {
      logger.info('Handling UserRegisteredEvent', { eventId: event.eventId });
      await executeUserRegistrationSaga(event);
    } catch (error) {
      logger.error('Failed to handle UserRegisteredEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleUserEmailVerifiedEvent(event: UserEmailVerifiedEvent): Promise<void> {
    try {
      logger.info('Handling UserEmailVerifiedEvent', { eventId: event.eventId });
      await executeEmailVerificationSaga(event);
    } catch (error) {
      logger.error('Failed to handle UserEmailVerifiedEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleUserPasswordChangedEvent(event: UserPasswordChangedEvent): Promise<void> {
    try {
      logger.info('Handling UserPasswordChangedEvent', { eventId: event.eventId });
      await executePasswordResetSaga(event);
    } catch (error) {
      logger.error('Failed to handle UserPasswordChangedEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleUserProfileUpdatedEvent(event: UserProfileUpdatedEvent): Promise<void> {
    try {
      logger.info('Handling UserProfileUpdatedEvent', { eventId: event.eventId });
      await executeProfileUpdateSaga(event);
    } catch (error) {
      logger.error('Failed to handle UserProfileUpdatedEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleTwoFactorSetupEvent(event: TwoFactorSetupEvent): Promise<void> {
    try {
      logger.info('Handling TwoFactorSetupEvent', { eventId: event.eventId });
      await executeTwoFactorSetupSaga(event);
    } catch (error) {
      logger.error('Failed to handle TwoFactorSetupEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleAccountSuspensionEvent(event: AccountSuspensionEvent): Promise<void> {
    try {
      logger.info('Handling AccountSuspensionEvent', { eventId: event.eventId });
      await executeAccountSuspensionSaga(event);
    } catch (error) {
      logger.error('Failed to handle AccountSuspensionEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleAccountDeletionEvent(event: AccountDeletionEvent): Promise<void> {
    try {
      logger.info('Handling AccountDeletionEvent', { eventId: event.eventId });
      await executeAccountDeletionSaga(event);
    } catch (error) {
      logger.error('Failed to handle AccountDeletionEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleRoleChangeEvent(event: RoleChangeEvent): Promise<void> {
    try {
      logger.info('Handling RoleChangeEvent', { eventId: event.eventId });
      await executeRoleChangeSaga(event);
    } catch (error) {
      logger.error('Failed to handle RoleChangeEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handlePhoneVerificationEvent(event: PhoneVerificationEvent): Promise<void> {
    try {
      logger.info('Handling PhoneVerificationEvent', { eventId: event.eventId });
      await executePhoneVerificationSaga(event);
    } catch (error) {
      logger.error('Failed to handle PhoneVerificationEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleSecurityPolicyBreachEvent(event: SecurityPolicyBreachEvent): Promise<void> {
    try {
      logger.info('Handling SecurityPolicyBreachEvent', { eventId: event.eventId });
      await executeSecurityPolicyBreachSaga(event);
    } catch (error) {
      logger.error('Failed to handle SecurityPolicyBreachEvent', { eventId: event.eventId, error });
      throw error;
    }
  }
}

export const sagaEventHandler = new SagaEventHandler();
