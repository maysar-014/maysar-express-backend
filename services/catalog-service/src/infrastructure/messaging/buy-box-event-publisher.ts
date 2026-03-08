// @ts-nocheck
import { EventBus } from '../../../shared/events/event-bus';
import { BuyBoxComputedEvent } from '../../domain/events/buy-box-events';

export class BuyBoxEventPublisher {
  constructor(private readonly eventBus: EventBus) {}

  async publishComputed(event: BuyBoxComputedEvent): Promise<void> {
    await this.eventBus.publish(event.eventType, event);
  }
}
