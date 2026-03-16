import { eventBus, EventEnvelope } from '@shared/events/eventBus';
import { UpdateDeliveryStatusUseCase, DeliveryStatus } from '../use-cases/update-delivery-status.use-case';

const EVENT_STATUS_MAP: Record<string, DeliveryStatus> = {
  DeliveryPickedUp: 'picked_up',
  DeliveryInTransit: 'in_transit',
  DeliveryDelivered: 'delivered',
  DeliveryCancelled: 'cancelled',
  DeliveryFailed: 'failed'
};

export class DeliveryEventsSubscriber {
  constructor(private readonly updateDeliveryStatus: UpdateDeliveryStatusUseCase) {}

  async start(): Promise<void> {
    await Promise.all(
      Object.keys(EVENT_STATUS_MAP).map(eventType =>
        eventBus.subscribe(eventType, {
          name: `logistics-${eventType}-handler`,
          handler: (envelope) => this.handleStatusEvent(eventType, envelope)
        })
      )
    );
  }

  stop(): void {
    // EventBus currently supports removing all subscribers per event type.
    // Keep this conservative to avoid disrupting other modules.
  }

  private async handleStatusEvent(eventType: string, envelope: EventEnvelope): Promise<void> {
    const payload = (envelope.data ?? envelope.payload ?? envelope.eventData) as Record<string, any> | undefined;
    const deliveryId = payload?.deliveryId as string | undefined;

    if (!deliveryId) {
      return;
    }

    const status = EVENT_STATUS_MAP[eventType];
    if (!status) return;

    try {
      await this.updateDeliveryStatus.execute({
        deliveryId,
        status,
        reason: payload?.reason,
        notes: payload?.notes
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid status transition') || message.includes('not found')) {
        return;
      }
      throw error;
    }
  }
}
