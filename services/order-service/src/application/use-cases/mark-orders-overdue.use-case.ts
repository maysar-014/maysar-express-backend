import { OrderStatus } from '../../domain/entities/order.entity';
import { VerificationAuditLogRepository } from '../../domain/repositories/verification-audit-log.repository';
import { makeId } from '@shared/ids/id';
import { logger } from '../../infrastructure/monitoring/logger';

export class MarkOrdersOverdueUseCase {
  constructor(
    private readonly auditLogRepository: VerificationAuditLogRepository,
    private readonly eventPublisher: { publish(event: any): Promise<void> },
  ) {}

  async execute(): Promise<{ processedCount: number }> {
    const prisma = (globalThis as any).prisma;
    if (!prisma) {
      logger.warn('[MarkOrdersOverdue] Prisma not available — skipping overdue check');
      return { processedCount: 0 };
    }

    // Find orders past their deadline that are still awaiting verification
    let overdueOrders: any[] = [];
    try {
      overdueOrders = await prisma.order_Order.findMany({
        where: {
          status: 'PENDING_SELLER_VERIFICATION',
          verificationDeadlineAt: { lt: new Date() },
        },
        select: {
          id: true,
          sellerId: true,
          buyerId: true,
          verificationDeadlineAt: true,
          status: true,
        },
      });
    } catch (err: any) {
      logger.warn('[MarkOrdersOverdue] Query failed', { err: err.message });
      return { processedCount: 0 };
    }

    let processedCount = 0;

    for (const order of overdueOrders) {
      try {
        const now = new Date();
        const overdueByMs = now.getTime() - new Date(order.verificationDeadlineAt).getTime();

        await prisma.$transaction(async (tx: any) => {
          await tx.order_Order.update({
            where: { id: order.id },
            data: { status: 'VERIFICATION_OVERDUE', updatedAt: now },
          });
          await tx.order_VerificationAuditLog.create({
            data: {
              id: makeId('vau'),
              orderId: order.id,
              entryType: 'STATUS_TRANSITION',
              actorType: 'system',
              actorId: null,
              previousStatus: 'PENDING_SELLER_VERIFICATION',
              newStatus: 'VERIFICATION_OVERDUE',
              reason: `Verification deadline expired — ${Math.round(overdueByMs / 60_000)} minutes overdue`,
              timestamp: now,
            },
          });
        });

        // Notify admin — non-fatal per-order
        try {
          await this.eventPublisher.publish({
            type: 'order.verification_overdue',
            orderId: order.id,
            sellerId: order.sellerId,
            buyerId: order.buyerId,
            verificationDeadlineAt: order.verificationDeadlineAt,
            overdueByMs,
          });
        } catch (notifyErr: any) {
          logger.warn('[MarkOrdersOverdue] Notification event failed', { orderId: order.id, err: notifyErr.message });
        }

        processedCount++;
        logger.info('[MarkOrdersOverdue] Order transitioned to VERIFICATION_OVERDUE', { orderId: order.id });
      } catch (orderErr: any) {
        // One failing order must not stop others from being processed
        logger.error('[MarkOrdersOverdue] Failed to process order', { orderId: order.id, err: orderErr.message });
      }
    }

    return { processedCount };
  }
}
