/**
 * Checkout Event Handlers
 * Handles checkout-related domain events
 */

import { EventEnvelope } from '../../infrastructure/messaging/event-bus.adapter';

export class CheckoutEventHandlers {
  constructor(
    private eventBus: any,
    private checkoutRepository: any
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.eventBus.subscribe('InventoryReserved', (event: EventEnvelope) =>
      this.handleInventoryReserved(event)
    );
    this.eventBus.subscribe('InventoryReservationFailed', (event: EventEnvelope) =>
      this.handleInventoryReservationFailed(event)
    );
    this.eventBus.subscribe('PaymentProcessed', (event: EventEnvelope) =>
      this.handlePaymentProcessed(event)
    );
    this.eventBus.subscribe('PaymentFailed', (event: EventEnvelope) =>
      this.handlePaymentFailed(event)
    );
    this.eventBus.subscribe('OrderCreated', (event: EventEnvelope) =>
      this.handleOrderCreated(event)
    );
  }

  private async handleOrderCreated(event: EventEnvelope): Promise<void> {
    const session = await this.checkoutRepository.getSession(event.payload.checkoutId);
    if (session) {
      session.status = 'completed';
      await this.checkoutRepository.saveSession(session);
    }
  }

  private async handleInventoryReserved(event: EventEnvelope): Promise<void> {
    const session = await this.checkoutRepository.getSession(event.payload.checkoutId);
    if (session) {
      session.status = 'inventory_reserved';
      await this.checkoutRepository.saveSession(session);
    }
  }

  private async handleInventoryReservationFailed(event: EventEnvelope): Promise<void> {
    const session = await this.checkoutRepository.getSession(event.payload.checkoutId);
    if (session) {
      session.status = 'failed';
      await this.checkoutRepository.saveSession(session);
    }
  }

  private async handlePaymentProcessed(event: EventEnvelope): Promise<void> {
    const session = await this.checkoutRepository.getSession(event.payload.checkoutId);
    if (session) {
      session.status = 'payment_completed';
      session.paymentMethodId = event.payload.paymentMethodId;
      await this.checkoutRepository.saveSession(session);
    }
  }

  private async handlePaymentFailed(event: EventEnvelope): Promise<void> {
    const session = await this.checkoutRepository.getSession(event.payload.checkoutId);
    if (session) {
      session.status = 'failed';
      await this.checkoutRepository.saveSession(session);
      await this.eventBus.publish('InventoryReleaseRequested', {
        checkoutId: event.payload.checkoutId
      });
    }
  }
}
