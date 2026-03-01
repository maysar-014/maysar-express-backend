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
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from './service-clients';
import { EventEnvelope, IEventBus } from '@shared/events/eventBus';

export class SagaEventHandler {
  constructor(
    private readonly emailService: EmailService,
    private readonly notificationClient: NotificationServiceClient
  ) {}

  setupSubscriptions(eventBus: IEventBus): void {
    eventBus.subscribe('UserRegistered', async (envelope: EventEnvelope) => {
      await this.handleUserRegisteredEvent(envelope.data, this.emailService, this.notificationClient);
    });

    eventBus.subscribe('UserEmailVerified', async (envelope: EventEnvelope) => {
      await this.handleUserEmailVerifiedEvent(envelope.data, this.emailService, this.notificationClient);
    });

    eventBus.subscribe('UserPasswordChanged', async (envelope: EventEnvelope) => {
      await this.handleUserPasswordChangedEvent(envelope.data, this.emailService, this.notificationClient);
    });

    eventBus.subscribe('UserProfileUpdated', async (envelope: EventEnvelope) => {
      await this.handleUserProfileUpdatedEvent(envelope.data, this.emailService, this.notificationClient);
    });

    eventBus.subscribe('TwoFactorSetup', async (envelope: EventEnvelope) => {
      await this.handleTwoFactorSetupEvent(envelope.data, this.emailService, this.notificationClient);
    });

    eventBus.subscribe('AccountSuspension', async (envelope: EventEnvelope) => {
      await this.handleAccountSuspensionEvent(envelope.data, this.emailService, this.notificationClient);
    });

    eventBus.subscribe('AccountDeletion', async (envelope: EventEnvelope) => {
      await this.handleAccountDeletionEvent(envelope.data, this.emailService, this.notificationClient);
    });

    eventBus.subscribe('RoleChange', async (envelope: EventEnvelope) => {
      await this.handleRoleChangeEvent(envelope.data, this.emailService, this.notificationClient);
    });

    eventBus.subscribe('PhoneVerification', async (envelope: EventEnvelope) => {
      await this.handlePhoneVerificationEvent(envelope.data, this.emailService, this.notificationClient);
    });

    eventBus.subscribe('SecurityPolicyBreach', async (envelope: EventEnvelope) => {
      await this.handleSecurityPolicyBreachEvent(envelope.data, this.emailService, this.notificationClient);
    });
  }
  async handleUserRegisteredEvent(event: UserRegisteredEvent, emailService: EmailService, notificationClient: NotificationServiceClient): Promise<void> {
    try {
      logger.info('Handling UserRegisteredEvent', { eventId: event.eventId });
      await executeUserRegistrationSaga(event, emailService, notificationClient);
    } catch (error) {
      logger.error('Failed to handle UserRegisteredEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleUserEmailVerifiedEvent(event: UserEmailVerifiedEvent, emailService: EmailService, notificationClient: NotificationServiceClient): Promise<void> {
    try {
      logger.info('Handling UserEmailVerifiedEvent', { eventId: event.eventId });
      await executeEmailVerificationSaga(event, emailService, notificationClient);
    } catch (error) {
      logger.error('Failed to handle UserEmailVerifiedEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleUserPasswordChangedEvent(event: UserPasswordChangedEvent, emailService: EmailService, notificationClient: NotificationServiceClient): Promise<void> {
    try {
      logger.info('Handling UserPasswordChangedEvent', { eventId: event.eventId });
      await executePasswordResetSaga(event, emailService, notificationClient);
    } catch (error) {
      logger.error('Failed to handle UserPasswordChangedEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleUserProfileUpdatedEvent(event: UserProfileUpdatedEvent, emailService: EmailService, notificationClient: NotificationServiceClient): Promise<void> {
    try {
      logger.info('Handling UserProfileUpdatedEvent', { eventId: event.eventId });
      await executeProfileUpdateSaga(event, emailService, notificationClient);
    } catch (error) {
      logger.error('Failed to handle UserProfileUpdatedEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleTwoFactorSetupEvent(event: TwoFactorSetupEvent, emailService: EmailService, notificationClient: NotificationServiceClient): Promise<void> {
    try {
      logger.info('Handling TwoFactorSetupEvent', { eventId: event.eventId });
      await executeTwoFactorSetupSaga(event, emailService, notificationClient);
    } catch (error) {
      logger.error('Failed to handle TwoFactorSetupEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleAccountSuspensionEvent(event: AccountSuspensionEvent, emailService: EmailService, notificationClient: NotificationServiceClient): Promise<void> {
    try {
      logger.info('Handling AccountSuspensionEvent', { eventId: event.eventId });
      await executeAccountSuspensionSaga(event, emailService, notificationClient);
    } catch (error) {
      logger.error('Failed to handle AccountSuspensionEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleAccountDeletionEvent(event: AccountDeletionEvent, emailService: EmailService, notificationClient: NotificationServiceClient): Promise<void> {
    try {
      logger.info('Handling AccountDeletionEvent', { eventId: event.eventId });
      await executeAccountDeletionSaga(event, emailService, notificationClient);
    } catch (error) {
      logger.error('Failed to handle AccountDeletionEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleRoleChangeEvent(event: RoleChangeEvent, emailService: EmailService, notificationClient: NotificationServiceClient): Promise<void> {
    try {
      logger.info('Handling RoleChangeEvent', { eventId: event.eventId });
      await executeRoleChangeSaga(event, emailService, notificationClient);
    } catch (error) {
      logger.error('Failed to handle RoleChangeEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handlePhoneVerificationEvent(event: PhoneVerificationEvent, emailService: EmailService, notificationClient: NotificationServiceClient): Promise<void> {
    try {
      logger.info('Handling PhoneVerificationEvent', { eventId: event.eventId });
      await executePhoneVerificationSaga(event, emailService, notificationClient);
    } catch (error) {
      logger.error('Failed to handle PhoneVerificationEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleSecurityPolicyBreachEvent(event: SecurityPolicyBreachEvent, emailService: EmailService, notificationClient: NotificationServiceClient): Promise<void> {
    try {
      logger.info('Handling SecurityPolicyBreachEvent', { eventId: event.eventId });
      await executeSecurityPolicyBreachSaga(event, emailService, notificationClient);
    } catch (error) {
      logger.error('Failed to handle SecurityPolicyBreachEvent', { eventId: event.eventId, error });
      throw error;
    }
  }
}


