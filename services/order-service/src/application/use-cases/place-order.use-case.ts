import { Order } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';
import { IdGeneratorService } from '../../infrastructure/services/id-generator.service';
import { OrderFulfillmentSaga } from '../sagas/order-fulfillment.saga';
import { CODEligibilityEngine } from '../../domain/engines/cod-eligibility.engine';
import { CODCommitmentService } from '../../domain/services/cod-commitment.service';
import { assertMinimumBasketValue } from '@shared/business/minimum-basket-value';
import { verificationConfig } from '../../config/verification.config';
import { PrismaVerificationAuditLogRepository } from '../../infrastructure/database/prisma-verification-audit-log.repository';
import { CatalogProductRepository } from '../../infrastructure/repositories/catalog-product.repository';
import type { VerificationAuditLogEntry } from '../../domain/entities/verification-audit-log.entity';
import { makeId } from '@shared/ids/id';
import { normalizeEnablerCode, toShortEnablerCode } from '@shared/ids/public-codes';
// Static import of the shared eventBus ensures the same singleton instance is used
// across all modules. The previous dynamic import created a race condition where
// different modules might resolve to different module instances under tsx/esm.
import { eventBus as sharedEventBus } from '@shared-events/eventBus';

/**
 * Generates a cryptographically random 6-digit delivery confirmation code.
 * This code is shown to the buyer and must be provided to the courier at delivery.
 */
function generateDeliveryCode(): string {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export interface PlaceOrderRequest {
  buyerId: string;
  sellerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number | { amount: number; currency: string };
    weight: number;
  }>;
  currency?: string;
  paymentMethod: 'COD' | 'WALLET' | 'CARD' | 'MOBILE_PAYMENT' | 'SELLER_VERIFICATION' | 'DIRECT_PAYMENT' | string;
  orderSource?: 'CART' | 'DIRECT';
  orderCompletionMethod?: 'WALLET' | 'DIRECT_PAYMENT' | 'SELLER_VERIFICATION' | 'COD' | 'MOBILE_MONEY';
  chatConversationId?: string;
  /**
   * @deprecated — ignored under the seller verification workflow.
   * All payment is now deferred to BuyerConfirmCheckoutUseCase.
   */
  deferPayment?: boolean;
  deliveryFee?: number;
  logisticsEstimate?: number;
  commitmentPaymentMethod?: 'WALLET' | 'MOBILE_PAYMENT' | 'CARD';
  deliveryAddress: {
    street: string;
    /** Tanzania precision: ward > district > region (preferred over city) */
    ward?: string;
    district?: string;
    region?: string;
    /** Legacy / international */
    city?: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  /** The seller location chosen as fulfillment pickup point */
  fulfillmentLocationId?: string;
  /** Referral identity; permission is resolved from current seller scope at order placement. */
  enablerId?: string;
  enablerCode?: string;
  /** Candidate product lines from the server-created checkout session. */
  enablerProductIds?: string[];
}

export interface OrderEnablerAuthorizationLookup {
  findByCode(code: string, shortCode?: string): Promise<{ id: string; userId: string; status: string } | null>;
  getAuthorizedProductIds(enablerId: string, productIds: string[]): Promise<string[]>;
  getAuthorizedProductTerms?(enablerId: string, productIds: string[]): Promise<Array<{
    productId: string; authorizationId: string; earningRuleType: string; earningRuleValue: number;
  }>>;
}

export interface PlaceOrderResponse {
  orderId: string;
  status: string;
  deliveryCode: string;
  chatConversationId?: string;
  /** UTC ISO-8601 deadline by which the seller must confirm stock. */
  verificationDeadlineAt: string;
  /** Buyer next-action hint. */
  nextAction: 'AWAIT_VERIFICATION';
  /** Always 0 — payment deferred to buyer/confirm-checkout. */
  commitmentFee: number;
  commitmentPaymentMethod?: undefined;
  cashOnDeliveryAmount: number;
}

/**
 * Narrow ports for collaborators that were previously constructed inside the
 * method bodies. Declared structurally so the use case depends on the one method
 * it calls from each, not on a whole infrastructure class.
 *
 * Both were constructed inline, which is why the PlaceOrderUseCase suite could
 * never run: the real repositories were built mid-execution, reached for the
 * database, and failed ("Database not initialized. Call initialize() first."),
 * so every test threw before reaching its first assertion. Seven tests were
 * failing not because the use case was wrong but because it could not be
 * exercised. Injecting the collaborators is what makes the suite meaningful.
 */
export interface SupplierLocationRef {
    city: string;
    region: string | null;
    country: string | null;
}

export interface ProductCatalogLookup {
    findNonCodProductIds(productIds: string[]): Promise<string[]>;
    findSupplierLocations(productIds: string[]): Promise<Map<string, SupplierLocationRef>>;
}

export interface VerificationAuditSink {
    append(entry: VerificationAuditLogEntry, tx?: unknown): Promise<void>;
}

export class PlaceOrderUseCase {
  // paymentGatewayAdapter kept for BuyerConfirmCheckoutUseCase to use later
  private readonly paymentGatewayAdapter?: {
    processPayment(req: {
      orderId: string; amount: number; currency: string;
      buyerId: string; buyerEmail: string; buyerPhone: string; description: string;
    }): Promise<{ success: boolean; paymentUrl?: string; transactionId?: string; error?: string; status: string }>;
  };

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly sagaOrchestrator: OrderFulfillmentSaga,
    private readonly codEligibilityEngine: CODEligibilityEngine,
    private readonly codCommitmentService: CODCommitmentService,
    private readonly walletClient?: { debitWallet(userId: string, amount: number, currency: string, description: string): Promise<string> },
    paymentGatewayAdapter?: {
      processPayment(req: {
        orderId: string; amount: number; currency: string;
        buyerId: string; buyerEmail: string; buyerPhone: string; description: string;
      }): Promise<{ success: boolean; paymentUrl?: string; transactionId?: string; error?: string; status: string }>;
    },
    // Defaults preserve the existing construction sites; tests inject stubs.
    private readonly catalogLookup: ProductCatalogLookup = new CatalogProductRepository(),
    private readonly verificationAudit: VerificationAuditSink = new PrismaVerificationAuditLogRepository(),
    private readonly enablerAuthorizationLookup?: OrderEnablerAuthorizationLookup,
  ) {
    this.paymentGatewayAdapter = paymentGatewayAdapter;
  }

  /**
   * Creates the logistics shipment for a newly placed order.
   *
   * Delegates to the logistics module's globally registered
   * `__createOrderShipments` — the same entry point the checkout flow uses — so
   * both order entry points produce the same logistics state. Pickup coordinates
   * resolve from the seller's active primary location, then the product's
   * supplier location, then the Dar es Salaam city-centre fallback used
   * throughout logistics.
   */
  private async createShipmentForOrder(request: PlaceOrderRequest, order: Order): Promise<void> {
    const createOrderShipments = (globalThis as any).__createOrderShipments;
    if (typeof createOrderShipments !== 'function') {
      // Logistics module not mounted (e.g. order-service standalone). Not an
      // error: tracking simply has nothing to show for this order.
      //
      // Still logged (BLG-022): the monolith shares one globalThis, so this
      // branch should never fire in the composed app. If it does, the order is
      // accepted with no shipment and no trace, which is exactly the invisible
      // failure that let a missing-delivery blind spot read as coverage.
      console.warn(
        `[PlaceOrderUseCase] Shipment creation skipped: __createOrderShipments is not a function (order ${order.id})`
      );
      return;
    }

    const g = globalThis as unknown as { prisma?: any };
    const sellerId = request.sellerId;

    let pickupLat: number | undefined;
    let pickupLng: number | undefined;
    let pickupAddress: string | undefined;

    try {
      const loc = await g.prisma?.catalog_SellerLocation?.findFirst?.({
        where: { sellerId, isActive: true, status: 'ACTIVE' },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
      if (loc) {
        pickupLat = Number(loc.latitude);
        pickupLng = Number(loc.longitude);
        pickupAddress = [loc.address ?? loc.street, loc.city, loc.region, loc.country]
          .filter(Boolean)
          .join(', ');
      }
    } catch {
      // Fall through to the product supplier location.
    }

    if (pickupAddress === undefined) {
      const supplierLocations = await this.catalogLookup.findSupplierLocations(
        request.items.map((item) => item.productId)
      );
      const first = supplierLocations.values().next().value;
      if (first) pickupAddress = [first.city, first.region, first.country].filter(Boolean).join(', ');
    }

    const address: any = request.deliveryAddress ?? {};
    const destinationAddress =
      [address.street, address.ward, address.district, address.city, address.region, address.country]
        .filter(Boolean)
        .join(', ') || 'Dar es Salaam, Tanzania';

    const totalWeight = order.items.reduce(
      (sum, item) => sum + (Number((item as any).weight) || 0),
      0
    );

    await createOrderShipments({
      // `shipment.orderId` is taken from `sellerOrderId` (falling back to
      // `masterOrderId`) — the ORDER NUMBER, which is what tracking resolves on.
      masterOrderId: order.id,
      buyer: {
        lat: Number(address.latitude) || undefined,
        lng: Number(address.longitude) || undefined,
        address: destinationAddress,
      },
      sellers: [
        {
          sellerId,
          sellerOrderId: order.id,
          pickupLat: pickupLat ?? (Number(address.latitude) || -6.7924),
          pickupLng: pickupLng ?? (Number(address.longitude) || 39.2083),
          pickupAddress: pickupAddress || 'Dar es Salaam, Tanzania',
          packageWeightKg: totalWeight,
        },
      ],
    });
  }

  async execute(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    console.log(`[PlaceOrderUseCase] execute called, paymentMethod: ${request.paymentMethod}`);

    const orderId = IdGeneratorService.generateOrderId();
    const currency = request.currency || 'TZS';
    let attributedEnabler: { id: string; code: string } | undefined;
    let attributedProductIds: string[] = [];
    let attributionAuthorizationId: string | undefined;
    let attributionBaseAmount = 0;
    let attributionRate = 0;
    let attributionAmount = 0;
    let attributionRuleType = 'PERCENTAGE_OF_ITEM_SUBTOTAL';
    if (request.enablerCode) {
      const normalizedCode = normalizeEnablerCode(request.enablerCode);
      if (!normalizedCode) throw new Error('Invalid enabler code');
      if (!this.enablerAuthorizationLookup) throw new Error('Enabler authorization service is unavailable');
      const enabler = await this.enablerAuthorizationLookup.findByCode(
        normalizedCode,
        toShortEnablerCode(normalizedCode) || undefined,
      );
      if (!enabler || (request.enablerId && request.enablerId !== enabler.id)) throw new Error('Enabler code not found');
      if (!['ACTIVE', 'APPROVED'].includes(String(enabler.status).toUpperCase())) throw new Error('Enabler is not active');
      if (enabler.userId === request.buyerId) throw new Error('Enabler cannot be the buyer');
      const orderProductIds = [...new Set(request.items.map((item) => item.productId))];
      const terms = this.enablerAuthorizationLookup.getAuthorizedProductTerms
        ? await this.enablerAuthorizationLookup.getAuthorizedProductTerms(enabler.id, orderProductIds)
        : [];
      const authorizedProductIds = terms.length
        ? terms.map((term) => term.productId)
        : await this.enablerAuthorizationLookup.getAuthorizedProductIds(enabler.id, orderProductIds);
      const candidates = new Set(request.enablerProductIds ?? []);
      attributedProductIds = authorizedProductIds.filter((productId) => candidates.has(productId));
      if (attributedProductIds.length) {
        attributedEnabler = { id: enabler.id, code: normalizedCode };
        const approvedTerms = terms.filter((term) => candidates.has(term.productId));
        const rules = new Set(approvedTerms.map((term) => `${term.earningRuleType}:${Number(term.earningRuleValue)}`));
        if (approvedTerms.length && rules.size !== 1) throw new Error('Seller promotion terms are inconsistent within this order');
        attributionAuthorizationId = approvedTerms[0]?.authorizationId;
        attributionRate = Number(approvedTerms[0]?.earningRuleValue ?? 0);
        attributionRuleType = approvedTerms[0]?.earningRuleType ?? attributionRuleType;
        const approvedProductIds = new Set(approvedTerms.map((term) => term.productId));
        const eligibleLines = request.items.filter((item) => approvedProductIds.has(item.productId));
        attributionBaseAmount = eligibleLines.reduce((sum, item) => {
          const price = typeof item.price === 'number' ? item.price : item.price.amount;
          return sum + Number(price) * item.quantity;
        }, 0);
        if (attributionRuleType === 'PERCENTAGE_OF_ITEM_SUBTOTAL') {
          attributionAmount = Math.round(attributionBaseAmount * attributionRate) / 100;
        } else if (attributionRuleType === 'FIXED_PER_ORDER') {
          attributionAmount = Math.round(attributionRate * 100) / 100;
        } else if (attributionRuleType === 'FIXED_PER_ITEM') {
          attributionAmount = Math.round(eligibleLines.reduce((sum, item) => sum + attributionRate * item.quantity, 0) * 100) / 100;
        } else {
          throw new Error('Unsupported seller promotion earning rule');
        }
      }
    } else if (request.enablerId || request.enablerProductIds?.length) {
      throw new Error('Enabler code is required for attribution');
    }
    const wholeSellerOrderAttributed = Boolean(
      attributedEnabler && request.items.length > 0
      && request.items.every((item) => attributedProductIds.includes(item.productId))
    );
    const totalAmount = request.items.reduce((sum, item) => {
      const price = typeof item.price === 'number' ? item.price : item.price.amount;
      return sum + (price * item.quantity);
    }, 0);

    assertMinimumBasketValue(totalAmount);

    // ── Layer-3 defense: a COD order must only contain products that accept COD ──
    // The frontend already splits items by payOnDelivery, but the API must not trust
    // client input for a risk-bearing payment method. Missing catalog records are
    // treated as non-COD (fail closed).
    if (request.paymentMethod === 'COD') {
      const nonCodProductIds = await this.catalogLookup.findNonCodProductIds(
        request.items.map((item) => item.productId)
      );
      if (nonCodProductIds.length > 0) {
        throw new Error('COD ineligible: one or more items do not accept Cash on Delivery');
      }

      // ── Layer-2 defense: buyer and seller COD eligibility ────────────────────
      // `POST /orders/cod/validate` is an advisory endpoint a client can simply
      // not call, so it cannot be the enforcement point. Before this check the
      // engine was injected into this use case but never invoked, which meant a
      // NEW_BUYER could bypass the COD exposure limit and geographic/other
      // restrictions by posting straight to /orders. Fail closed.
      const [buyerEligibility, sellerEligibility] = await Promise.all([
        this.codEligibilityEngine.checkBuyerEligibility(request.buyerId),
        this.codEligibilityEngine.checkSellerEligibility(request.sellerId),
      ]);

      if (!buyerEligibility.eligible) {
        throw new Error(
          `COD Ineligible (buyer): ${buyerEligibility.reason ?? 'buyer is not eligible for Cash on Delivery'}`
        );
      }
      if (!sellerEligibility.eligible) {
        throw new Error(
          `COD Ineligible (seller): ${sellerEligibility.reason ?? 'seller is not eligible for Cash on Delivery'}`
        );
      }
    }

    // ── Seller Stock Verification Workflow ────────────────────────────────────
    // All orders enter PENDING_SELLER_VERIFICATION first. No payment processing
    // occurs here. Payment is deferred to BuyerConfirmCheckoutUseCase which runs
    // after the seller confirms stock availability within the verification window.

    const timeoutMinutes = verificationConfig.timeoutMinutes;
    const now = new Date();
    const verificationDeadlineAt = new Date(now.getTime() + timeoutMinutes * 60_000);

    const deliveryCode = generateDeliveryCode();
    const orderData = {
      id: orderId,
      buyerId: request.buyerId,
      sellerId: request.sellerId,
      paymentMethod: request.paymentMethod,
      currency,
      totalAmount,
      deliveryAddress: request.deliveryAddress,
      codCommitmentFee: undefined,
      codCommitmentPaid: false,
      codCommitmentHoldId: undefined,
      deliveryCode,
      verificationDeadlineAt,
      verificationTimeoutMinutes: timeoutMinutes,
      orderSource: request.orderSource || 'CART',
      orderCompletionMethod: request.orderCompletionMethod,
      chatConversationId: request.chatConversationId,
      fulfillmentLocationId: request.fulfillmentLocationId,
      // Legacy order-level commission fields are set only if the seller order
      // contains no product lines outside the enabler's approved scope.
      enablerId: wholeSellerOrderAttributed ? attributedEnabler?.id : undefined,
      enablerCode: wholeSellerOrderAttributed ? attributedEnabler?.code : undefined,
      enablerAttributionEnablerId: attributedEnabler?.id,
      enablerAttributionCode: attributedEnabler?.code,
      enablerAttributionProductIds: attributedProductIds,
      enablerAttributionAuthorizationId: attributionAuthorizationId,
      enablerAttributionBaseAmount: attributionBaseAmount,
      enablerAttributionRate: attributionRate,
      enablerAttributionAmount: attributionAmount,
      enablerAttributionRuleType: attributionRuleType,
      // Delivery economics. These are accepted by the placement API and consumed
      // by BuyerConfirmCheckoutUseCase to size the COD commitment hold, but they
      // were never carried onto the order, so the hold was always 0 and COD
      // orders were confirmed with nothing secured.
      deliveryFee: request.deliveryFee,
      logisticsEstimate: request.logisticsEstimate,
      totalWeight: request.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0),
      items: request.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: {
          amount: typeof item.price === 'number' ? item.price : item.price.amount,
          currency,
        },
        weight: item.weight,
      })),
      status: OrderStatus.PENDING_SELLER_VERIFICATION,
    };

    const order = new Order(orderData);

    // ── Layer-2 defense: order-level COD limits ────────────────────────────────
    // Exposure cap, COD service area and high-risk SKU rules. This runs BEFORE
    // the order is persisted, so a rejected COD order leaves no partial record.
    if (request.paymentMethod === 'COD') {
      // The seller side of the geographic rule is resolved from the catalog's
      // own supplier location. It must never come from the request: a client that
      // could name its own "seller city" would defeat the same-city restriction
      // for NEW_BUYERs. When no supplier location is on record the address is
      // `null`, and the engine then skips only the cross-city comparison — the
      // value, area, high-risk and concurrency rules all still apply.
      const supplierLocations = await this.catalogLookup.findSupplierLocations(
        request.items.map((item) => item.productId)
      );
      const firstLocation = supplierLocations.values().next().value;

      const orderEligibility = await this.codEligibilityEngine.checkOrderEligibility(
        order,
        firstLocation ?? null
      );
      if (!orderEligibility.eligible) {
        throw new Error(
          `COD Ineligible (order): ${orderEligibility.reason ?? 'order is not eligible for Cash on Delivery'}`
        );
      }
    }

    await this.orderRepository.save(order);

    // ── Logistics: create the shipment for this order ────────────────────────
    // The checkout flow creates shipments (via the logistics module's globally
    // registered `__createOrderShipments`), but `POST /api/order/orders` did
    // not — so an order placed directly had no shipment and could not be tracked
    // at all: `GET /tracking/:orderNumber` returned an empty `shipments` array.
    // Two entry points into fulfilment behaving differently is the real defect.
    //
    // Deliberately non-fatal: an order that has been accepted must not fail
    // because logistics is unavailable, and a missing shipment is recoverable
    // where a lost order is not.
    await this.createShipmentForOrder(request, order).catch((error: any) => {
      console.warn(
        `[PlaceOrderUseCase] Shipment creation failed for order ${order.id}: ${error?.message ?? error}`
      );
    });


    // Append initial audit log entry — non-fatal if table not yet migrated
    try {
      const auditRepo = this.verificationAudit;
      await auditRepo.append({
        id: makeId('vau'),
        orderId: order.id,
        entryType: 'STATUS_TRANSITION',
        actorType: 'system',
        previousStatus: 'NEW',
        newStatus: OrderStatus.PENDING_SELLER_VERIFICATION,
        reason: 'Order created — awaiting seller stock confirmation',
        timestamp: now,
      });
    } catch (auditErr: any) {
      console.warn('[PlaceOrderUseCase] Audit log write failed (non-fatal):', auditErr.message);
    }

    // Notify seller (non-fatal)
    try {
      await this.eventPublisher.publish({
        type: 'order.pending_seller_verification',
        orderId: order.id,
        sellerId: order.sellerId,
        buyerId: order.buyerId,
        items: order.items,
        verificationDeadlineAt: verificationDeadlineAt.toISOString(),
      });
    } catch (eventErr: any) {
      console.warn('[PlaceOrderUseCase] Seller notification event failed (non-fatal):', eventErr.message);
    }
    try {
      await this.eventPublisher.publish(new OrderCreatedEvent(order));
    } catch (legacyErr: any) {
      console.warn('[PlaceOrderUseCase] Legacy OrderCreatedEvent failed (non-fatal):', legacyErr.message);
    }

    // Publish OrderCreated synchronously via the in-memory event bus so the
    // payment saga can create a payment record immediately (not waiting for
    // the outbox processor's 5-second polling delay). Uses static import to
    // guarantee the same singleton instance across all modules.
    try {
      const subscribersBefore = sharedEventBus.getSubscriberCount('OrderCreated');
      console.log(`[PlaceOrderUseCase] OrderCreated subscribers before publish: ${subscribersBefore}`);
      await sharedEventBus.publish('OrderCreated', {
        orderId: order.id,
        userId: order.buyerId,
        totalAmount: Number(order.totalAmount ?? 0),
        currency: request.currency || 'TZS',
        paymentMethod: String(request.paymentMethod || request.orderCompletionMethod || 'WALLET').toUpperCase(),
      });
      console.log(`[PlaceOrderUseCase] OrderCreated published to ${subscribersBefore} subscribers`);
    } catch (syncErr: any) {
      console.warn('[PlaceOrderUseCase] Synchronous OrderCreated event publish failed (non-fatal):', syncErr.message);
    }

    return {
      orderId: order.id,
      status: OrderStatus.PENDING_SELLER_VERIFICATION,
      deliveryCode,
      verificationDeadlineAt: verificationDeadlineAt.toISOString(),
      nextAction: 'AWAIT_VERIFICATION',
      commitmentFee: 0,
      commitmentPaymentMethod: undefined,
      cashOnDeliveryAmount: 0,
    };
  }

}

// Simple event publisher interface (would be implemented in infrastructure)
export interface EventPublisher {
  publish(event: any): Promise<void>;
}
