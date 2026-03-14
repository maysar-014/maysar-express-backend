/**
 * Initiate Checkout Use Case
 * 
 * Orchestrates checkout initiation with validation and event publishing.
 * Application layer - coordinates domain and infrastructure.
 */

import { CheckoutEngine, CheckoutContext } from '../../domain/engines/checkout.engine';
import { PricingPolicy } from '../../domain/policies/pricing.policy';
import { Cart } from '../../domain/value-objects/cart.value-object';
import { v4 as uuid } from 'uuid';

export interface CheckoutRepository {
  saveCheckoutSession(session: any): Promise<void>;
  getCheckoutSession(id: string): Promise<any>;
}

export interface CartRepository {
  getCart(id: string): Promise<any>;
}

export interface EventBus {
  publish(eventType: string, data: any): Promise<void>;
}

export interface ValidationError {
  field?: string;
  message: string;
}

export interface PricingData {
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
}

export interface CheckoutResult {
  success: boolean;
  data?: any;
  pricing?: PricingData;
  errors?: ValidationError[];
}

export class InitiateCheckoutUseCase {
  private engine: CheckoutEngine;

  constructor(
    pricingPolicy: PricingPolicy,
    private checkoutRepository: CheckoutRepository,
    private cartRepository?: CartRepository,
    private eventBus?: EventBus
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
  ): Promise<CheckoutResult> {
    const errors: ValidationError[] = [];

    try {
      // Validate inputs
      if (!cartId) errors.push({ field: 'cartId', message: 'Cart ID is required' });
      if (!userId) errors.push({ field: 'userId', message: 'User ID is required' });
      if (!shippingAddressId) errors.push({ message: 'Shipping address is required' });
      if (!billingAddressId) errors.push({ message: 'Billing address is required' });
      if (!shippingMethodId) errors.push({ message: 'Shipping method is required' });

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Fetch cart
      let cartData;
      if (this.cartRepository) {
        cartData = await this.cartRepository.getCart(cartId);
        if (!cartData) {
          return {
            success: false,
            errors: [{ field: 'cartId', message: 'Cart not found' }]
          };
        }
      } else {
        // Use mock cart data for testing
        cartData = {
          items: [
            {
              productId: 'prod-1',
              quantity: 1,
              priceAtTime: 100
            }
          ]
        };
      }

      // Create cart domain object
      const cart = new Cart({ items: cartData.items || [] });

      // Create checkout context
      const context: CheckoutContext = {
        cart,
        userId,
        shippingAddress: { id: shippingAddressId },
        billingAddress: { id: billingAddressId },
        shippingMethod: { id: shippingMethodId, cost: shippingCost },
        appliedDiscounts: []
      };

      // Calculate pricing
      const pricingResult = this.engine.calculatePricing(context);
      if (!pricingResult.isValid) {
        return {
          success: false,
          errors: pricingResult.errors?.map(msg => ({ message: msg })) || []
        };
      }

      // Create checkout session
      const checkoutId = uuid();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour
      const items = cart.getItems();

      const session = {
        id: checkoutId,
        cartId,
        userId,
        shippingAddressId,
        billingAddressId,
        shippingMethodId,
        status: 'initiated',
        subtotal: pricingResult.pricing!.subtotal.getAmount(),
        taxAmount: pricingResult.pricing!.taxAmount.getAmount(),
        discountAmount: pricingResult.pricing!.discountAmount.getAmount(),
        shippingCost: pricingResult.pricing!.shippingCost.getAmount(),
        totalAmount: pricingResult.pricing!.total.getAmount(),
        items,
        metadata: { items },
        expiresAt,
        createdAt: new Date()
      };

      // Save session
      await this.checkoutRepository.saveCheckoutSession(session);

      // Publish event
      if (this.eventBus) {
        await this.eventBus.publish('CheckoutInitiated', {
          checkoutId,
          cartId,
          userId,
          totalAmount: pricingResult.pricing!.total.getAmount(),
          timestamp: new Date()
        });
      }

      return {
        success: true,
        data: session,
        pricing: {
          subtotal: pricingResult.pricing!.subtotal.getAmount(),
          taxAmount: pricingResult.pricing!.taxAmount.getAmount(),
          shippingCost: pricingResult.pricing!.shippingCost.getAmount(),
          discountAmount: pricingResult.pricing!.discountAmount.getAmount(),
          total: pricingResult.pricing!.total.getAmount()
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            field: 'system',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        ]
      };
    }
  }
}
