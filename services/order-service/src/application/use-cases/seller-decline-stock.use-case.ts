import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderStatus } from '../../domain/entities/order.entity';
import { VerificationStateMachine } from '../../domain/state-machine/verification-state-machine';
import { VerificationAuditLogRepository } from '../../domain/repositories/verification-audit-log.repository';
import { makeId } from '@shared/ids/id';
import { logger } from '../../infrastructure/monitoring/logger';

export interface SellerDeclineStockInput {
  orderId: string;
  sellerId: string;
  reason?: string;
}

export interface SellerDeclineStockOutput {
  orderId: string;
  newStatus: OrderStatus;
}

export class SellerDeclineStockUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly auditLogRepository: VerificationAuditLogRepository,
    private readonly eventPublisher: { publish(event: any): Promise<void> },
  ) {}

  async execute(input: SellerDeclineStockInput): Promise<SellerDeclineStockOutput> {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) {
      throw Object.assign(new Error(`Order ${input.orderId} not found`), { code: 'ORDER_NOT_FOUND', statusCode: 404 });
    }

    if ((order as any).sellerId !== input.sellerId) {
      throw Object.assign(new Error('You are not the seller for this order'), { code: 'FORBIDDEN', statusCode: 403 });
    }

    const currentStatus = (order as any).status as OrderStatus;
    const transition = VerificationStateMachine.canTransition(currentStatus, OrderStatus.SELLER_DECLINED, 'seller');
    if (!transition.allowed) {
      throw Object.assign(new Error(transition.error ?? 'Invalid status transition'), {
        code: 'INVALID_STATUS_TRANSITION',
        statusCode: 422,
        allowedTransitions: transition.allowedTransitions,
      });
    }

    const now = new Date();
    const declineReason = input.reason || 'Seller declined — stock unavailable';

    const prisma = (globalThis as any).prisma;
    if (prisma) {
      await prisma.$transaction(async (tx: any) => {
        await tx.order_Order.update({
          where: { id: input.orderId },
          data: { status: 'SELLER_DECLINED', cancellationReason: declineReason, declineReason: declineReason, updatedAt: now },
        });
        await tx.order_VerificationAuditLog.create({
          data: {
            id: makeId('vau'),
            orderId: input.orderId,
            entryType: 'STATUS_TRANSITION',
            actorType: 'seller',
            actorId: input.sellerId,
            previousStatus: currentStatus,
            newStatus: 'SELLER_DECLINED',
            reason: declineReason,
            timestamp: now,
          },
        });
      });
    } else {
      (order as any).status = OrderStatus.SELLER_DECLINED;
      (order as any).cancelReason = declineReason;
      (order as any).declineReason = declineReason;
      await this.orderRepository.update(order);
      await this.auditLogRepository.append({
        id: makeId('vau'),
        orderId: input.orderId,
        entryType: 'STATUS_TRANSITION',
        actorType: 'seller',
        actorId: input.sellerId,
        previousStatus: currentStatus,
        newStatus: OrderStatus.SELLER_DECLINED,
        reason: declineReason,
        timestamp: now,
      });
    }

    // Notify buyer — non-fatal
    try {
      await this.eventPublisher.publish({
        type: 'order.seller_declined',
        orderId: input.orderId,
        sellerId: input.sellerId,
        buyerId: (order as any).buyerId,
        reason: declineReason,
      });
    } catch (err: any) {
      logger.warn('[SellerDeclineStock] Notification event failed (non-fatal)', { orderId: input.orderId, err: err.message });
    }

    return { orderId: input.orderId, newStatus: OrderStatus.SELLER_DECLINED };
  }
}
