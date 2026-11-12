/**
 * Order Fulfillment Saga
 * 
 * Coordinates checkout to order creation with compensation logic.
 * Implements saga pattern for distributed transactions.
 */

export interface EventBus {
  publish(eventType: string, data: any): Promise<void>;
}

export interface CheckoutRepository {
  getSession(id: string): Promise<any>;
}

export interface CartRepository {
  delete(id: string): Promise<void>;
}

export class OrderFulfillmentSaga {
  constructor(
    private eventBus: EventBus,
    private checkoutRepository: CheckoutRepository,
    private cartRepository: CartRepository
  ) {}

  async execute(checkoutId: string): Promise<void> {
    try {
      // Get checkout session
      const session = await this.checkoutRepository.getSession(checkoutId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Step 1: Request inventory reservation
      await this.eventBus.publish('InventoryReservationRequested', {
        checkoutId,
        items: session.items,
        cartId: session.cartId
      });

      // Step 2: Request payment processing
      await this.eventBus.publish('PaymentProcessingRequested', {
        checkoutId,
        amount: session.totalAmount,
        paymentMethodId: session.paymentMethodId
      });

      // Step 3: Request order creation
      const enablerProductIds = Array.isArray(session.metadata?.enablerProductIds)
        ? session.metadata.enablerProductIds
        : [];
      const attributedEnablerId = session.enablerId || session.metadata?.enablerId;
      await this.eventBus.publish('OrderCreationRequested', {
        checkoutId,
        userId: session.userId,
        items: session.items,
        totalAmount: session.totalAmount,
        ...(attributedEnablerId ? {
          enablerId: attributedEnablerId,
          enablerCode: session.enablerCode || session.metadata?.enablerCode,
          // Product-level scope keeps mixed carts from attributing unrelated
          // items to the enabler. Order creation must persist attribution only
          // for these authorized lines.
          enablerProductIds,
          enablerAttributionScope: 'PRODUCTS',
        } : {})
      });

      // Step 4: Clear cart
      await this.cartRepository.delete(session.cartId);
    } catch (error) {
      // Compensation: Release inventory and refund payment
      await this.eventBus.publish('InventoryReleaseRequested', {
        checkoutId
      });

      await this.eventBus.publish('PaymentRefundRequested', {
        checkoutId
      });

      throw error;
    }
  }
}
