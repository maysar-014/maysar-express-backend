import { IEventBus } from '../../infrastructure/messaging/event-bus.adapter';
import { ICheckoutRepository } from '../../infrastructure/repositories/checkout.repository';

export class CheckoutEventHandlers {
  constructor(
    private eventBus: IEventBus,
    private checkoutRepository: ICheckoutRepository
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.eventBus.subscribe('InventoryReserved', (data) => this.onInventoryReserved(data));
    this.eventBus.subscribe('InventoryReservationFailed', (data) => this.onInventoryFailed(data));
    this.eventBus.subscribe('PaymentProcessed', (data) => this.onPaymentProcessed(data));
    this.eventBus.subscribe('PaymentFailed', (data) => this.onPaymentFailed(data));
  }

  private async onInventoryReserved(data: any): Promise<void> {
    const session = await this.checkoutRepository.getSession(data.checkoutId);
    if (session) {
      await this.checkoutRepository.saveSession({
        ...session,
        status: 'inventory_reserved'
      });
    }
  }

  private async onInventoryFailed(data: any): Promise<void> {
    const session = await this.checkoutRepository.getSession(data.checkoutId);
    if (session) {
      await this.checkoutRepository.saveSession({
        ...session,
        status: 'failed',
        paymentStatus: 'cancelled'
      });
    }
  }

  private async onPaymentProcessed(data: any): Promise<void> {
    const session = await this.checkoutRepository.getSession(data.checkoutId);
    if (session) {
      await this.checkoutRepository.saveSession({
        ...session,
        status: 'payment_completed',
        paymentStatus: 'completed'
      });
    }
  }

  private async onPaymentFailed(data: any): Promise<void> {
    const session = await this.checkoutRepository.getSession(data.checkoutId);
    if (session) {
      await this.checkoutRepository.saveSession({
        ...session,
        status: 'failed',
        paymentStatus: 'failed'
      });

      await this.eventBus.publish('InventoryReleaseRequested', {
        checkoutId: data.checkoutId,
        timestamp: new Date()
      });
    }
  }
}
