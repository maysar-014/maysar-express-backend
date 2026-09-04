import { VerificationAuditLogRepository } from '../../domain/repositories/verification-audit-log.repository';
import { VerificationAuditLogEntry } from '../../domain/entities/verification-audit-log.entity';
import { logger } from '../../infrastructure/monitoring/logger';

export interface PendingVerificationOrderDto {
  orderId: string;
  buyerId: string;
  sellerId: string;
  verificationDeadlineAt: string;
  timeRemainingSeconds: number;
  createdAt: string;
}

export interface OverdueOrderDto {
  orderId: string;
  buyerId: string;
  sellerId: string;
  verificationDeadlineAt: string;
  overdueBySeconds: number;
  createdAt: string;
}

export class AdminQueryUseCase {
  constructor(
    private readonly auditLogRepository: VerificationAuditLogRepository,
  ) {}

  async getPendingVerificationOrders(): Promise<PendingVerificationOrderDto[]> {
    const prisma = (globalThis as any).prisma;
    if (!prisma) return [];

    try {
      const rows = await prisma.order_Order.findMany({
        where: { status: 'PENDING_SELLER_VERIFICATION' },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          verificationDeadlineAt: true,
          createdAt: true,
        },
        orderBy: { verificationDeadlineAt: 'asc' },
      });

      const now = Date.now();
      return rows.map((row: any) => {
        const deadline = new Date(row.verificationDeadlineAt).getTime();
        return {
          orderId: row.id,
          buyerId: row.buyerId,
          sellerId: row.sellerId,
          verificationDeadlineAt: new Date(row.verificationDeadlineAt).toISOString(),
          timeRemainingSeconds: Math.max(0, Math.round((deadline - now) / 1000)),
          createdAt: new Date(row.createdAt).toISOString(),
        };
      });
    } catch (err: any) {
      logger.warn('[AdminQuery] getPendingVerificationOrders failed', { err: err.message });
      return [];
    }
  }

  async getOverdueOrders(): Promise<OverdueOrderDto[]> {
    const prisma = (globalThis as any).prisma;
    if (!prisma) return [];

    try {
      const rows = await prisma.order_Order.findMany({
        where: { status: 'VERIFICATION_OVERDUE' },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          verificationDeadlineAt: true,
          createdAt: true,
        },
        orderBy: { verificationDeadlineAt: 'asc' },
      });

      const now = Date.now();
      return rows.map((row: any) => {
        const deadline = new Date(row.verificationDeadlineAt).getTime();
        return {
          orderId: row.id,
          buyerId: row.buyerId,
          sellerId: row.sellerId,
          verificationDeadlineAt: new Date(row.verificationDeadlineAt).toISOString(),
          overdueBySeconds: Math.max(0, Math.round((now - deadline) / 1000)),
          createdAt: new Date(row.createdAt).toISOString(),
        };
      });
    } catch (err: any) {
      logger.warn('[AdminQuery] getOverdueOrders failed', { err: err.message });
      return [];
    }
  }

  async getOrderHistory(orderId: string): Promise<VerificationAuditLogEntry[]> {
    return this.auditLogRepository.findByOrderId(orderId);
  }
}
