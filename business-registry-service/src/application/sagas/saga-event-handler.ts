import {
  BusinessRegisteredEvent,
  BusinessVerifiedEvent,
  BusinessSuspendedEvent,
  BusinessUpdatedEvent,
  BusinessReactivatedEvent
} from '../../domain/events';
import { executeBusinessRegistrationSaga } from './business-registration.saga';
import { executeBusinessVerificationSaga } from './business-verification.saga';

export class SagaEventHandler {
  async handleBusinessRegisteredEvent(event: BusinessRegisteredEvent): Promise<void> {
    await executeBusinessRegistrationSaga(event);
  }

  async handleBusinessVerifiedEvent(event: BusinessVerifiedEvent): Promise<void> {
    await executeBusinessVerificationSaga(event);
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

export const sagaEventHandler = new SagaEventHandler();
