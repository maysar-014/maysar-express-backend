/**
 * Initiate Checkout Use Case
 * 
 * Orchestrates checkout initiation.
 * Publishes events for loose coupling with other services.
 */

import { CheckoutEngine, CheckoutContext } from '../../domain/engines/checkout.engine';
import { PricingPolicy } from '../../domain/policies/pricing.policy';
import { Cart } from '../../domain/value-objects/cart.value-object';
import { CheckoutSessionDTO, CheckoutResponseDTO } from '../dto/checkout.dto';
import { CheckoutMapper } from '../mappers/checkout.mapper';

export interface CheckoutRepository {
  saveCheckoutSession(session: any): Promise<void>;
  getCheckoutSession(id: string): Promise<any>;
}

export interface EventBus {
  publish(eventType: string, data: any): Promise<void>;
}

export interface CartRepository {
  getCart(cartId: string): Promise<any>;
}

export class InitiateCheckoutUseCase {
  private engine: CheckoutEngine;

  constructor(
    private pricingPolicy: PricingPolicy,
    private checkoutRepository: CheckoutRepository,
    private cartRepository: CartRepository,
    private eventBus: EventBus
  ) {
    this.engine = new CheckoutEngine(pricingPolicy);
  }

  async execute(
    cartId: string,
    userId: string,
    shippingAddressId: string,
    billingAddressId: string,
    shippingMethodId: string,
    shippingCost: number
  ): Promise<CheckoutResponseDTO> {
    try {
      // Fetch cart
      const cartData = await this.cartRepository.getCart(cartId);
      if (!cartData) {
        return {
          success: false,
          errors: [{ field: 'cartId', message: 'Cart not found' }]
        };
      }

      // Reconstruct cart from data
      const cart = new Cart({ items: cartData.items });

      // Build checkout context
      const context: CheckoutContext = {
        cart,
        userId,
        shippingAddress: { id: shippingAddressId, country: 'US' },
        billingAddress: { id: billingAddressId },
        shippingMethod: { id: shippingMethodId, cost: shippingCost },
        appliedDiscounts: []
      };

      // Validate checkout
      const validationResult = this.engine.validate(context);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors.map(msg => ({
            field: 'checkout',
            message: msg
          }))
        };
      }

      // Calculate pricing
      const pricingResult = this.engine.calculatePricing(context);
      if (!pricingResult.isValid || !pricingResult.pricing) {
        return {
          success: false,
          errors: pricingResult.errors.map(msg => ({
            field: 'pricing',
            message: msg
          }))
        };
      }

      // Create checkout session
      const checkoutSession = {
        id: this.generateId(),
        cartId,
        userId,
        status: 'initiated',
        shippingAddressId,
        billingAddressId,
        shippingMethodId,
        subtotal: pricingResult.pricing.subtotal.getAmount(),
        shippingCost: pricingResult.pricing.shippingCost.getAmount(),
        taxAmount: pricingResult.pricing.taxAmount.getAmount(),
        discountAmount: pricingResult.pricing.discountAmount.getAmount(),
        totalAmount: pricingResult.pricing.total.getAmount(),
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      };

      // Save checkout session
      await this.checkoutRepository.saveCheckoutSession(checkoutSession);

      // Publish event for loose coupling
      await this.eventBus.publish('CheckoutInitiated', {
        checkoutId: checkoutSession.id,
        cartId,
        userId,
        totalAmount: checkoutSession.totalAmount,
        timestamp: new Date()
      });

      return {
        success: true,
        data: checkoutSession as CheckoutSessionDTO,
        pricing: CheckoutMapper.pricingToDTO(pricingResult.pricing)
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'system',
          message: error instanceof Error ? error.message : 'Checkout initiation failed'
        }]
      };
    }
  }

  private generateId(): string {
    return `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
