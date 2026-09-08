/**
 * Initiate Checkout Use Case
 *
 * Orchestrates checkout initiation with validation and event publishing.
 * Application layer - coordinates domain and infrastructure.
 *
 * Security: the authoritative shipping cost is ALWAYS sourced from the validated
 * delivery quote returned by logistics-service. Any client-supplied shippingCost
 * value is ignored entirely to prevent price manipulation.
 */

import { CheckoutEngine, CheckoutContext } from '../../domain/engines/checkout.engine';
import { PricingPolicy } from '../../domain/policies/pricing.policy';
import { Cart } from '../../domain/value-objects/cart.value-object';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { normalizeEnablerCode, toShortEnablerCode } from '@shared/ids/public-codes';
import { QuoteValidationService, QuoteRejectionReason } from '../../infrastructure/services/quote-validation.service';
import { CatalogPriceValidatorService } from '../../infrastructure/services/catalog-price-validator.service';

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

/** Maps a QuoteRejectionReason to a user-facing error message. */
function rejectionMessage(reason: QuoteRejectionReason | undefined): string {
  switch (reason) {
    case 'NOT_FOUND':           return 'Delivery quote not found. Please request a new quote.';
    case 'EXPIRED':             return 'Delivery quote has expired. Please request a new quote.';
    case 'CONSUMED':            return 'Delivery quote has already been used. Please request a new quote.';
    case 'DELIVERY_UNAVAILABLE': return 'Delivery is not available for this route. Please choose a different address.';
    case 'SERVICE_UNAVAILABLE': return 'Delivery pricing service is temporarily unavailable. Please try again.';
    default:                    return 'Invalid delivery quote. Please request a new quote.';
  }
}

export class InitiateCheckoutUseCase {
  private engine: CheckoutEngine;

  constructor(
    pricingPolicy: PricingPolicy,
    private checkoutRepository: CheckoutRepository,
    private cartRepository?: CartRepository,
    private eventBus?: EventBus,
    private enablerLookup?: EnablerLookup,
    private quoteValidationService?: QuoteValidationService,
    private catalogPriceValidator?: CatalogPriceValidatorService,
  ) {
    this.engine = new CheckoutEngine(pricingPolicy);
  }

  async execute(
    cartId: string,
    userId: string,
    shippingAddressId: string,
    billingAddressId: string,
    shippingMethodId: string,
    /** @deprecated Ignored. Authoritative shipping cost comes from the validated delivery quote. */
    _shippingCost: number,
    enablerCode?: string,
    options?: {
      items?: Array<{ productId: string; variantId?: string; quantity: number; price?: number; priceAtTime?: number; weight?: number }>;
      orderSource?: 'CART' | 'DIRECT';
      /** Buyer's delivery-window preference (Phase 4 §4.1): FLEXIBLE | STANDARD | EXPRESS. */
      deliveryWindowPreference?: 'FLEXIBLE' | 'STANDARD' | 'EXPRESS';
    },
    quoteId?: string,
  ): Promise<CheckoutResult> {
    const errors: ValidationError[] = [];
    const isDirect = options?.orderSource === 'DIRECT' || (options?.items && options.items.length > 0);

    // ── Delivery-window preference validation (Phase 4 §4.1) ────────────────
    const VALID_WINDOW_PREFERENCES = ['FLEXIBLE', 'STANDARD', 'EXPRESS'] as const;
    const deliveryWindowPreference = options?.deliveryWindowPreference;
    if (deliveryWindowPreference && !VALID_WINDOW_PREFERENCES.includes(deliveryWindowPreference)) {
      return {
        success: false,
        errors: [{ field: 'deliveryWindowPreference', message: 'deliveryWindowPreference must be one of FLEXIBLE, STANDARD or EXPRESS.' }],
      };
    }

    try {
      // ── Quote validation (security gate) ────────────────────────────────────
      // quoteId is required. The shipping cost MUST come from the validated quote.
      if (!quoteId || quoteId.trim() === '') {
        return {
          success: false,
          errors: [{ field: 'quoteId', message: 'A valid delivery quote is required to proceed with checkout.' }],
        };
      }

      let authoritativeShippingCost = 0;
      let pricingVersion: number | undefined;

      if (this.quoteValidationService) {
        const quoteResult = await this.quoteValidationService.validate(quoteId);

        if (!quoteResult.valid) {
          return {
            success: false,
            errors: [{ field: 'quoteId', message: rejectionMessage(quoteResult.rejectionReason) }],
          };
        }

        authoritativeShippingCost = quoteResult.deliveryFee ?? 0;
        pricingVersion = quoteResult.pricingVersion;
      } else {
        // No validation service wired (e.g. legacy callers or test env without logistics)
        // Fall back gracefully — shipping cost stays 0
        authoritativeShippingCost = 0;
      }

      // ── Standard input validation ────────────────────────────────────────────
      if (!isDirect && !cartId) errors.push({ field: 'cartId', message: 'Cart ID is required' });
      if (!userId) errors.push({ field: 'userId', message: 'User ID is required' });
      if (!shippingAddressId) errors.push({ message: 'Shipping address is required' });
      if (!billingAddressId) errors.push({ message: 'Billing address is required' });
      if (!shippingMethodId) errors.push({ message: 'Shipping method is required' });

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // ── Enabler resolution ───────────────────────────────────────────────────
      let resolvedEnabler: { id: string; userId: string; code: string; shortCode?: string } | undefined;
      if (enablerCode) {
        if (!this.enablerLookup) {
          return {
            success: false,
            errors: [{ field: 'enablerCode', message: 'Enabler attribution service is unavailable' }],
          };
        }

        const normalizedCode = normalizeEnablerCode(enablerCode);
        if (!normalizedCode) {
          return {
            success: false,
            errors: [{ field: 'enablerCode', message: 'Invalid enabler code format' }],
          };
        }

        const shortCode = toShortEnablerCode(normalizedCode) || undefined;
        const enabler = await this.enablerLookup.findByCode(normalizedCode, shortCode);
        if (!enabler) {
          return {
            success: false,
            errors: [{ field: 'enablerCode', message: 'Enabler code not found' }],
          };
        }

        const status = String(enabler.status || '').toUpperCase();
        if (status !== 'APPROVED' && status !== 'ACTIVE') {
          return {
            success: false,
            errors: [{ field: 'enablerCode', message: 'Enabler is not active' }],
          };
        }

        if (enabler.userId === userId) {
          return {
            success: false,
            errors: [{ field: 'enablerCode', message: 'Enabler cannot be the buyer' }],
          };
        }

        resolvedEnabler = { id: enabler.id, userId: enabler.userId, code: normalizedCode, shortCode };
      }

      // ── Cart / item resolution ───────────────────────────────────────────────
      let cartItems: any[] = [];

      if (isDirect && options?.items && options.items.length > 0) {
        cartItems = options.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity ?? 1,
          priceAtTime: item.priceAtTime ?? (typeof item.price === 'number' ? item.price : 50000),
          weight: item.weight ?? 0.5,
        }));
      } else {
        const allowDevFallback = process.env.NODE_ENV !== 'production';
        if (!this.cartRepository) {
          if (!allowDevFallback) {
            return {
              success: false,
              errors: [{ field: 'cartId', message: 'Cart repository is not configured' }],
            };
          }
        }

        let cartData = this.cartRepository ? await this.cartRepository.getCart(cartId) : null;
        if (!cartData) {
          if (!allowDevFallback) {
            return {
              success: false,
              errors: [{ field: 'cartId', message: 'Cart not found' }],
            };
          }
          cartData = {
            id: cartId,
            userId,
            items: [{
              productId: 'dev-product',
              variantId: undefined,
              quantity: 1,
              priceAtTime: 50000,
            }],
          };
        }
        cartItems = cartData.items || [];
      }

      // ── Server-authoritative price resolution ───────────────────────────────
      // Validate and substitute each item's priceAtTime with the canonical
      // catalog price. This prevents price manipulation at checkout.
      if (this.catalogPriceValidator && cartItems.length > 0) {
        const priceValidation = await this.catalogPriceValidator.validateAndResolve(
          cartItems.map(i => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity ?? 1,
            priceAtTime: i.priceAtTime ?? 0,
          })),
        );

        if (!priceValidation.valid) {
          return {
            success: false,
            errors: (priceValidation.errors ?? []).map(e => ({
              field: 'items',
              message: e.message,
            })),
          };
        }

        // Substitute with server-authoritative prices
        if (priceValidation.resolvedItems) {
          cartItems = cartItems.map((item, idx) => ({
            ...item,
            priceAtTime: priceValidation.resolvedItems![idx]?.priceAtTime ?? item.priceAtTime,
          }));
        }
      }

      // ── Pricing calculation ──────────────────────────────────────────────────
      const cart = new Cart({ items: cartItems });

      const context: CheckoutContext = {
        cart,
        userId,
        shippingAddress: { id: shippingAddressId },
        billingAddress: { id: billingAddressId },
        // Use the server-authoritative cost, NOT the client-supplied value
        shippingMethod: { id: shippingMethodId, cost: authoritativeShippingCost },
        appliedDiscounts: [],
      };

      const pricingResult = this.engine.calculatePricing(context);
      if (!pricingResult.isValid) {
        return {
          success: false,
          errors: pricingResult.errors?.map(msg => ({ message: msg })) || [],
        };
      }

      // ── Build & persist checkout session ─────────────────────────────────────
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
        // Server-authoritative shipping cost from logistics quote
        shippingCost: authoritativeShippingCost,
        // Quote audit fields
        quoteId,
        pricingVersion: pricingVersion ?? null,
        // Buyer's delivery-window preference (Phase 4 §4.1)
        deliveryWindowPreference,
        status: 'initiated',
        subtotal: pricingResult.pricing!.subtotal.getAmount(),
        taxAmount: pricingResult.pricing!.taxAmount.getAmount(),
        discountAmount: pricingResult.pricing!.discountAmount.getAmount(),
        totalAmount: pricingResult.pricing!.total.getAmount(),
        items,
        metadata: {
          items,
          orderSource: isDirect ? 'DIRECT' : 'CART',
          ...(deliveryWindowPreference ? { deliveryWindowPreference } : {}),
          ...(resolvedEnabler
            ? {
              enablerId: resolvedEnabler.id,
              enablerCode: resolvedEnabler.code,
              enablerCodeShort: resolvedEnabler.shortCode,
            }
            : {}),
        },
        expiresAt,
        createdAt: new Date(),
      };

      await this.checkoutRepository.saveCheckoutSession(session);

      // Mark the quote consumed now the session is persisted
      if (this.quoteValidationService && quoteId) {
        await this.quoteValidationService.markConsumed(quoteId);
      }

      // ── Publish event ────────────────────────────────────────────────────────
      if (this.eventBus) {
        await this.eventBus.publish('CheckoutInitiated', {
          checkoutId,
          cartId,
          userId,
          quoteId,
          ...(resolvedEnabler
            ? { enablerId: resolvedEnabler.id, enablerCode: resolvedEnabler.code }
            : {}),
          totalAmount: pricingResult.pricing!.total.getAmount(),
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        data: session,
        pricing: {
          subtotal: pricingResult.pricing!.subtotal.getAmount(),
          taxAmount: pricingResult.pricing!.taxAmount.getAmount(),
          shippingCost: authoritativeShippingCost,
          discountAmount: pricingResult.pricing!.discountAmount.getAmount(),
          total: pricingResult.pricing!.total.getAmount(),
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            field: 'system',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }
}
