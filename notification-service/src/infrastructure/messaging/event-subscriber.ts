import { SagaEventHandler, UserRegisteredEventPayload } from '../../application/sagas/saga-event-handler';
import { logger } from '../services/logger.service';

/**
 * Event subscriber - consumes events from other services
 */
export class EventSubscriber {
  constructor(private sagaEventHandler: SagaEventHandler) {}

  async onUserRegistered(payload: UserRegisteredEventPayload): Promise<void> {
    try {
      await this.sagaEventHandler.handleUserRegisteredEvent(payload);
    } catch (error) {
      logger.error('EventSubscriber.onUserRegistered failed', { payload, error });
      throw error;
    }
  }

  async onOrderCreated(_payload: { orderId: string; userId: string }): Promise<void> {
    // Trigger order confirmation notification
    logger.info('EventSubscriber.onOrderCreated', { payload: _payload });
  }
}
