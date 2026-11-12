/**
 * Event Bus Adapter
 *
 * Delegates to the shared in-memory eventBus singleton so events published
 * by the checkout service (e.g. OrderCreated) reach all cross-service
 * subscribers — payment saga, notification service, etc.
 *
 * Previously this was a standalone in-memory bus with its own subscribers,
 * which meant checkout events never reached the payment saga or notification
 * service. Now it forwards publish/subscribe calls to the shared singleton.
 */

import { eventBus as sharedEventBus } from '@shared-events/eventBus';

export interface EventEnvelope {
  eventId: string;
  eventType: string;
  payload: any;
  timestamp: Date;
}

export type EventHandler = (event: EventEnvelope) => Promise<void>;

export class EventBusAdapter {
  private eventHistory: EventEnvelope[] = [];

  async publish(eventType: string, payload: any): Promise<void> {
    const envelope: EventEnvelope = {
      eventId: `${eventType}-${Date.now()}-${Math.random()}`,
      eventType,
      payload,
      timestamp: new Date()
    };

    this.eventHistory.push(envelope);

    // Forward to the shared eventBus so cross-service subscribers receive it
    await sharedEventBus.publish(eventType, payload);
  }

  async subscribe(eventType: string, handler: EventHandler): Promise<void> {
    // Delegate to shared eventBus
    await sharedEventBus.subscribe(eventType, async (envelope: any) => {
      const data = envelope?.data ?? envelope?.payload ?? envelope;
      await handler({
        eventId: envelope?.eventId ?? `${eventType}-${Date.now()}`,
        eventType,
        payload: data,
        timestamp: envelope?.timestamp ?? new Date(),
      });
    });
  }

  getEventHistory(): EventEnvelope[] {
    return [...this.eventHistory];
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}
