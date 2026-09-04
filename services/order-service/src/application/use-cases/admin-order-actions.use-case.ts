import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderStatus } from '../../domain/entities/order.entity';
import { VerificationStateMachine } from '../../domain/state-machine/verification-state-machine';
import { VerificationAuditLogRepository } from '../../domain/repositories/verification-audit-log.repository';
import { AuditEntryType } from '../../domain/entities/verification-audit-log.entity';
import { makeId } from '@shared/ids/id';
import { logger } from '../../infrastructure/monitoring/logger';

export type AdminAction = 'approve' | 'cancel' | 'placeUnderReview' | 'override';

export interface AdminOrderActionInput {
  orderId: string;
  adminId: string;
  action: AdminAction;
  /** Required for 'override'. Optional note for other actions. */
  reason?: string;
  notes?: string;
  /** Only for 'override' action — the target status to force. */
  targetStatus?: string;
}

export interface AdminOrderActionOutput {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  action: AdminAction;
}

const ACTION_TARGET_MAP: Record<Exclude<AdminAction, 'override'>, OrderStatus> = {
  approve: OrderStatus.SELLER_VERIFIED,
  cancel: OrderStatus.CANCELLED,
  placeUnderReview: OrderStatus.UNDER_ADMIN_REVIEW,
};

export class AdminOrderActionsUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly auditLogRepository: VerificationAuditLogRepository,
    private readonly eventPublisher: { publish(event: any): Promise<void> },
  ) {}

  async execute(input: AdminOrderActionInput): Promise<AdminOrderActionOutput> {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) {
      throw Object.assign(new Error(`Order ${input.orderId} not found`), { code: 'ORDER_NOT_FOUND', statusCode: 404 });
    }

    const currentStatus = String((order as any).status);

    // ── Override: admin force-sets any status ─────────────────────────────────
    if (input.action === 'override') {
      if (!input.reason || input.reason.trim().length === 0) {
        throw Object.assign(new Error('reason is required for admin override'), { code: 'VALIDATION_ERROR', statusCode: 422 });
      }
      if (!input.targetStatus) {
        throw Object.assign(new Error('targetStatus is required for admin override'), { code: 'VALIDATION_ERROR', statusCode: 422 });
      }
      return this.applyAction(input.orderId, currentStatus, input.targetStatus, input.adminId, 'ADMIN_OVERRIDE', input.reason, input.notes, input.action);
    }

    // ── Standard admin action ─────────────────────────────────────────────────
    const targetStatus = ACTION_TARGET_MAP[input.action as Exclude<AdminAction, 'override'>];
    if (!targetStatus) {
      throw Object.assign(new Error(`Unknown admin action: ${input.action}`), { code: 'VALIDATION_ERROR', statusCode: 422 });
    }

    const transition = VerificationStateMachine.canTransition(currentStatus as OrderStatus, targetStatus, 'admin');
    if (!transition.allowed) {
      throw Object.assign(new Error(transition.error ?? 'Invalid status transition'), {
        code: 'INVALID_STATUS_TRANSITION',
        statusCode: 422,
        allowedTransitions: transition.allowedTransitions,
      });
    }

    const reason = input.reason || `Admin action: ${input.action}`;
    return this.applyAction(input.orderId, currentStatus, targetStatus, input.adminId, 'ADMIN_ACTION', reason, input.notes, input.action);
  }

  private async applyAction(
    orderId: string,
    previousStatus: string,
    newStatus: string,
    adminId: string,
    entryType: AuditEntryType,
    reason: string,
    notes: string | undefined,
    action: AdminAction,
  ): Promise<AdminOrderActionOutput> {
    const now = new Date();
    const prisma = (globalThis as any).prisma;

    if (prisma) {
      const updateData: any = { status: newStatus.toUpperCase(), updatedAt: now };
      if (newStatus === OrderStatus.CANCELLED || newStatus === 'CANCELLED') {
        updateData.cancellationReason = reason;
        updateData.cancelledAt = now;
      }
      await prisma.$transaction(async (tx: any) => {
        await tx.order_Order.update({ where: { id: orderId }, data: updateData });
        await tx.order_VerificationAuditLog.create({
          data: {
            id: makeId('vau'),
            orderId,
            entryType,
            actorType: 'admin',
            actorId: adminId,
            previousStatus,
            newStatus: newStatus.toUpperCase(),
            reason,
            notes: notes ?? null,
            timestamp: now,
          },
        });
      });
    } else {
      const order = await (this.orderRepository as any).findById(orderId);
      if (order) {
        (order as any).status = newStatus;
        if (newStatus === 'CANCELLED') { (order as any).cancelReason = reason; }
        await this.orderRepository.update(order);
      }
      await this.auditLogRepository.append({
        id: makeId('vau'),
        orderId,
        entryType,
        actorType: 'admin',
        actorId: adminId,
        previousStatus,
        newStatus,
        reason,
        notes,
        timestamp: now,
      });
    }

    try {
      await this.eventPublisher.publish({ type: `order.admin.${action}`, orderId, adminId, previousStatus, newStatus, reason });
    } catch (err: any) {
      logger.warn('[AdminOrderActions] Event publish failed (non-fatal)', { orderId, err: err.message });
    }

    return { orderId, previousStatus, newStatus: newStatus.toUpperCase(), action };
  }
}
