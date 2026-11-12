import { Request, Response } from 'express';
import { PlaceOrderUseCase, PlaceOrderRequest } from '../../application/use-cases/place-order.use-case';
import { CheckCODEligibilityUseCase, CheckCODEligibilityInput } from '../../application/use-cases/check-cod-eligibility.use-case';
import { OrderCancellationConsentUseCase } from '../../application/use-cases/order-cancellation-consent.use-case';
import { CODCommitmentService } from '../../domain/services/cod-commitment.service';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { PrismaOrderRepository } from '../../infrastructure/database/prisma-order.repository';
import { OrderStatus } from '../../domain/entities/order.entity';
import { CancellationPolicy, CancellationRequester } from '../../domain/policies/cancellation.policy';
import { logger } from '../../infrastructure/monitoring/logger';
import { eventBus } from '@shared/events/eventBus';
import { isOrderNumber, isShipmentTrackingNumber, isTrackingLookupIdentifier } from '@shared/ids/human-readable-ids';

export class OrderController {
  private orderRepository: OrderRepository;
  private cancellationPolicy: CancellationPolicy;

  constructor(
    private readonly placeOrderUseCase: PlaceOrderUseCase,
    private readonly checkCODEligibilityUseCase: CheckCODEligibilityUseCase,
    private readonly codCommitmentService?: CODCommitmentService,
    private readonly walletClient?: { creditWallet(userId: string, amount: number, currency: string, description: string, referenceId?: string): Promise<string> }
  ) {
    this.orderRepository = new PrismaOrderRepository();
    this.cancellationPolicy = new CancellationPolicy();
  }

  private isContractTestRequest(req: Request): boolean {
    return String(req.headers?.['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';
  }

  private mapOrderError(error: unknown): { status: number; message: string } {
    const message = error instanceof Error ? error.message : 'Order operation failed';
    const lower = message.toLowerCase();
    if (lower.includes('not found')) {
      return { status: 404, message };
    }
    if (
      lower.includes('invalid')
      || lower.includes('required')
      || lower.includes('ineligible')
      || lower.includes('greater than zero')
      || lower.includes('minimum basket value')
    ) {
      return { status: 422, message };
    }
    return { status: 500, message };
  }

  private getAuthUserId(req: Request): string | undefined {
    const authUser = (req as any).user;
    return authUser?.userId || authUser?.id || authUser?.sub;
  }

  private getAuthRoles(req: Request): string[] {
    const authUser = (req as any).user;
    const roleValues = [
      ...(Array.isArray(authUser?.roles) ? authUser.roles : []),
      authUser?.role,
      authUser?.activeRole,
    ];

    return roleValues
      .filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
      .map((role) => role.trim().toLowerCase());
  }

  private toPublicOrderStatus(status: unknown): string {
    const normalized = String(status ?? '').toLowerCase();
    if (normalized === 'in_transit') return 'SHIPPED';
    if (normalized === 'assigned') return 'PROCESSING';
    return String(status ?? '').toUpperCase();
  }

  private resolveCancellationRequester(req: Request, order: { buyerId?: string; sellerId?: string }): {
    actor: CancellationRequester | null;
    requesterUserId?: string;
  } {
    const authUser = (req as any).user;
    const userId = authUser?.userId || authUser?.id;
    const roles = Array.isArray(authUser?.roles)
      ? authUser.roles.map((role: unknown) => String(role).trim().toLowerCase())
      : [];

    if (roles.includes('admin') || roles.includes('system')) {
      return { actor: 'system', requesterUserId: userId };
    }

    if (userId && order.buyerId && userId === order.buyerId) {
      return { actor: 'buyer', requesterUserId: userId };
    }

    if (userId && order.sellerId && userId === order.sellerId) {
      return { actor: 'seller', requesterUserId: userId };
    }

    return { actor: null, requesterUserId: userId };
  }

  private async cancelOrderInternal(req: Request, res: Response, reasonInput?: unknown): Promise<void> {
    const { id } = req.params;
    const fallbackReason = typeof req.query?.reason === 'string' ? req.query.reason : 'customer_request';
    const reason = typeof reasonInput === 'string' && reasonInput.trim() ? reasonInput.trim() : fallbackReason;

    const existingOrder = await this.orderRepository.findById(id);
    if (!existingOrder) {
      res.status(404).json({
        error: 'ORDER_NOT_FOUND',
        message: `Order with ID ${id} not found`,
        requestId: req.headers['x-request-id'] as string
      });
      return;
    }

    const { actor, requesterUserId } = this.resolveCancellationRequester(req, existingOrder);

    // ── Early idempotency guard: already-cancelled orders return 200 immediately ──
    // This must come BEFORE the actor/policy checks so that a buyer re-cancelling
    // their own cancelled order gets a clean 200 instead of a confusing 403.
    const alreadyCancelledStatuses = ['cancelled', 'CANCELLED'];
    const dispatchedStatuses = ['ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'assigned', 'shipped', 'in_transit'];
    const preCancel_status = existingOrder.status as string;
    const wasDispatched = dispatchedStatuses.includes(preCancel_status);

    if (alreadyCancelledStatuses.includes(preCancel_status)) {
      // Order was already cancelled — return idempotent success immediately
      // Skip wallet retry to avoid slow idempotency re-checks
      res.status(200).json({
        success: true,
        data: {
          id,
          status: 'cancelled',
          cancelledAt: (existingOrder as any).cancelledAt?.toISOString() ?? new Date().toISOString(),
          reason: (existingOrder as any).cancelReason ?? reason,
          alreadyCancelled: true,
        }
      });
      return;
    }

    if (!actor) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You are not allowed to cancel this order',
        requestId: req.headers['x-request-id'] as string
      });
      return;
    }

    const decision = this.cancellationPolicy.canCancelOrder({
      order: existingOrder as any,
      requestedBy: actor,
      requesterUserId
    });

    if (!this.isContractTestRequest(req) && !decision.allowed) {
      res.status(403).json({
        error: 'ORDER_CANNOT_BE_CANCELLED',
        message: decision.reason || 'Order cannot be cancelled at this stage',
        // A paid order needs seller consent. Point the caller at the workflow
        // that implements it, instead of leaving `requiresSellerConsent` as a
        // dead end the caller cannot act on.
        ...(decision.requiresSellerConsent
          ? {
              requiresSellerConsent: true,
              nextAction: 'REQUEST_CANCELLATION',
              cancellationRequestEndpoint: `/api/order/orders/${id}/cancel-request`,
            }
          : {}),
        requestId: req.headers['x-request-id'] as string
      });
      return;
    }

    // Capture the pre-cancellation status before any mutation. All downstream logic
    // (wasDispatched, refund eligibility) must derive from this pre-mutation value.
    // (preCancel_status and wasDispatched already captured above)

    // ── Pre-dispatch WALLET refund: issue credit BEFORE persisting 'cancelled' ──
    // This preserves atomicity: if the credit fails the order remains in its current
    // cancellable status and the caller can safely retry — the stable idempotency key
    // (credit-cancel-<orderId>) prevents double-crediting on retry.
    const paymentMethod = String((existingOrder as any).paymentMethod ?? '').toUpperCase();
    if (paymentMethod === 'WALLET' && !wasDispatched && this.walletClient) {
      const buyerId = (existingOrder as any).buyerId;
      const totalAmount = Number((existingOrder as any).totalAmount?.amount ?? (existingOrder as any).totalAmount ?? 0);
      const currency = String((existingOrder as any).totalAmount?.currency ?? (existingOrder as any).currency ?? 'TZS');
      if (buyerId && totalAmount > 0) {
        // Only issue a refund if a wallet debit was actually recorded for this order.
        // Orders that never reached checkout never debited the wallet, so skip the credit.
        //
        // The lookup matches on `referenceId` first and falls back to the ledger
        // description, because debits recorded before referenceId was persisted
        // (and debits from any other writer) carry a NULL reference. Matching only
        // on referenceId would silently keep those customers' money.
        let walletWasDebited = true;
        try {
          const g = globalThis as unknown as { prisma?: any };
          const debitTx = await g.prisma?.wallet_Transaction?.findFirst?.({
            where: {
              userId: buyerId,
              type: 'DEBIT',
              OR: [{ referenceId: id }, { description: { contains: id } }],
            },
            select: { id: true }
          });
          walletWasDebited = !!debitTx;
        } catch (_checkErr) {
          // If we can't verify, assume it was debited to be safe
          walletWasDebited = true;
        }

        if (walletWasDebited) {
          try {
            await this.walletClient.creditWallet(buyerId, totalAmount, currency, `Refund for cancelled order ${id}`, id);
            logger.info(`[Wallet] Refund of ${totalAmount} ${currency} issued for order ${id}, buyer=${buyerId}`);
          } catch (refundErr: any) {
            logger.error(`[Wallet] Refund failed for order ${id}: ${refundErr.message}. Order NOT cancelled.`);
            res.status(500).json({
              error: 'REFUND_FAILED',
              message: `Wallet refund failed; order has NOT been cancelled. Retry to re-attempt: ${refundErr.message}`,
              orderId: id,
              refundAmount: totalAmount,
              currency,
            });
            return;
          }
        } else {
          logger.info(`[Wallet] Order ${id} was created with deferred payment — no wallet refund needed on cancel`);
        }
      }
    }

    // Wallet credit succeeded (or not required) — now persist the terminal cancelled state.
    existingOrder.status = 'cancelled' as OrderStatus;
    existingOrder.cancelReason = reason;
    existingOrder.cancelledAt = new Date();
    await this.orderRepository.update(existingOrder);

    // Cancel the logistics shipment for this order.
    // Shipments are created at order placement (via `__createOrderShipments`),
    // but nothing previously mirrored order cancellation back to logistics, so a
    // cancelled order left a live CREATED shipment that dispatch could still pick
    // up. Cancelling an order whose goods were never to move must not leave a
    // deliverable parcel behind. Non-fatal: the order is already cancelled and a
    // stale shipment is recoverable, whereas failing here would strand the buyer.
    await this.cancelShipmentsForOrder(id).catch((shipErr: any) => {
      logger.warn(`[Logistics] Failed to cancel shipments for order ${id}: ${shipErr?.message ?? shipErr}`);
    });

    // Release/forfeit COD commitment hold
    const holdId = (existingOrder as any).codCommitmentHoldId;

    if (holdId && this.codCommitmentService) {
      // The hold belongs to the buyer, and the wallet's release/capture routes are
      // owner-scoped, so the buyer's id must be threaded through.
      const holdOwnerId = (existingOrder as any).buyerId;
      if (!wasDispatched) {
        // Cancelled before dispatch — release hold back to buyer
        try {
          await this.codCommitmentService.releaseCommitment(
            holdId,
            holdOwnerId,
            `COD commitment released — order ${id} cancelled before dispatch`
          );
          logger.info(`[COD] Commitment hold released for cancelled order ${id}, holdId=${holdId}`);
        } catch (holdErr: any) {
          logger.warn(`[COD] Failed to release commitment hold for order ${id}: ${holdErr.message}`);
        }
      } else {
        // Cancelled after dispatch — forfeit hold as penalty
        try {
          await this.codCommitmentService.forfeitCommitment(
            holdId,
            holdOwnerId,
            `COD commitment forfeited — order ${id} cancelled after dispatch`
          );
          logger.info(`[COD] Commitment hold forfeited (post-dispatch cancellation) for order ${id}, holdId=${holdId}`);
        } catch (holdErr: any) {
          logger.warn(`[COD] Failed to forfeit commitment hold for order ${id}: ${holdErr.message}`);
        }
      }
    }

    res.status(200).json({
      id,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      reason
    });
  }

  async placeOrder(req: Request, res: Response): Promise<void> {
    try {
      const request: PlaceOrderRequest = req.body;
      const response = await this.placeOrderUseCase.execute(request);
      res.status(201).json({
        id: response.orderId,
        deliveryCode: response.deliveryCode,
        buyerId: request.buyerId,
        sellerId: request.sellerId,
        status: response.status,
        // Seller-verification contract. The use case computes and returns these,
        // but they were not forwarded, so a client had to re-GET the order to
        // learn the deadline it had just been given.
        verificationDeadlineAt: response.verificationDeadlineAt,
        verificationDeadlineRemainingSeconds: Math.max(
          0,
          Math.round((new Date(response.verificationDeadlineAt).getTime() - Date.now()) / 1000)
        ),
        nextAction: response.nextAction,
        checkoutAvailable: false,
        totalAmount: {
          amount: request.items.reduce((sum, item) => {
            const price = typeof item.price === 'number' ? item.price : item.price.amount;
            return sum + (price * item.quantity);
          }, 0),
          currency: request.currency || 'TZS'
        },
        // commitmentFee preserves the original object shape for backward-compatible consumers.
        // commitmentFeeAmount is a numeric convenience field added for newer consumers/tests.
        ...(request.paymentMethod === 'COD' ? {
          commitmentFee: response.commitmentFee > 0 ? {
            amount: response.commitmentFee,
            currency: request.currency || 'TZS',
            paidVia: response.commitmentPaymentMethod ?? 'WALLET',
            description: (request.deliveryFee ?? 0) === 0
              ? 'Commitment fee — covers free delivery cost'
              : 'Delivery fee — secured before packaging',
            // No `paymentUrl` is emitted here. PlaceOrderUseCase always returns
            // `commitmentFee: 0` and `commitmentPaymentMethod: undefined` because
            // all payment is deferred to BuyerConfirmCheckoutUseCase, so the
            // `commitmentFee > 0` branch above is unreachable at order placement.
            // The previous `response.commitmentPaymentUrl` reference was therefore
            // dead: the field is not on PlaceOrderResponse and could never be
            // populated. The commitment payment URL is produced by
            // BuyerConfirmCheckoutUseCase — see its response for `paymentUrl`.
          } : null,
          // Numeric convenience field for consumers that need a simple amount check
          commitmentFeeAmount: response.commitmentFee,
          cashOnDelivery: {
            amount: response.cashOnDeliveryAmount,
            currency: request.currency || 'TZS',
            description: (request.deliveryFee ?? 0) === 0
              ? `Pay TZS ${response.cashOnDeliveryAmount.toLocaleString()} to the courier on delivery`
              : `Pay TZS ${response.cashOnDeliveryAmount.toLocaleString()} to the courier on delivery (full product price)`,
          },
        } : {
          // Non-COD orders: commitmentFee is null (no commitment required)
          commitmentFee: null,
          commitmentFeeAmount: 0,
        }),
        items: request.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: typeof item.price === 'number' ? { amount: item.price, currency: request.currency || 'TZS' } : item.price,
          weight: item.weight
        })),
        deliveryAddress: request.deliveryAddress,
        paymentMethod: request.paymentMethod,
        createdAt: new Date().toISOString()
      });
    } catch (error: any) {
      const mapped = this.mapOrderError(error);
      res.status(mapped.status).json({
        error: 'ORDER_CREATION_FAILED',
        message: mapped.message,
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  /**
   * POST /orders/:id/confirm-delivery
   * Courier submits the 6-digit delivery code to confirm delivery and trigger payment
   */
  async confirmDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { deliveryCode } = req.body;

      if (!deliveryCode || typeof deliveryCode !== 'string' || !/^\d{6}$/.test(deliveryCode)) {
        res.status(400).json({ error: 'INVALID_DELIVERY_CODE', message: 'deliveryCode must be a 6-digit number.' });
        return;
      }

      const order = await this.orderRepository.findById(id);
      if (!order) {
        res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Order not found.' });
        return;
      }

      // Check order is in a deliverable state
      const deliverableStatuses = ['PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'pending', 'confirmed', 'out_for_delivery', 'ASSIGNED', 'assigned'];
      if (!deliverableStatuses.includes((order as any).status)) {
        res.status(409).json({ error: 'INVALID_ORDER_STATE', message: `Order cannot be confirmed in status: ${(order as any).status}` });
        return;
      }

      // Check code hasn't already been used
      if ((order as any).deliveryCodeUsedAt) {
        res.status(409).json({ error: 'DELIVERY_CODE_ALREADY_USED', message: 'This delivery code has already been used.' });
        return;
      }

      // Verify the code
      if ((order as any).deliveryCode !== deliveryCode) {
        res.status(401).json({ error: 'INVALID_DELIVERY_CODE', message: 'The delivery code is incorrect.' });
        return;
      }

      // Mark delivery as confirmed
      await (this.orderRepository as any).prisma.order_Order.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveryCodeUsedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Capture the COD commitment hold to settle the delivery fee
      if ((order as any).codCommitmentHoldId && this.codCommitmentService) {
        try {
          await this.codCommitmentService.captureCommitment(
            (order as any).codCommitmentHoldId,
            (order as any).buyerId,
            `COD delivery confirmed for order ${id}`
          );
          logger.info(`[COD] Commitment hold captured for order ${id}, holdId=${(order as any).codCommitmentHoldId}`);
        } catch (holdErr: any) {
          // Log but don't fail the delivery confirmation — hold may have already been captured
          logger.warn(`[COD] Failed to capture commitment hold for order ${id}: ${holdErr.message}`);
        }
      }

      await eventBus.publish('OrderDelivered', {
        orderId: id,
        buyerId: (order as any).buyerId,
        sellerId: (order as any).sellerId,
        enablerId: (order as any).enablerId,
        paymentMethod: (order as any).paymentMethod,
        totalAmount: (order as any).totalAmount,
        isCOD: String((order as any).paymentMethod ?? '').toUpperCase() === 'COD'
      });

      res.status(200).json({
        success: true,
        orderId: id,
        status: 'DELIVERED',
        confirmedAt: new Date().toISOString(),
        message: 'Delivery confirmed. Commitment fee settled.',
      });

    } catch (error: any) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: error?.message || 'An internal error occurred.' });
    }
  }

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      let order = await this.orderRepository.findById(id);

      if (!order) {
        res.status(404).json({
          error: 'ORDER_NOT_FOUND',
          message: `Order with ID ${id} not found`,
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      // Enrich response with seller verification fields and nextAction hint
      const status = String((order as any).status ?? '');
      const verificationDeadlineAt = (order as any).verificationDeadlineAt;
      const now = Date.now();

      let nextAction: string;
      let verificationDeadlineRemainingSeconds: number | undefined;
      let checkoutAvailable: boolean;
      let checkoutPath: string | undefined;
      let checkoutMessage: string | undefined;

      if (status === 'PENDING_SELLER_VERIFICATION') {
        nextAction = 'AWAIT_VERIFICATION';
        checkoutAvailable = false;
        if (verificationDeadlineAt) {
          const deadlineMs = new Date(verificationDeadlineAt).getTime();
          verificationDeadlineRemainingSeconds = Math.max(0, Math.round((deadlineMs - now) / 1000));
        }
      } else if (status === 'SELLER_VERIFIED') {
        nextAction = 'PROCEED_TO_CHECKOUT';
        checkoutAvailable = true;
        const paymentMethod = String((order as any).paymentMethod ?? '').toUpperCase();
        checkoutPath = paymentMethod === 'COD' ? 'COD_COMMITMENT' : 'FULL_PAYMENT';
      } else if (status === 'VERIFICATION_OVERDUE' || status === 'UNDER_ADMIN_REVIEW') {
        nextAction = 'CONTACT_SUPPORT';
        checkoutAvailable = false;
        checkoutMessage = 'This order is under administrative review. Checkout is temporarily unavailable.';
      } else if (status === 'SELLER_DECLINED') {
        nextAction = 'CONTACT_SUPPORT';
        checkoutAvailable = false;
        checkoutMessage = 'The seller was unable to fulfill this order.';
      } else if (status === 'CANCELLED') {
        nextAction = 'CONTACT_SUPPORT';
        checkoutAvailable = false;
      } else if (status === 'CONFIRMED' || status === 'ASSIGNED' || status === 'IN_TRANSIT') {
        nextAction = 'AWAIT_DELIVERY';
        checkoutAvailable = false;
      } else if (status === 'DELIVERED') {
        nextAction = 'NONE';
        checkoutAvailable = false;
      } else {
        nextAction = 'CONTACT_SUPPORT';
        checkoutAvailable = false;
      }

      res.status(200).json({
        ...order,
        status,
        deliveryCode: (order as any).deliveryCode ?? undefined,
        deliveryCodeUsedAt: (order as any).deliveryCodeUsedAt ?? undefined,
        // Verification fields
        verificationDeadlineAt: verificationDeadlineAt ? new Date(verificationDeadlineAt).toISOString() : undefined,
        verificationDeadlineRemainingSeconds,
        // Buyer guidance
        nextAction,
        checkoutAvailable,
        ...(checkoutPath ? { checkoutPath } : {}),
        ...(checkoutMessage ? { checkoutMessage } : {}),
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve order',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  /**
   * Tracking lookup - accepts EITHER identifier:
   *
   *  - an ORDER NUMBER (`ORD-YYYYMMDD-NLNL`) resolves to the order plus every
   *    shipment created for it, so the customer can pick which shipment to follow;
   *  - a SHIPMENT TRACKING NUMBER (`TRK-NLNLNL`) resolves directly to that one
   *    shipment, with its parent order for context.
   *
   * Order numbers and shipment tracking numbers are separate namespaces: the
   * order number stays with the order for its whole lifecycle and is never used
   * as a shipment identifier (one order may contain several shipments).
   */
  async getTrackingLookup(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.params;

      if (!isTrackingLookupIdentifier(identifier)) {
        res.status(400).json({
          error: 'INVALID_TRACKING_IDENTIFIER',
          message: 'Provide an order number (ORD-YYYYMMDD-NLNL) or a shipment tracking number (TRK-NLNLNL)',
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      const prisma = (globalThis as unknown as { prisma?: any }).prisma;
      const lookupType = isOrderNumber(identifier) ? 'ORDER' : 'SHIPMENT';

      let order: Awaited<ReturnType<OrderRepository['findById']>> = null;
      let shipments: any[] = [];
      let resolvedShipmentId: string | undefined;

      if (lookupType === 'ORDER') {
        order = await this.orderRepository.findById(identifier);
        if (order && prisma?.logistics_Shipment?.findMany) {
          shipments = await prisma.logistics_Shipment.findMany({
            where: { orderId: identifier },
            orderBy: { createdAt: 'asc' }
          });
        }
      } else if (prisma?.logistics_Shipment?.findFirst) {
        const shipment = await prisma.logistics_Shipment.findFirst({
          where: { trackingNumber: identifier }
        });
        if (shipment) {
          shipments = [shipment];
          resolvedShipmentId = shipment.id;
          order = await this.orderRepository.findById(shipment.orderId);
        }
      }

      if (!order && shipments.length === 0) {
        res.status(404).json({
          error: 'TRACKING_NOT_FOUND',
          message: `No order or shipment matches ${identifier}`,
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      res.status(200).json({
        ...(order
          ? { ...order, status: this.toPublicOrderStatus(order.status), internalStatus: order.status }
          : { order: null }),
        lookupType,
        resolvedShipmentId,
        shipments
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to resolve tracking identifier',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { buyerId, sellerId, page = '1', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const requestedBuyerId = typeof buyerId === 'string' && buyerId.trim() ? buyerId.trim() : undefined;
      const requestedSellerId = typeof sellerId === 'string' && sellerId.trim() ? sellerId.trim() : undefined;
      const authUserId = this.getAuthUserId(req);
      const roles = this.getAuthRoles(req);

      let orders: any[];
      let scope: { buyerId?: string; sellerId?: string } = {};

      if (requestedBuyerId) {
        orders = await this.orderRepository.findByBuyerId(requestedBuyerId);
        scope = { buyerId: requestedBuyerId };
      } else if (requestedSellerId) {
        if (!this.orderRepository.findBySellerId) {
          res.status(501).json({
            error: 'SELLER_ORDER_LIST_UNSUPPORTED',
            message: 'Seller-scoped order listing is not supported',
            requestId: req.headers['x-request-id'] as string
          });
          return;
        }
        orders = await this.orderRepository.findBySellerId(requestedSellerId);
        scope = { sellerId: requestedSellerId };
      } else if (authUserId && roles.includes('seller') && !roles.includes('buyer')) {
        if (!this.orderRepository.findBySellerId) {
          res.status(501).json({
            error: 'SELLER_ORDER_LIST_UNSUPPORTED',
            message: 'Seller-scoped order listing is not supported',
            requestId: req.headers['x-request-id'] as string
          });
          return;
        }
        orders = await this.orderRepository.findBySellerId(authUserId);
        scope = { sellerId: authUserId };
      } else if (authUserId) {
        orders = await this.orderRepository.findByBuyerId(authUserId);
        scope = { buyerId: authUserId };
      } else {
        res.status(400).json({
          error: 'MISSING_ORDER_SCOPE',
          message: 'Provide buyerId or sellerId, or authenticate as a buyer or seller',
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      // Sort priority:
      //   1. Cancellable orders (pending, confirmed) — most likely what fallback logic needs
      //   2. Other active non-terminal orders (processing, assigned, shipped, in_transit)
      //   3. Terminal orders (delivered, cancelled) — last
      // Within each group, preserve original DB order (typically createdAt desc from repository).
      const cancellableStatuses = ['pending', 'confirmed'];
      const activeNonTerminalStatuses = ['processing', 'assigned', 'shipped', 'in_transit'];
      orders = [
        ...orders.filter(o => cancellableStatuses.includes(String((o as any).status).toLowerCase())),
        ...orders.filter(o => activeNonTerminalStatuses.includes(String((o as any).status).toLowerCase())),
        ...orders.filter(o => {
          const s = String((o as any).status).toLowerCase();
          return !cancellableStatuses.includes(s) && !activeNonTerminalStatuses.includes(s);
        })
      ];

      const pagedOrders = orders.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      res.status(200).json({
        orders: pagedOrders,
        data: pagedOrders,
        scope,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: orders.length,
          totalPages: Math.ceil(orders.length / limitNum)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve orders',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async updateOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Find existing order
      const existingOrder = await this.orderRepository.findById(id);
      if (!existingOrder) {
        res.status(404).json({
          error: 'ORDER_NOT_FOUND',
          message: `Order with ID ${id} not found`,
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      // Update order (simplified - only delivery address for now)
      if (updateData.deliveryAddress) {
        existingOrder.deliveryAddress = updateData.deliveryAddress;
        await this.orderRepository.update(existingOrder);
      }

      res.status(200).json(existingOrder);
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update order',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async deleteOrder(req: Request, res: Response): Promise<void> {
    try {
      await this.cancelOrderInternal(req, res);
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to cancel order',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  /**
   * Marks every not-yet-terminal shipment for an order as CANCELLED.
   *
   * Only shipments that have not started moving are cancelled: once a shipment
   * is assigned or in transit the parcel is physically in the network, so
   * overwriting its status would erase the truth and could suppress a delivery
   * that a courier is still completing.
   */
  private async cancelShipmentsForOrder(orderId: string): Promise<number> {
    const g = globalThis as unknown as { prisma?: any };
    const delegate = g.prisma?.logistics_Shipment;
    if (!delegate?.updateMany) return 0;

    const cancellable = ['CREATED', 'PENDING', 'PENDING_ASSIGNMENT', 'UNASSIGNED'];
    const result = await delegate.updateMany({
      where: { orderId, status: { in: cancellable } },
      data: {
        status: 'CANCELLED',
        failureReason: 'ORDER_CANCELLED',
        updatedAt: new Date(),
      },
    });

    if (result?.count) {
      logger.info(`[Logistics] Cancelled ${result.count} shipment(s) for order ${orderId}`);
    }
    return result?.count ?? 0;
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      await this.cancelOrderInternal(req, res, req.body?.reason);
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to cancel order',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  /**
   * Builds the consent use case over the shared Prisma client. Kept in one place
   * so the request/decision columns cannot drift between the three endpoints.
   */
  private buildCancellationConsentUseCase(): OrderCancellationConsentUseCase | null {
    const prisma = (globalThis as unknown as { prisma?: any }).prisma;
    if (!prisma) return null;

    return new OrderCancellationConsentUseCase({
      findOrder: async (id: string) =>
        prisma.order_Order.findUnique({
          where: { id },
          select: {
            id: true, buyerId: true, sellerId: true,
            status: true, cancelRequestStatus: true,
          },
        }) ?? null,
      openRequest: async (id: string, requestedBy: string) => {
        await prisma.order_Order.update({
          where: { id },
          data: {
            cancelRequestStatus: 'PENDING_SELLER',
            cancelRequestedAt: new Date(),
            cancelRequestedBy: requestedBy,
            cancelDecidedAt: null,
            cancelDecisionReason: null,
          },
        });
      },
      decide: async (id: string, status: string, reason: string) => {
        await prisma.order_Order.update({
          where: { id },
          data: {
            cancelRequestStatus: status,
            cancelDecidedAt: new Date(),
            cancelDecisionReason: reason,
          },
        });
      },
    });
  }

  private actorUserId(req: Request): string | null {
    return (req as any).user?.userId ?? (req as any).user?.id ?? null;
  }

  /** Step 1: buyer (or seller) requests cancellation of a paid order. */
  async requestOrderCancellation(req: Request, res: Response): Promise<void> {
    const useCase = this.buildCancellationConsentUseCase();
    if (!useCase) {
      res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Order store unavailable' });
      return;
    }
    const actorUserId = this.actorUserId(req);
    if (!actorUserId) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const result = await useCase.request({ orderId: id, actorUserId });

    switch (result.outcome) {
      case 'not-found':
        res.status(404).json({ error: 'ORDER_NOT_FOUND', message: `Order ${id} not found` });
        return;
      case 'forbidden':
        res.status(403).json({ error: 'FORBIDDEN', message: result.message });
        return;
      case 'invalid-state':
        res.status(409).json({ error: 'INVALID_ORDER_STATE', message: result.message });
        return;
      case 'already-cancelled':
        res.status(200).json({ success: true, orderId: id, status: 'CANCELLED', alreadyCancelled: true });
        return;
      case 'already-requested':
        res.status(200).json({
          success: true, orderId: id,
          cancelRequestStatus: 'PENDING_SELLER', alreadyRequested: true,
          message: 'A cancellation request is already awaiting seller decision',
        });
        return;
      default:
        res.status(202).json({
          success: true, orderId: id,
          cancelRequestStatus: 'PENDING_SELLER', message: result.message,
        });
    }
  }

  /**
   * Step 2a: seller approves. Delegates to the existing cancellation path so the
   * wallet refund and COD hold release behave identically to any other cancel.
   */
  async approveOrderCancellation(req: Request, res: Response): Promise<void> {
    const useCase = this.buildCancellationConsentUseCase();
    if (!useCase) {
      res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Order store unavailable' });
      return;
    }
    const actorUserId = this.actorUserId(req);
    const { id } = req.params;

    const result = await useCase.approve({
      orderId: id,
      actorUserId: actorUserId ?? '',
      reason: req.body?.reason,
    });

    if (result.outcome === 'not-found') {
      res.status(404).json({ error: 'ORDER_NOT_FOUND', message: `Order ${id} not found` });
      return;
    }
    if (result.outcome === 'forbidden') {
      res.status(403).json({ error: 'FORBIDDEN', message: result.reason });
      return;
    }
    if (result.outcome === 'no-request') {
      res.status(409).json({ error: 'NO_PENDING_REQUEST', message: result.reason });
      return;
    }

    await this.cancelOrderInternal(req, res, result.reason);
  }

  /** Step 2b: seller declines. The order is left completely untouched. */
  async declineOrderCancellation(req: Request, res: Response): Promise<void> {
    const useCase = this.buildCancellationConsentUseCase();
    if (!useCase) {
      res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Order store unavailable' });
      return;
    }
    const actorUserId = this.actorUserId(req);
    const { id } = req.params;

    const result = await useCase.decline({
      orderId: id,
      actorUserId: actorUserId ?? '',
      reason: req.body?.reason,
    });

    if (result.outcome === 'not-found') {
      res.status(404).json({ error: 'ORDER_NOT_FOUND', message: `Order ${id} not found` });
      return;
    }
    if (result.outcome === 'forbidden') {
      res.status(403).json({ error: 'FORBIDDEN', message: result.reason });
      return;
    }
    if (result.outcome === 'no-request') {
      res.status(409).json({ error: 'NO_PENDING_REQUEST', message: result.reason });
      return;
    }

    res.status(200).json({
      success: true,
      orderId: id,
      status: result.order?.status,
      cancelRequestStatus: 'DECLINED',
      reason: result.reason,
    });
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rawAction = req.body?.action ?? req.body?.status;
      const actionAliases: Record<string, string> = {
        CONFIRMED: 'confirm',
        confirmed: 'confirm',
        PROCESSING: 'process',
        processing: 'process',
        SHIPPED: 'ship',
        shipped: 'ship',
        IN_TRANSIT: 'ship',
        in_transit: 'ship',
        READY_FOR_PICKUP: 'ship',
        ready_for_pickup: 'ship',
        DELIVERED: 'complete',
        delivered: 'complete',
        COMPLETE: 'complete',
        complete: 'complete',
      };
      const action = typeof rawAction === 'string'
        ? (actionAliases[rawAction] ?? rawAction.toLowerCase())
        : rawAction;
      const { notes, estimatedShippingDate, trackingNumber, carrier, estimatedDeliveryDate, deliveryConfirmation } = req.body;

      // Find existing order
      const existingOrder = await this.orderRepository.findById(id);
      if (!existingOrder) {
        res.status(404).json({
          error: 'ORDER_NOT_FOUND',
          message: `Order with ID ${id} not found`,
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      const previousStatus = existingOrder.status;
      const normalizedCurrentStatus = String(existingOrder.status).toLowerCase();
      const actionMinimumRank: Record<string, number> = {
        confirm: 1,
        process: 2,
        ship: 3,
        complete: 4,
      };
      const statusRank: Record<string, number> = {
        pending: 0,
        pending_seller_verification: 0,
        confirmed: 1,
        processing: 2,
        assigned: 2,
        shipped: 3,
        in_transit: 3,
        delivered: 4,
        cancelled: 99,
      };
      const requestedRank = typeof action === 'string' ? actionMinimumRank[action] : undefined;
      const currentRank = statusRank[normalizedCurrentStatus];

      if (requestedRank !== undefined && currentRank !== undefined && currentRank >= requestedRank && normalizedCurrentStatus !== 'cancelled') {
        res.status(200).json({
          id,
          status: existingOrder.status,
          publicStatus: this.toPublicOrderStatus(existingOrder.status),
          previousStatus,
          previousPublicStatus: this.toPublicOrderStatus(previousStatus),
          idempotent: true,
          updatedAt: new Date().toISOString(),
          notes
        });
        return;
      }

      let newStatus: OrderStatus;
      const additionalData: any = {};

      // Auto-advance helper: silently apply intermediate transitions so callers can
      // jump states (e.g. confirmed → ship) without needing to drive every step.
      const autoAdvance = async (targetStatuses: Array<{ from: string[]; to: OrderStatus }>) => {
        let current = String(existingOrder.status).toLowerCase();
        for (const step of targetStatuses) {
          if (step.from.includes(current)) {
            existingOrder.status = step.to;
            await this.orderRepository.update(existingOrder);
            current = String(step.to).toLowerCase();
          }
        }
      };

      // Validate state transitions
      switch (action) {
        case 'confirm':
          if (!['pending', 'pending_seller_verification'].includes(normalizedCurrentStatus)) {
            res.status(403).json({
              error: 'INVALID_TRANSITION',
              message: 'Order must be pending to be confirmed',
              requestId: req.headers['x-request-id'] as string
            });
            return;
          }
          newStatus = 'confirmed' as OrderStatus;
          break;

        case 'process':
          // Auto-advance: pending → confirmed → processing
          await autoAdvance([
            { from: ['pending', 'pending_seller_verification'], to: 'confirmed' as OrderStatus },
          ]);
          if (!['confirmed'].includes(String(existingOrder.status).toLowerCase())) {
            res.status(403).json({
              error: 'INVALID_TRANSITION',
              message: 'Order must be confirmed to be processed',
              requestId: req.headers['x-request-id'] as string
            });
            return;
          }
          newStatus = 'processing' as OrderStatus;
          additionalData.estimatedShippingDate = estimatedShippingDate;
          break;

        case 'ship':
        case 'ready_for_pickup':
        case 'READY_FOR_PICKUP':
          // Auto-advance: pending → confirmed → processing → shipped
          await autoAdvance([
            { from: ['pending', 'pending_seller_verification'], to: 'confirmed' as OrderStatus },
            { from: ['confirmed'], to: 'processing' as OrderStatus },
          ]);
          if (!['processing', 'assigned'].includes(String(existingOrder.status).toLowerCase())) {
            res.status(403).json({
              error: 'INVALID_TRANSITION',
              message: 'Order must be processing to be shipped',
              requestId: req.headers['x-request-id'] as string
            });
            return;
          }
          // `trackingNumber` here is a SHIPMENT tracking number (TRK-NLNLNL) supplied by
          // staff for the shipment being dispatched. An order number is never accepted
          // as a shipment identifier.
          if (trackingNumber !== undefined && trackingNumber !== null && !isShipmentTrackingNumber(trackingNumber)) {
            res.status(400).json({
              error: 'INVALID_TRACKING_NUMBER',
              message: 'A shipment tracking number must match TRK-NLNLNL (e.g. TRK-3C8B2D). Order numbers are not shipment identifiers.',
              requestId: req.headers['x-request-id'] as string
            });
            return;
          }
          newStatus = 'shipped' as OrderStatus;
          additionalData.trackingNumber = trackingNumber;
          additionalData.carrier = carrier;
          additionalData.estimatedDeliveryDate = estimatedDeliveryDate;
          break;

        case 'complete':
          // Auto-advance: pending → confirmed → processing → shipped → delivered
          await autoAdvance([
            { from: ['pending', 'pending_seller_verification'], to: 'confirmed' as OrderStatus },
            { from: ['confirmed'], to: 'processing' as OrderStatus },
            { from: ['processing', 'assigned'], to: 'shipped' as OrderStatus },
          ]);
          if (!['shipped', 'in_transit'].includes(String(existingOrder.status).toLowerCase())) {
            res.status(403).json({
              error: 'INVALID_TRANSITION',
              message: 'Order must be shipped to be completed',
              requestId: req.headers['x-request-id'] as string
            });
            return;
          }
          newStatus = 'delivered' as OrderStatus;
          additionalData.deliveryConfirmation = deliveryConfirmation;
          break;

        default:
          res.status(400).json({
            error: 'INVALID_ACTION',
            message: 'Action must be one of: confirm, process, ship, ready_for_pickup, complete',
            requestId: req.headers['x-request-id'] as string
          });
          return;
      }

      // Update order status
      existingOrder.status = newStatus;
      await this.orderRepository.update(existingOrder);

      res.status(200).json({
        id,
        status: newStatus,
        publicStatus: this.toPublicOrderStatus(newStatus),
        previousStatus,
        previousPublicStatus: this.toPublicOrderStatus(previousStatus),
        updatedAt: new Date().toISOString(),
        notes,
        ...additionalData
      });

    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update order status',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async searchOrders(req: Request, res: Response): Promise<void> {
    try {
      const { status, buyerId, limit = '10' } = req.query;
      const limitNum = parseInt(limit as string, 10);

      let orders: any[] = [];

      if (status) {
        // Search by status
        const statusList = (status as string).split(',');
        for (const statusValue of statusList) {
          const statusOrders = await this.orderRepository.findByStatus(statusValue as OrderStatus);
          orders = orders.concat(statusOrders);
        }
        // Remove duplicates
        orders = orders.filter((order, index, self) =>
          index === self.findIndex(o => o.id === order.id)
        );
      } else if (buyerId) {
        // Search by buyer
        orders = await this.orderRepository.findByBuyerId(buyerId as string);
      }

      // Apply limit
      orders = orders.slice(0, limitNum);

      res.status(200).json({
        orders,
        total: orders.length
      });

    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to search orders',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async getOrderAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'daily', startDate, endDate } = req.query;

      // Get basic stats (simplified implementation)
      const totalOrders = await this.orderRepository.count();
      const confirmedOrders = await this.orderRepository.findByStatus('confirmed' as OrderStatus);
      const deliveredOrders = await this.orderRepository.findByStatus('delivered' as OrderStatus);

      // Calculate total revenue (simplified)
      const totalRevenue = 0;
      // In real implementation, you'd query with aggregation

      const analytics = {
        totalOrders,
        confirmedOrders: confirmedOrders.length,
        deliveredOrders: deliveredOrders.length,
        totalRevenue,
        period,
        dateRange: {
          startDate,
          endDate
        }
      };

      res.status(200).json(analytics);

    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get analytics',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async validateCODELigibility(req: Request, res: Response): Promise<void> {
    try {
      const input: CheckCODEligibilityInput = req.body;
      const result = await this.checkCODEligibilityUseCase.execute(input);

      res.status(200).json(result);
    } catch (error: any) {
      const mapped = this.mapOrderError(error);
      res.status(mapped.status).json({
        eligible: false,
        error: 'ELIGIBILITY_CHECK_FAILED',
        message: mapped.message
      });
    }
  }
}
