import { Request, Response } from 'express';
import { InitiateCheckoutUseCase } from '../../application/use-cases/initiate-checkout.use-case';
import { ICheckoutRepository } from '../../infrastructure/repositories/checkout.repository';
import { ICartRepository } from '../../infrastructure/repositories/cart.repository';
import { IEventBus } from '../../infrastructure/messaging/event-bus.adapter';
import { PricingPolicy } from '../../domain/policies/pricing.policy';

export class CheckoutController {
  private initiateCheckoutUseCase: InitiateCheckoutUseCase;

  constructor(
    private checkoutRepository: ICheckoutRepository,
    private cartRepository: ICartRepository,
    private eventBus: IEventBus
  ) {
    const pricingPolicy = new PricingPolicy({
      taxRate: 0.1,
      shippingCost: 10,
      minOrderForFreeShipping: 100
    });

    this.initiateCheckoutUseCase = new InitiateCheckoutUseCase(
      pricingPolicy,
      checkoutRepository,
      cartRepository,
      eventBus
    );
  }

  async initiateCheckout(req: Request, res: Response): Promise<void> {
    try {
      const {
        cartId,
        userId,
        shippingAddressId,
        billingAddressId,
        shippingMethodId,
        shippingCost
      } = req.body;

      const result = await this.initiateCheckoutUseCase.execute(
        cartId,
        userId,
        shippingAddressId,
        billingAddressId,
        shippingMethodId,
        shippingCost
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          field: 'system',
          message: error instanceof Error ? error.message : 'Checkout failed'
        }]
      });
    }
  }

  async getCheckoutSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = await this.checkoutRepository.getSession(sessionId);
      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      res.json({ success: true, data: session });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session'
      });
    }
  }

  async confirmCheckout(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, paymentMethodId } = req.body;

      const session = await this.checkoutRepository.getSession(sessionId);
      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      const order = {
        id: `order_${Date.now()}`,
        checkoutSessionId: sessionId,
        userId: session.userId,
        status: 'pending',
        items: [],
        subtotal: session.subtotal,
        shippingCost: session.shippingCost,
        taxAmount: session.taxAmount,
        discountAmount: session.discountAmount,
        totalAmount: session.totalAmount,
        paymentMethodId,
        paymentStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.checkoutRepository.saveOrder(order);
      await this.eventBus.publish('OrderCreated', {
        orderId: order.id,
        checkoutSessionId: sessionId,
        userId: session.userId,
        totalAmount: order.totalAmount,
        timestamp: new Date()
      });

      res.json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm checkout'
      });
    }
  }
}
