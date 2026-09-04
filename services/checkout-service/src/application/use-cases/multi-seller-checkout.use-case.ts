/**
 * MultiSellerCheckoutUseCase
 *
 * Orchestrates multi-seller checkout (Approach A):
 *  1. Load and validate checkout session
 *  2. Group items by sellerId (live catalog lookup — never trust cached sellerId)
 *  3. Validate per-seller delivery quotes
 *  4. Execute atomic transaction:
 *     a. PlaceOrderUseCase × N sellers
 *     b. Create Order_MasterOrder linking all seller orders
 *  5. Mark all per-seller quotes as CONSUMED
 *  6. Emit master_order.created analytics event
 *  7. Return { masterOrderId, sellerOrders[] }
 *
 * The PlaceOrderUseCase signature is NEVER changed. All multi-seller orchestration
 * lives here, above the existing single-seller order logic.
 */

import { makeMasterOrderId } from '@shared/ids/id';
import { QuoteValidationService } from '../../infrastructure/services/quote-validation.service';

export interface SellerQuoteMap {
  [sellerId: string]: { quoteId: string };
}

export interface MultiSellerCheckoutRequest {
  sessionId: string;
  buyerId: string;
  paymentMethod: string;
  deliveryAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  sellerQuotes: SellerQuoteMap;
}

export interface SellerOrderResult {
  sellerId: string;
  orderId: string;
  trackingNumber?: string;
  verificationDeadlineAt?: string;
}

export interface MultiSellerCheckoutResult {
  success: true;
  masterOrderId: string;
  sellerOrders: SellerOrderResult[];
  totalAmount: number;
}

export interface MultiSellerCheckoutError {
  success: false;
  error: {
    code: string;
    message: string;
    sellerId?: string;
    details?: any;
  };
}

export class MultiSellerCheckoutUseCase {
  constructor(
    private readonly quoteValidationService: QuoteValidationService,
    private readonly eventBus?: { publish(type: string, data: any): Promise<void> },
  ) {}

  async execute(
    request: MultiSellerCheckoutRequest,
  ): Promise<MultiSellerCheckoutResult | MultiSellerCheckoutError> {
    const prisma = (globalThis as any).prisma;
    const placeOrderUseCase = (globalThis as any).__placeOrderUseCase;

    if (!prisma || !placeOrderUseCase) {
      return {
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Order service not available' },
      };
    }

    // ── Step 1: Load session ────────────────────────────────────────────────
    const session = await prisma.checkout_CheckoutSession?.findUnique?.({
      where: { id: request.sessionId },
    });

    if (!session) {
      return {
        success: false,
        error: { code: 'CHECKOUT_SESSION_NOT_FOUND', message: 'Session not found' },
      };
    }

    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      return {
        success: false,
        error: { code: 'CHECKOUT_SESSION_EXPIRED', message: 'Checkout session has expired' },
      };
    }

    const items: any[] = session.metadata?.items || session.items || [];
    if (!items || items.length === 0) {
      return {
        success: false,
        error: { code: 'CHECKOUT_SESSION_EMPTY', message: 'Session has no items' },
      };
    }

    // ── Step 2: Group items by sellerId via catalog lookup ──────────────────
    const sellerGroupMap = new Map<string, any[]>();
    for (const item of items) {
      const product = await prisma.product?.findUnique?.({
        where: { id: item.productId },
        select: { sellerId: true },
      });
      const sellerId = product?.sellerId;
      if (!sellerId) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_SELLER_NOT_FOUND',
            message: `Cannot determine seller for product ${item.productId}`,
          },
        };
      }
      if (!sellerGroupMap.has(sellerId)) sellerGroupMap.set(sellerId, []);
      sellerGroupMap.get(sellerId)!.push(item);
    }

    // ── Step 3: Validate all per-seller quotes ──────────────────────────────
    const sellerQuotes = request.sellerQuotes || {};
    const validatedQuotes: Record<string, { quoteId: string; deliveryFee: number; pricingVersion: number }> = {};
    for (const [sellerId] of sellerGroupMap) {
      if (!sellerQuotes[sellerId]?.quoteId) {
        return {
          success: false,
          error: { code: 'MISSING_DELIVERY_QUOTE', message: `No delivery quote for seller ${sellerId}`, sellerId },
        };
      }
      const validationResult = await this.quoteValidationService.validate(sellerQuotes[sellerId].quoteId);
      if (!validationResult.valid) {
        return {
          success: false,
          error: {
            code: validationResult.rejectionReason ?? 'QUOTE_INVALID',
            message: `Delivery quote invalid for seller ${sellerId}: ${validationResult.rejectionReason}`,
            sellerId,
          },
        };
      }
      // Capture server-authoritative fees for the Phase 3 §3.4 price lock.
      validatedQuotes[sellerId] = {
        quoteId: sellerQuotes[sellerId].quoteId,
        deliveryFee: Number(validationResult.deliveryFee ?? 0),
        pricingVersion: Number(validationResult.pricingVersion ?? 0),
      };
    }

    // ── Step 4: Atomic transaction ──────────────────────────────────────────
    let masterOrderId: string;
    const sellerOrderResults: SellerOrderResult[] = [];
    let totalAmount = 0;

    try {
      await prisma.$transaction(async (tx: any) => {
        // Place one order per seller
        const sellerOrderIds: string[] = [];

        for (const [sellerId, sellerItems] of sellerGroupMap) {
          const placeResult = await placeOrderUseCase.execute({
            buyerId: request.buyerId,
            sellerId,
            items: sellerItems.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity ?? 1,
              price: item.priceAtTime ?? item.price ?? 0,
              weight: item.weight ?? 0.5,
            })),
            paymentMethod: request.paymentMethod,
            deliveryAddress: request.deliveryAddress,
            orderSource: 'DIRECT',
            quoteId: sellerQuotes[sellerId]?.quoteId,
          });

          sellerOrderIds.push(placeResult.orderId);
          sellerOrderResults.push({
            sellerId,
            orderId: placeResult.orderId,
            trackingNumber: placeResult.trackingNumber,
            verificationDeadlineAt: placeResult.verificationDeadlineAt,
          });

          // Sum order total for master
          const orderRecord = await tx.order_Order?.findUnique?.({
            where: { id: placeResult.orderId },
            select: { totalAmount: true },
          });
          totalAmount += Number(orderRecord?.totalAmount ?? 0);
        }

        // Create master order
        masterOrderId = makeMasterOrderId();
        await tx.order_MasterOrder?.create?.({
          data: {
            id: masterOrderId,
            buyerId: request.buyerId,
            totalAmount,
            currency: 'TZS',
            paymentMethod: request.paymentMethod,
            sellerOrders: {
              create: sellerOrderIds.map(sellerOrderId => ({ sellerOrderId })),
            },
          },
        });
      });
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'CHECKOUT_TRANSACTION_FAILED',
          message: err?.message ?? 'Atomic checkout transaction failed',
          details: err,
        },
      };
    }

    // ── Step 5: Mark quotes consumed ────────────────────────────────────────
    for (const [sellerId] of sellerGroupMap) {
      await this.quoteValidationService.markConsumed(sellerQuotes[sellerId].quoteId).catch(() => {
        // non-fatal — quote TTL will eventually expire
      });
    }

    // ── Step 5.5: Create shipments (Phase 2 §2.1) ───────────────────────────
    // One Logistics_Shipment per seller group, owned by logistics-service
    // (registered as __createOrderShipments by the logistics module).
    // Non-fatal: shipment reconciliation can happen later if this fails.
    try {
      const createOrderShipments = (globalThis as any).__createOrderShipments;
      if (createOrderShipments) {
        const addr: any = request.deliveryAddress || {};
        const addressParts = [addr.street, addr.ward, addr.district, addr.city, addr.region, addr.country]
          .filter(Boolean).join(', ');
        const sellers = [];
        for (const [sellerId, sellerItems] of sellerGroupMap) {
          const sellerOrder = sellerOrderResults.find(r => r.sellerId === sellerId);
          let pickupLat: number | undefined;
          let pickupLng: number | undefined;
          let pickupAddress = addressParts || 'Dar es Salaam, Tanzania';
          try {
            const sellerLocation = await prisma.catalog_SellerLocation?.findFirst?.({
              where: { sellerId, isActive: true, status: 'ACTIVE' },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            });
            if (sellerLocation) {
              pickupLat = Number(sellerLocation.latitude);
              pickupLng = Number(sellerLocation.longitude);
              pickupAddress = [sellerLocation.street, sellerLocation.ward, sellerLocation.district, sellerLocation.region, sellerLocation.country]
                .filter(Boolean).join(', ');
            }
          } catch { /* non-fatal — buyer coords fallback */ }
          sellers.push({
            sellerId,
            sellerOrderId: sellerOrder?.orderId ?? '',
            pickupLat: pickupLat ?? addr.latitude ?? -6.7924,
            pickupLng: pickupLng ?? addr.longitude ?? 39.2083,
            pickupAddress,
            packageWeightKg: sellerItems.reduce(
              (sum: number, item: any) => sum + (item.weight ?? 0.5) * (item.quantity ?? 1), 0),
          });
        }
        await createOrderShipments({
          masterOrderId: masterOrderId!,
          buyer: {
            lat: Number(addr.latitude) || undefined,
            lng: Number(addr.longitude) || undefined,
            address: addressParts || 'Dar es Salaam, Tanzania',
          },
          sellers,
        });
      }
    } catch (shipErr: any) {
      console.error('[MultiSellerCheckoutUseCase] Shipment creation failed (non-fatal):', shipErr?.message);
    }

    // ── Step 5.6: Lock the buyer price per seller quote (Phase 3 §3.4) ──────
    // FulfillmentCommitment — the locked price is absolute regardless of any
    // post-confirmation optimization. Non-fatal: the quote itself remains
    // the source of truth for settlement.
    try {
      const lockPrice = (globalThis as any).__lockFulfillmentPrice;
      if (lockPrice) {
        for (const [sellerId, vq] of Object.entries(validatedQuotes)) {
          if (!vq.quoteId || vq.deliveryFee <= 0) continue;
          await lockPrice({
            checkoutSessionId: request.sessionId ?? masterOrderId!,
            quoteId: vq.quoteId,
            buyerPriceTzs: vq.deliveryFee,
            pricingVersion: vq.pricingVersion,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          }).catch((lockErr: any) => {
            console.error(`[MultiSellerCheckoutUseCase] Price lock failed for quote ${vq.quoteId}:`, lockErr?.message);
          });
        }
      }
    } catch (lockErr: any) {
      console.error('[MultiSellerCheckoutUseCase] Price locking failed (non-fatal):', lockErr?.message);
    }

    // ── Step 6: Emit analytics event ────────────────────────────────────────
    if (this.eventBus) {
      this.eventBus.publish('master_order.created', {
        masterOrderId: masterOrderId!,
        buyerId: request.buyerId,
        sellerCount: sellerGroupMap.size,
        totalAmount,
        currency: 'TZS',
        paymentMethod: request.paymentMethod,
        createdAt: new Date().toISOString(),
      }).catch(() => {/* non-fatal */});
    }

    return {
      success: true,
      masterOrderId: masterOrderId!,
      sellerOrders: sellerOrderResults,
      totalAmount,
    };
  }
}
