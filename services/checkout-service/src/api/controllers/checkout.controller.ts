/**
 * Checkout Controller
 * 
 * Handles HTTP requests for checkout operations.
 * API layer - request/response handling.
 */

import { Request, Response } from 'express';
import { InitiateCheckoutUseCase } from '../../application/use-cases/initiate-checkout.use-case';
import { PricingPolicy } from '../../domain/policies/pricing.policy';
import { validateCheckoutRequest } from '../../shared/validators';
import { AppError } from '../../shared/errors/app.error';
import { logger } from '../../shared/logger/logger';
import { idempotencyManager } from '../../shared/idempotency';
import { CheckoutMapper } from '../../application/mappers/checkout.mapper';
import { config } from '../../shared/config';
import { assessMinimumBasketValue } from '@shared/business/minimum-basket-value';
import { QuoteValidationService } from '../../infrastructure/services/quote-validation.service';
import { CatalogPriceValidatorService } from '../../infrastructure/services/catalog-price-validator.service';
import { GetDeliveryOptionsUseCase } from '../../application/use-cases/get-delivery-options.use-case';

export class CheckoutController {
  private initiateCheckoutUseCase: InitiateCheckoutUseCase;

  constructor(
    private checkoutRepository: any,
    private eventBus: any,
    private cartRepository?: any,
    private enablerLookup?: any,
    private checkoutOrderRepository?: any,
    private quoteValidationService?: QuoteValidationService,
    private catalogPriceValidator?: CatalogPriceValidatorService,
  ) {
    const pricingPolicy = new PricingPolicy({
      taxRate: config.pricing.taxRate,
      shippingCost: config.pricing.shippingCost,
      minOrderForFreeShipping: config.pricing.minOrderForFreeShipping
    });

    this.initiateCheckoutUseCase = new InitiateCheckoutUseCase(
      pricingPolicy,
      checkoutRepository,
      cartRepository,
      eventBus,
      enablerLookup,
      quoteValidationService,
      catalogPriceValidator,
    );
  }

  /**
   * POST /api/checkout/delivery-options
   * Body: { sessionId, buyerLat?, buyerLng?, buyerAddress?, buyerAddressId? }
   */
  async getDeliveryOptions(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, buyerLat, buyerLng, buyerAddress, buyerAddressId } = req.body ?? {};
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: { code: 'SESSION_ID_REQUIRED', message: 'sessionId is required' },
          timestamp: new Date(),
        });
        return;
      }
      const useCase = new GetDeliveryOptionsUseCase();
      const result = await useCase.execute(
        sessionId,
        buyerLat !== undefined ? Number(buyerLat) : undefined,
        buyerLng !== undefined ? Number(buyerLng) : undefined,
        buyerAddress,
        buyerAddressId,
      );
      res.json({ success: true, data: result, timestamp: new Date() });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      });
    }
  }

  async initiateCheckout(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    try {
      const {
        cartId,
        userId,
        shippingAddressId,
        billingAddressId,
        shippingMethodId: rawShippingMethodId,
        paymentMethodId,
        shippingCost,
        enablerCode,
        items,
        orderSource,
        checkoutSource,
        quoteId,
        deliveryWindowPreference,
      } = req.body;
      const shippingMethodId = rawShippingMethodId ?? paymentMethodId;
      const effectiveOrderSource = orderSource || checkoutSource || (items && items.length > 0 ? 'DIRECT' : 'CART');

      validateCheckoutRequest({
        cartId: effectiveOrderSource === 'DIRECT' ? (cartId || 'direct-cart') : cartId,
        userId,
        shippingAddressId,
        billingAddressId,
        shippingMethodId,
        shippingCost
      });

      if (idempotencyKey) {
        const cached = idempotencyManager.retrieve(idempotencyKey);
        if (cached) {
          logger.info('Idempotent request - returning cached result', { idempotencyKey }, correlationId);
          res.json(cached);
          return;
        }
      }

      const result = await this.initiateCheckoutUseCase.execute(
        cartId || 'direct-cart',
        userId,
        shippingAddressId,
        billingAddressId,
        shippingMethodId,
        shippingCost,
        enablerCode,
        {
          items,
          orderSource: effectiveOrderSource,
          // Phase 4 §4.1: buyer's delivery-window preference
          deliveryWindowPreference,
        },
        quoteId,
      );

      if (!result.success) {
        logger.warn('Checkout initiation failed', { errors: result.errors }, correlationId);
        res.status(400).json({
          success: false,
          error: {
            code: 'CHECKOUT_VALIDATION_FAILED',
            message: 'Checkout validation failed',
            details: result.errors
          },
          timestamp: new Date()
        });
        return;
      }

      const response = {
        success: true,
        data: CheckoutMapper.checkoutSessionToDTO(result.data),
        timestamp: new Date()
      };

      if (idempotencyKey) {
        idempotencyManager.store(idempotencyKey, response);
      }

      logger.info('Checkout initiated', { checkoutId: result.data.id, userId }, correlationId);
      res.json(response);
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error initiating checkout', error as Error, { cartId: req.body.cartId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof AppError ? error.details : undefined
        },
        timestamp: new Date()
      });
    }
  }

  async getCheckoutSession(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    try {
      const sessionId = (req.params.sessionId || req.params.id) as string | undefined;
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: { code: 'CHECKOUT_SESSION_ID_REQUIRED', message: 'Session ID is required' },
          timestamp: new Date()
        });
        return;
      }

      const session = await this.checkoutRepository.getSession(sessionId);
      if (!session) {
        logger.warn('Checkout session not found', { sessionId }, correlationId);
        res.status(404).json({
          success: false,
          error: { code: 'CHECKOUT_SESSION_NOT_FOUND', message: 'Session not found' },
          timestamp: new Date()
        });
        return;
      }

      logger.info('Checkout session retrieved', { sessionId }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.checkoutSessionToDTO(session),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error retrieving checkout session', error as Error, { sessionId: req.params.sessionId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  }

  async confirmCheckout(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    const idempotencyKey = req.headers['idempotency-key'] as string;
    const params = req.params ?? {};
    const body = req.body ?? {};

    try {
      // Check idempotency
      if (idempotencyKey) {
        const cached = idempotencyManager.retrieve(idempotencyKey);
        if (cached) {
          logger.info('Idempotent request - returning cached result', { idempotencyKey }, correlationId);
          res.json(cached);
          return;
        }
      }

      const sessionId = (params.id || body.sessionId) as string | undefined;
      const paymentMethodId = body.paymentMethodId || body.paymentMethod || 'SELLER_VERIFICATION';

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: { code: 'CHECKOUT_SESSION_ID_REQUIRED', message: 'Session ID is required' },
          timestamp: new Date()
        });
        return;
      }

      const session = await this.checkoutRepository.getSession(sessionId);
      if (!session) {
        logger.warn('Checkout session not found', { sessionId }, correlationId);
        res.status(404).json({
          success: false,
          error: { code: 'CHECKOUT_SESSION_NOT_FOUND', message: 'Session not found' },
          timestamp: new Date()
        });
        return;
      }

      const checkoutSource = body.checkoutSource || body.orderSource || session.metadata?.orderSource;

      const basketAssessment = assessMinimumBasketValue(Number(session.totalAmount ?? 0));
      if (!basketAssessment.eligible) {
        res.status(422).json({
          success: false,
          error: {
            code: 'MINIMUM_BASKET_VALUE_NOT_MET',
            message: basketAssessment.message,
            details: {
              minimumBasketValue: basketAssessment.minimumBasketValue,
              shortfall: basketAssessment.shortfall
            }
          },
          timestamp: new Date()
        });
        return;
      }

      session.paymentMethodId = paymentMethodId;
      session.status = String(paymentMethodId).toUpperCase() === 'SELLER_VERIFICATION'
        ? 'PENDING_SELLER_VERIFICATION'
        : 'payment_pending';
      await this.checkoutRepository.saveCheckoutSession(session);

      // Synchronously upsert checkout order record so orderId is available in the response
      let orderId: string | undefined;
      if (this.checkoutOrderRepository) {
        let checkoutOrder = await this.checkoutOrderRepository.findByCheckoutSessionId(sessionId);
        if (!checkoutOrder) {
          checkoutOrder = await this.checkoutOrderRepository.createFromSession(session);
        }
        orderId = checkoutOrder.id;
      }

      // ── Multi-seller checkout routing ─────────────────────────────────────
      // If the request includes sellerQuotes (multi-seller) or session items span
      // multiple sellers, route to MultiSellerCheckoutUseCase.
      const sellerQuotes = body.sellerQuotes as Record<string, { quoteId: string }> | undefined;
      const multiSellerUseCase = (globalThis as any).__multiSellerCheckoutUseCase;

      if (sellerQuotes && Object.keys(sellerQuotes).length > 1 && multiSellerUseCase) {
        // Multi-seller path
        const authUser = (req as any).user;
        const buyerId = authUser?.userId || authUser?.id || session.userId;

        const deliveryAddress = body.deliveryAddress || {
          street: 'Checkout Address',
          ward: 'Dar es Salaam',
          postalCode: '00000',
          country: 'Tanzania',
        };

        const msResult = await multiSellerUseCase.execute({
          sessionId,
          buyerId,
          paymentMethod: paymentMethodId,
          deliveryAddress,
          sellerQuotes,
          // Phase 4 §4.1: buyer's delivery-window preference (request wins, then session).
          deliveryWindowPreference:
            body.deliveryWindowPreference ?? session.deliveryWindowPreference ?? session.metadata?.deliveryWindowPreference,
        });

        if (!msResult.success) {
          res.status(422).json({
            success: false,
            error: msResult.error,
            timestamp: new Date(),
          });
          return;
        }

        const msResponse = {
          success: true,
          data: {
            masterOrderId: msResult.masterOrderId,
            sellerOrders: msResult.sellerOrders,
            totalAmount: msResult.totalAmount,
          },
          timestamp: new Date(),
        };

        if (idempotencyKey) idempotencyManager.store(idempotencyKey, msResponse);
        logger.info('Multi-seller checkout confirmed', { sessionId, masterOrderId: msResult.masterOrderId }, correlationId);
        res.json(msResponse);
        return;
      }
      // ── End multi-seller routing ───────────────────────────────────────────

      // ── Synchronous order placement (monolith only) ────────────────────────
      let realOrderId: string | undefined;
      let chatConversationId: string | undefined;
      const isSellerVerification = String(paymentMethodId).toUpperCase() === 'SELLER_VERIFICATION';

      try {
        const globalPlaceOrder = (globalThis as any).__placeOrderUseCase;
        if (globalPlaceOrder && session.items && session.items.length > 0) {
          const rawPaymentMethod = String(paymentMethodId ?? session.paymentMethodId ?? 'SELLER_VERIFICATION').toUpperCase();
          const normalizedPaymentMethod =
            rawPaymentMethod === 'SELLER_VERIFICATION' ? 'SELLER_VERIFICATION'
            : rawPaymentMethod === 'COD' ? 'COD'
            : rawPaymentMethod === 'CARD' ? 'CARD'
            : rawPaymentMethod === 'MOBILE_PAYMENT' ? 'MOBILE_PAYMENT'
            : 'WALLET';

          // Look up sellerId from the catalog (Product table) using the first item's productId
          let sellerId: string = String(session.metadata?.sellerId ?? '');
          if (!sellerId) {
            try {
              const g = globalThis as unknown as { prisma?: any };
              const prismaClient = g.prisma;
              const firstProductId = (session.items[0] as any).productId;
              if (prismaClient && firstProductId) {
                const product = await prismaClient.product?.findUnique?.({
                  where: { id: firstProductId },
                  select: { sellerId: true }
                });
                sellerId = product?.sellerId ?? '';
              }
            } catch (_lookupErr) { /* non-fatal */ }
          }

          if (sellerId) {
            const effectiveSource = checkoutSource || session.metadata?.orderSource || 'CART';

            // ── Resolve fulfillment location ──────────────────────────────────
            // Look up the seller's primary active location for real pickup coords
            let fulfillmentLocationId: string | undefined;
            try {
              const g = globalThis as unknown as { prisma?: any };
              const pc = g.prisma;
              if (pc?.catalog_SellerLocation) {
                const loc = await pc.catalog_SellerLocation.findFirst({
                  where: { sellerId, isActive: true, status: 'ACTIVE' },
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                  select: { id: true },
                });
                fulfillmentLocationId = loc?.id;
              }
            } catch { /* non-fatal */ }

            const placeRequest = {
              buyerId: session.userId,
              sellerId,
              items: session.items.map((item: any) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                price: { amount: Number(item.priceAtTime ?? item.price ?? 0), currency: 'TZS' },
                weight: item.weight ?? 0.5
              })),
              deliveryAddress: body.deliveryAddress ?? session.metadata?.deliveryAddress ?? {
                street: 'Checkout Address',
                ward: 'Dar es Salaam',
                region: 'Dar es Salaam',
                country: 'Tanzania',
                postalCode: '00000'
              },
              paymentMethod: normalizedPaymentMethod,
              orderSource: effectiveSource,
              orderCompletionMethod: isSellerVerification ? 'SELLER_VERIFICATION' : normalizedPaymentMethod,
              currency: 'TZS',
              deliveryFee: Number(session.shippingCost ?? 0),
              deferPayment: true,
              fulfillmentLocationId,
            };
            const placed = await globalPlaceOrder.execute(placeRequest);
            realOrderId = placed?.orderId;
            logger.info('[Checkout] Synchronously placed order via globalPlaceOrder', { realOrderId, sessionId, isSellerVerification });

            // Automatically create/resolve Maysar Chat conversation for Seller Verification
            if (isSellerVerification && session.userId && sellerId && realOrderId) {
              try {
                const g = globalThis as unknown as { prisma?: any };
                const prismaClient = g.prisma;
                if (prismaClient?.chat_Conversation) {
                  let existingConv = await prismaClient.chat_Conversation.findFirst({
                    where: {
                      type: 'BUYER_SELLER',
                      relatedOrderId: realOrderId,
                    }
                  });
                  if (!existingConv) {
                    existingConv = await prismaClient.chat_Conversation.create({
                      data: {
                        type: 'BUYER_SELLER',
                        moderationStatus: 'ACTIVE',
                        relatedOrderId: realOrderId,
                        metadata: { createdFromCheckout: true, orderId: realOrderId },
                        participants: {
                          create: [
                            { userId: session.userId, role: 'BUYER' },
                            { userId: sellerId, role: 'SELLER' }
                          ]
                        }
                      }
                    });
                  }
                  chatConversationId = existingConv?.id;
                  if (chatConversationId && realOrderId && prismaClient.order_Order) {
                    await prismaClient.order_Order.update({
                      where: { id: realOrderId },
                      data: { chatConversationId, orderCompletionMethod: 'SELLER_VERIFICATION' }
                    });
                  }
                }
              } catch (_chatErr: any) {
                logger.warn('[Checkout] Failed to initiate seller verification chat (non-fatal)', { error: _chatErr?.message });
              }
            }

            // Store realOrderId & chatConversationId on Checkout_Order
            if (realOrderId && orderId) {
              try {
                const g = globalThis as unknown as { prisma?: any };
                await g.prisma?.checkout_Order?.update?.({
                  where: { id: orderId },
                  data: { metadata: { realOrderId, chatConversationId } }
                });
              } catch (_storeErr) { /* non-fatal */ }
            }
          }
        }
      } catch (placeErr: any) {
        logger.warn('[Checkout] Synchronous order placement failed (non-fatal)', { error: placeErr?.message, sessionId });
      }

      // ── Create shipment for the single-seller order (Phase 2 §2.1) ─────────
      // One Logistics_Shipment per seller group, owned by logistics-service
      // (registered as __createOrderShipments by the logistics module).
      // Non-fatal: shipment reconciliation can happen later if this fails.
      try {
        const createOrderShipments = (globalThis as any).__createOrderShipments;
        const g = globalThis as unknown as { prisma?: any };
        if (createOrderShipments && realOrderId && g.prisma && session.items?.length) {
          let shipSellerId: string = String(session.metadata?.sellerId ?? '');
          if (!shipSellerId) {
            const product = await g.prisma.product?.findUnique?.({
              where: { id: (session.items[0] as any).productId },
              select: { sellerId: true },
            });
            shipSellerId = product?.sellerId ?? '';
          }
          if (shipSellerId) {
            const loc = await g.prisma.catalog_SellerLocation?.findFirst?.({
              where: { sellerId: shipSellerId, isActive: true, status: 'ACTIVE' },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            });
            const shipAddr: any = body.deliveryAddress ?? session.metadata?.deliveryAddress ?? {};
            const shipAddressParts = [shipAddr.street, shipAddr.ward, shipAddr.district, shipAddr.city, shipAddr.region, shipAddr.country]
              .filter(Boolean).join(', ');
            await createOrderShipments({
              masterOrderId: realOrderId,
              buyer: {
                lat: Number(shipAddr.latitude) || undefined,
                lng: Number(shipAddr.longitude) || undefined,
                address: shipAddressParts || 'Dar es Salaam, Tanzania',
              },
              sellers: [{
                sellerId: shipSellerId,
                sellerOrderId: realOrderId,
                pickupLat: loc ? Number(loc.latitude) : (Number(shipAddr.latitude) || -6.7924),
                pickupLng: loc ? Number(loc.longitude) : (Number(shipAddr.longitude) || 39.2083),
                pickupAddress: loc
                  ? [loc.street, loc.ward, loc.district, loc.region, loc.country].filter(Boolean).join(', ')
                  : (shipAddressParts || 'Dar es Salaam, Tanzania'),
                packageWeightKg: session.items.reduce(
                  (sum: number, item: any) => sum + (item.weight ?? 0.5) * (item.quantity ?? 1), 0),
              }],
              // Phase 4 §4.1: buyer's delivery-window preference → shipment window.
              deliveryWindowPreference: body.deliveryWindowPreference ?? session.metadata?.deliveryWindowPreference,
            });
          }
        }
      } catch (shipErr: any) {
        logger.warn('[Checkout] Shipment creation failed (non-fatal)', { error: shipErr?.message });
      }

      // ── Lock the buyer price for the single-seller quote (Phase 3 §3.4) ────
      // FulfillmentCommitment — the locked price is absolute. Non-fatal.
      try {
        const lockPrice = (globalThis as any).__lockFulfillmentPrice;
        if (lockPrice && session.quoteId && Number(session.shippingCost) > 0) {
          await lockPrice({
            checkoutSessionId: sessionId,
            quoteId: String(session.quoteId),
            buyerPriceTzs: Number(session.shippingCost),
            pricingVersion: Number((session as any).pricingVersion ?? 0),
            expiresAt: session.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000),
          });
        }
      } catch (lockErr: any) {
        logger.warn('[Checkout] Price lock failed (non-fatal)', { error: lockErr?.message });
      }

      // Safeguard: Clear cart ONLY if this is a CART purchase, never for DIRECT purchase
      const effectiveSource = checkoutSource || session.metadata?.orderSource || 'CART';
      if (effectiveSource === 'CART' && session.cartId && this.cartRepository?.clearCart) {
        try {
          await this.cartRepository.clearCart(session.cartId);
        } catch (_clearErr: any) {
          logger.warn('[Checkout] Failed to clear cart (non-fatal)', { cartId: session.cartId });
        }
      }

      await this.eventBus.publish('OrderCreated', {
        checkoutId: sessionId,
        // Include orderId so the payment saga can create a payment record immediately.
        // The saga handler guards against missing orderId, so this was silently a no-op.
        orderId: realOrderId,
        userId: session.userId,
        totalAmount: session.totalAmount,
        currency: 'TZS',
        paymentMethod: String(session.paymentMethodId || 'WALLET').toUpperCase(),
        orderSource: effectiveSource,
        ...(session.enablerId ? { enablerId: session.enablerId, enablerCode: session.enablerCode } : {})
      });

      const response = {
        success: true,
        data: {
          ...CheckoutMapper.checkoutSessionToDTO(session),
          // Only an ORDER NUMBER (ORD-YYYYMMDD-NLNL) is ever exposed as `orderId`.
          // When the synchronous placement did not run there is no order yet, so the
          // checkout id is reported under its own field and no order id is fabricated.
          ...(realOrderId ? { orderId: realOrderId } : { checkoutId: orderId }),
          ...(chatConversationId ? { chatConversationId } : {})
        },
        timestamp: new Date()
      };

      if (idempotencyKey) {
        idempotencyManager.store(idempotencyKey, response);
      }

      logger.info('Checkout confirmed', { sessionId, userId: session.userId, chatConversationId }, correlationId);
      res.json(response);
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error confirming checkout', error as Error, { sessionId: body.sessionId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  }
}
