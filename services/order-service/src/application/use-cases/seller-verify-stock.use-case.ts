import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderStatus } from '../../domain/entities/order.entity';
import { VerificationStateMachine } from '../../domain/state-machine/verification-state-machine';
import { VerificationAuditLogRepository } from '../../domain/repositories/verification-audit-log.repository';
import { makeId } from '@shared/ids/id';
import { logger } from '../../infrastructure/monitoring/logger';

export interface SellerVerifyStockInput {
  orderId: string;
  sellerId: string;
}

export interface SellerVerifyStockOutput {
  orderId: string;
  newStatus: OrderStatus;
  verificationDeadlineAt: string;
}

export class SellerVerifyStockUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly auditLogRepository: VerificationAuditLogRepository,
    private readonly eventPublisher: { publish(event: any): Promise<void> },
  ) {}

  async execute(input: SellerVerifyStockInput): Promise<SellerVerifyStockOutput> {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) {
      throw Object.assign(new Error(`Order ${input.orderId} not found`), { code: 'ORDER_NOT_FOUND', statusCode: 404 });
    }

    // Authorization: only the seller on the order may confirm stock
    if ((order as any).sellerId !== input.sellerId) {
      throw Object.assign(new Error('You are not the seller for this order'), { code: 'FORBIDDEN', statusCode: 403 });
    }

    const currentStatus = (order as any).status as OrderStatus;

    // State-machine guard
    const transition = VerificationStateMachine.canTransition(currentStatus, OrderStatus.SELLER_VERIFIED, 'seller');
    if (!transition.allowed) {
      throw Object.assign(new Error(transition.error ?? 'Invalid status transition'), {
        code: 'INVALID_STATUS_TRANSITION',
        statusCode: 422,
        allowedTransitions: transition.allowedTransitions,
      });
    }

    // Deadline check
    const deadline = (order as any).verificationDeadlineAt as Date | undefined;
    if (deadline && new Date() > deadline) {
      throw Object.assign(
        new Error(`Verification deadline has expired (was ${deadline.toISOString()})`),
        { code: 'VERIFICATION_DEADLINE_EXPIRED', statusCode: 422 },
      );
    }

    const now = new Date();

    // Persist status update + audit log atomically via shared Prisma
    const prisma = (globalThis as any).prisma;
    if (prisma) {
      await prisma.$transaction(async (tx: any) => {
        await tx.order_Order.update({
          where: { id: input.orderId },
          data: { status: 'SELLER_VERIFIED', updatedAt: now },
        });
        await tx.order_VerificationAuditLog.create({
          data: {
            id: makeId('vau'),
            orderId: input.orderId,
            entryType: 'STATUS_TRANSITION',
            actorType: 'seller',
            actorId: input.sellerId,
            previousStatus: currentStatus,
            newStatus: 'SELLER_VERIFIED',
            reason: 'Seller confirmed stock availability',
            timestamp: now,
          },
        });
      });
    } else {
      // Fallback: separate writes (non-transactional)
      (order as any).status = OrderStatus.SELLER_VERIFIED;
      await this.orderRepository.update(order);
      await this.auditLogRepository.append({
        id: makeId('vau'),
        orderId: input.orderId,
        entryType: 'STATUS_TRANSITION',
        actorType: 'seller',
        actorId: input.sellerId,
        previousStatus: currentStatus,
        newStatus: OrderStatus.SELLER_VERIFIED,
        reason: 'Seller confirmed stock availability',
        timestamp: now,
      });
    }

    // Notify buyer — non-fatal
    try {
      await this.eventPublisher.publish({
        type: 'order.seller_verified',
        orderId: input.orderId,
        sellerId: input.sellerId,
        buyerId: (order as any).buyerId,
        verificationDeadlineAt: deadline?.toISOString(),
      });
    } catch (err: any) {
      logger.warn('[SellerVerifyStock] Notification event failed (non-fatal)', { orderId: input.orderId, err: err.message });
    }

    return {
      orderId: input.orderId,
      newStatus: OrderStatus.SELLER_VERIFIED,
      verificationDeadlineAt: deadline?.toISOString() ?? '',
    };
  }
}
