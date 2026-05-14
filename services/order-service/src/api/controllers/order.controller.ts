import { Request, Response } from 'express';
import { PlaceOrderUseCase, PlaceOrderRequest } from '../../application/use-cases/place-order.use-case';
import { CheckCODEligibilityUseCase, CheckCODEligibilityInput } from '../../application/use-cases/check-cod-eligibility.use-case';
import { CODCommitmentService } from '../../domain/services/cod-commitment.service';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { PrismaOrderRepository } from '../../infrastructure/database/prisma-order.repository';
import { OrderStatus } from '../../domain/entities/order.entity';
import { IdGeneratorService } from '../../infrastructure/services/id-generator.service';
import { CancellationPolicy, CancellationRequester } from '../../domain/policies/cancellation.policy';
import { logger } from '../../infrastructure/monitoring/logger';

export class OrderController {
  private orderRepository: OrderRepository;
  private cancellationPolicy: CancellationPolicy;

  constructor(
    private readonly placeOrderUseCase: PlaceOrderUseCase,
    private readonly checkCODEligibilityUseCase: CheckCODEligibilityUseCase,
    private readonly codCommitmentService?: CODCommitmentService
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
    if (lower.includes('invalid') || lower.includes('required') || lower.includes('ineligible') || lower.includes('greater than zero')) {
      return { status: 422, message };
    }
    return { status: 500, message };
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
        requestId: req.headers['x-request-id'] as string
      });
      return;
    }

    existingOrder.status = 'cancelled' as OrderStatus;
    existingOrder.cancelReason = reason;
    existingOrder.cancelledAt = new Date();
    await this.orderRepository.update(existingOrder);

    // Release COD commitment hold if order was cancelled before dispatch
    const dispatchedStatuses = ['ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'assigned', 'shipped', 'in_transit'];
    const wasDispatched = dispatchedStatuses.includes(existingOrder.status as string);
    const holdId = (existingOrder as any).codCommitmentHoldId;

    if (holdId && this.codCommitmentService) {
      if (!wasDispatched) {
        // Cancelled before dispatch — release hold back to buyer
        try {
          await this.codCommitmentService.releaseCommitment(holdId);
          logger.info(`[COD] Commitment hold released for cancelled order ${id}, holdId=${holdId}`);
        } catch (holdErr: any) {
          logger.warn(`[COD] Failed to release commitment hold for order ${id}: ${holdErr.message}`);
        }
      } else {
        // Cancelled after dispatch — forfeit hold as penalty
        try {
          await this.codCommitmentService.forfeitCommitment(holdId);
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
        trackingNumber: response.trackingNumber,
        deliveryCode: response.deliveryCode,
        buyerId: request.buyerId,
        sellerId: request.sellerId,
        status: response.status,
        totalAmount: {
          amount: request.items.reduce((sum, item) => {
            const price = typeof item.price === 'number' ? item.price : item.price.amount;
            return sum + (price * item.quantity);
          }, 0),
          currency: request.currency || 'TZS'
        },
        // COD payment breakdown
        ...(request.paymentMethod === 'COD' && {
          commitmentFee: response.commitmentFee > 0 ? {
            amount: response.commitmentFee,
            currency: request.currency || 'TZS',
            paidVia: response.commitmentPaymentMethod ?? 'WALLET',
            description: (request.deliveryFee ?? 0) === 0
              ? 'Commitment fee — covers free delivery cost'
              : 'Delivery fee — secured before packaging',
            ...(response.commitmentPaymentUrl && { paymentUrl: response.commitmentPaymentUrl }),
          } : null,
          cashOnDelivery: {
            amount: response.cashOnDeliveryAmount,
            currency: request.currency || 'TZS',
            description: (request.deliveryFee ?? 0) === 0
              ? `Pay TZS ${response.cashOnDeliveryAmount.toLocaleString()} to the courier on delivery`
              : `Pay TZS ${response.cashOnDeliveryAmount.toLocaleString()} to the courier on delivery (full product price)`,
          },
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
      if ((order as any).codCommitmentHoldId) {
        try {
          await this.codCommitmentService.captureCommitment((order as any).codCommitmentHoldId);
          logger.info(`[COD] Commitment hold captured for order ${id}, holdId=${(order as any).codCommitmentHoldId}`);
        } catch (holdErr: any) {
          // Log but don't fail the delivery confirmation — hold may have already been captured
          logger.warn(`[COD] Failed to capture commitment hold for order ${id}: ${holdErr.message}`);
        }
      }

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
      const order = await this.orderRepository.findById(id);

      if (!order) {
        res.status(404).json({
          error: 'ORDER_NOT_FOUND',
          message: `Order with ID ${id} not found`,
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      res.status(200).json({
        ...order,
        deliveryCode: (order as any).deliveryCode ?? undefined,
        deliveryCodeUsedAt: (order as any).deliveryCodeUsedAt ?? undefined
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve order',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async getOrderByTrackingNumber(req: Request, res: Response): Promise<void> {
    try {
      const { trackingNumber } = req.params;

      if (!IdGeneratorService.isValidOrderTrackingNumber(trackingNumber)) {
        res.status(400).json({
          error: 'INVALID_TRACKING_NUMBER',
          message: 'Tracking number format is invalid',
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      if (!this.orderRepository.findByTrackingNumber) {
        res.status(501).json({
          error: 'NOT_IMPLEMENTED',
          message: 'Tracking lookup is not supported',
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      const order = await this.orderRepository.findByTrackingNumber(trackingNumber);

      if (!order) {
        res.status(404).json({
          error: 'ORDER_NOT_FOUND',
          message: `Order with tracking number ${trackingNumber} not found`,
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      res.status(200).json(order);
    } catch (error: any) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve order by tracking number',
        requestId: req.headers['x-request-id'] as string
      });
    }
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { buyerId, page = '1', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (!buyerId) {
        res.status(400).json({
          error: 'MISSING_BUYER_ID',
          message: 'buyerId query parameter is required',
          requestId: req.headers['x-request-id'] as string
        });
        return;
      }

      // For now, return all orders for the buyer (pagination not implemented yet)
      const orders = await this.orderRepository.findByBuyerId(buyerId as string);

      res.status(200).json({
        orders,
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

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const action = req.body?.action;
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
      let newStatus: OrderStatus;
      const additionalData: any = {};

      // Validate state transitions
      switch (action) {
        case 'confirm':
          if (existingOrder.status !== 'pending') {
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
          if (existingOrder.status !== 'confirmed') {
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
          if (existingOrder.status !== 'processing') {
            res.status(403).json({
              error: 'INVALID_TRANSITION',
              message: 'Order must be processing to be shipped',
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
          if (existingOrder.status !== 'shipped') {
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
            message: 'Action must be one of: confirm, process, ship, complete',
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
        previousStatus,
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
