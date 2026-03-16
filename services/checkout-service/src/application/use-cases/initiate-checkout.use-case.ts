/**
 * Initiate Checkout Use Case
 * 
 * Orchestrates checkout initiation with validation and event publishing.
 * Application layer - coordinates domain and infrastructure.
 */

import { CheckoutEngine, CheckoutContext } from '../../domain/engines/checkout.engine';
import { PricingPolicy } from '../../domain/policies/pricing.policy';
import { Cart } from '../../domain/value-objects/cart.value-object';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { normalizeEnablerCode, toShortEnablerCode } from '@shared/ids/public-codes';

export interface CheckoutRepository {
  saveCheckoutSession(session: any): Promise<void>;
  getCheckoutSession(id: string): Promise<any>;
}

export interface CartRepository {
  getCart(id: string): Promise<any>;
}

export interface EnablerLookup {
  findByCode(code: string, shortCode?: string): Promise<{ id: string; userId: string; status: string } | null>;
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
    private eventBus?: EventBus,
    private enablerLookup?: EnablerLookup
  ) {
    this.engine = new CheckoutEngine(pricingPolicy);
  }

  async execute(
    cartId: string,
    userId: string,
    shippingAddressId: string,
    billingAddressId: string,
    shippingMethodId: string,
    shippingCost: number,
    enablerCode?: string
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

      let resolvedEnabler: { id: string; userId: string; code: string; shortCode?: string } | undefined;
      if (enablerCode) {
        if (!this.enablerLookup) {
          return {
            success: false,
            errors: [{ field: 'enablerCode', message: 'Enabler attribution service is unavailable' }]
          };
        }

        const normalizedCode = normalizeEnablerCode(enablerCode);
        if (!normalizedCode) {
          return {
            success: false,
            errors: [{ field: 'enablerCode', message: 'Invalid enabler code format' }]
          };
        }

        const shortCode = toShortEnablerCode(normalizedCode) || undefined;
        const enabler = await this.enablerLookup.findByCode(normalizedCode, shortCode);
        if (!enabler) {
          return {
            success: false,
            errors: [{ field: 'enablerCode', message: 'Enabler code not found' }]
          };
        }

        const status = String(enabler.status || '').toUpperCase();
        if (status !== 'APPROVED' && status !== 'ACTIVE') {
          return {
            success: false,
            errors: [{ field: 'enablerCode', message: 'Enabler is not active' }]
          };
        }

        if (enabler.userId === userId) {
          return {
            success: false,
            errors: [{ field: 'enablerCode', message: 'Enabler cannot be the buyer' }]
          };
        }

        resolvedEnabler = { id: enabler.id, userId: enabler.userId, code: normalizedCode, shortCode };
      }

      // Fetch cart
      if (!this.cartRepository) {
        return {
          success: false,
          errors: [{ field: 'cartId', message: 'Cart repository is not configured' }]
        };
      }

      const cartData = await this.cartRepository.getCart(cartId);
      if (!cartData) {
        return {
          success: false,
          errors: [{ field: 'cartId', message: 'Cart not found' }]
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
      const checkoutId = makeId(getModelPrefix('Checkout_CheckoutSession'));
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour
      const items = cart.getItems();

      const session = {
        id: checkoutId,
        cartId,
        userId,
        ...(resolvedEnabler
          ? { enablerId: resolvedEnabler.id, enablerCode: resolvedEnabler.code }
          : {}),
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
        metadata: {
          items,
          ...(resolvedEnabler
            ? {
              enablerId: resolvedEnabler.id,
              enablerCode: resolvedEnabler.code,
              enablerCodeShort: resolvedEnabler.shortCode
            }
            : {})
        },
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
          ...(resolvedEnabler
            ? { enablerId: resolvedEnabler.id, enablerCode: resolvedEnabler.code }
            : {}),
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
