import {
  BusinessRegisteredEvent,
  BusinessVerifiedEvent,
  BusinessSuspendedEvent,
  BusinessUpdatedEvent,
  BusinessReactivatedEvent
} from '../../domain/events';
import { executeBusinessRegistrationSaga, BusinessRegistrationSagaDeps } from './business-registration.saga';
import { executeBusinessVerificationSaga, BusinessVerificationSagaDeps } from './business-verification.saga';
import { IMailerAdapter, IComplianceAdapter, ICapabilityAdapter } from '../../domain/ports';
import { IBusinessRepository } from '../../domain/repositories';
import { EventEnvelope, IEventBus } from '@shared/events/eventBus';

export interface SagaEventHandlerDeps {
  mailer: IMailerAdapter;
  compliance: IComplianceAdapter;
  capability: ICapabilityAdapter;
  businessRepository: IBusinessRepository;
}

export class SagaEventHandler {
  constructor(private readonly deps: SagaEventHandlerDeps) {
    if (!deps.mailer) {
      throw new Error('SagaEventHandler requires mailer adapter');
    }
    if (!deps.compliance) {
      throw new Error('SagaEventHandler requires compliance adapter');
    }
    if (!deps.capability) {
      throw new Error('SagaEventHandler requires capability adapter');
    }
    if (!deps.businessRepository) {
      throw new Error('SagaEventHandler requires business repository');
    }
  }

  setupSubscriptions(eventBus: IEventBus): void {
    eventBus.subscribe('BusinessRegistered', async (envelope: EventEnvelope) => {
      await this.handleBusinessRegisteredEvent(envelope.data);
    });

    eventBus.subscribe('BusinessVerified', async (envelope: EventEnvelope) => {
      await this.handleBusinessVerifiedEvent(envelope.data);
    });

    eventBus.subscribe('BusinessSuspended', async (envelope: EventEnvelope) => {
      await this.handleBusinessSuspendedEvent(envelope.data);
    });

    eventBus.subscribe('BusinessUpdated', async (envelope: EventEnvelope) => {
      await this.handleBusinessUpdatedEvent(envelope.data);
    });

    eventBus.subscribe('BusinessReactivated', async (envelope: EventEnvelope) => {
      await this.handleBusinessReactivatedEvent(envelope.data);
    });
  }

  async handleBusinessRegisteredEvent(event: BusinessRegisteredEvent): Promise<void> {
    const registrationDeps: BusinessRegistrationSagaDeps = {
      mailer: this.deps.mailer,
      compliance: this.deps.compliance,
      businessRepository: this.deps.businessRepository
    };
    await executeBusinessRegistrationSaga(event, registrationDeps);
  }

  async handleBusinessVerifiedEvent(event: BusinessVerifiedEvent): Promise<void> {
    const verificationDeps: BusinessVerificationSagaDeps = {
      mailer: this.deps.mailer,
      capability: this.deps.capability,
      businessRepository: this.deps.businessRepository
    };
    await executeBusinessVerificationSaga(event, verificationDeps);
  }

  async handleBusinessSuspendedEvent(event: BusinessSuspendedEvent): Promise<void> {
    // Suspension saga - minimal steps, mainly event propagation
  }

  async handleBusinessUpdatedEvent(event: BusinessUpdatedEvent): Promise<void> {
    // Update saga - event propagation only
  }

  async handleBusinessReactivatedEvent(event: BusinessReactivatedEvent): Promise<void> {
    // Reactivation saga - event propagation only
  }
}

// Note: This default instance is deprecated and should be replaced with proper dependency injection
// export const sagaEventHandler = new SagaEventHandler();
