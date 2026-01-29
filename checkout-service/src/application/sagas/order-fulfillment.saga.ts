import { IEventBus } from '../../infrastructure/messaging/event-bus.adapter';
import { ICheckoutRepository } from '../../infrastructure/repositories/checkout.repository';
import { ICartRepository } from '../../infrastructure/repositories/cart.repository';

export class OrderFulfillmentSaga {
  constructor(
    private eventBus: IEventBus,
    private checkoutRepository: ICheckoutRepository,
    private cartRepository: ICartRepository
  ) {}

  async execute(checkoutSessionId: string): Promise<void> {
    const session = await this.checkoutRepository.getSession(checkoutSessionId);
    if (!session) throw new Error('Session not found');

    try {
      // Step 1: Reserve inventory
      await this.eventBus.publish('InventoryReservationRequested', {
        checkoutId: checkoutSessionId,
        items: session.items,
        timestamp: new Date()
      });

      // Step 2: Process payment
      await this.eventBus.publish('PaymentProcessingRequested', {
        checkoutId: checkoutSessionId,
        amount: session.totalAmount,
        paymentMethodId: session.paymentMethodId,
        timestamp: new Date()
      });

      // Step 3: Create order
      await this.eventBus.publish('OrderCreationRequested', {
        checkoutId: checkoutSessionId,
        userId: session.userId,
        totalAmount: session.totalAmount,
        timestamp: new Date()
      });

      // Step 4: Clear cart
      await this.cartRepository.delete(session.cartId);

    } catch (error) {
      // Compensation: Release inventory
      await this.eventBus.publish('InventoryReleaseRequested', {
        checkoutId: checkoutSessionId,
        timestamp: new Date()
      });

      // Compensation: Refund payment
      await this.eventBus.publish('PaymentRefundRequested', {
        checkoutId: checkoutSessionId,
        timestamp: new Date()
      });

      throw error;
    }
  }
}
