import { ICODDisputeRepository, CODDispute } from '../../application/use-cases/resolve-cod-dispute.use-case';
import { databaseManager } from '../../config/database.config';

interface CODDisputeDelegate {
  findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  findFirst?(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

interface CODDisputePrismaClient {
  order_CODDispute?: CODDisputeDelegate;
  orderCODDispute?: CODDisputeDelegate;
}

export class PrismaCODDisputeRepository implements ICODDisputeRepository {
  private prisma: CODDisputePrismaClient;

  constructor() {
    this.prisma = databaseManager.getPrisma() as unknown as CODDisputePrismaClient;
  }

  async findById(id: string): Promise<CODDispute | null> {
    try {
      let dispute = await this.delegate.findUnique({ where: { id } });
      if (!dispute && this.delegate.findFirst) {
        dispute = await this.delegate.findFirst({ where: { orderId: id } });
      }
      if (!dispute) {
        return null;
      }

      return {
        id: String(dispute.id),
        orderId: String(dispute.orderId),
        disputeType: String(dispute.disputeType),
        raisedBy: String(dispute.raisedBy),
        description: String(dispute.description),
        status: String(dispute.status) as CODDispute['status'],
        resolution: dispute.resolution ? String(dispute.resolution) : undefined,
        resolvedAt: dispute.resolvedAt ? new Date(String(dispute.resolvedAt)) : undefined,
      };
    } catch (error) {
      console.error('Error finding COD dispute:', error);
      return null;
    }
  }

  async save(dispute: CODDispute): Promise<void> {
    await this.delegate.create({
      data: {
        id: dispute.id,
        orderId: dispute.orderId,
        disputeType: dispute.disputeType,
        raisedBy: dispute.raisedBy,
        description: dispute.description,
        status: dispute.status,
        resolution: dispute.resolution,
        resolvedAt: dispute.resolvedAt,
      },
    });
  }

  async update(dispute: CODDispute): Promise<void> {
    await this.delegate.update({
      where: { id: dispute.id },
      data: {
        status: dispute.status,
        resolution: dispute.resolution,
        resolvedAt: dispute.resolvedAt,
      },
    });
  }

  private get delegate(): CODDisputeDelegate {
    const delegate = this.prisma.order_CODDispute ?? this.prisma.orderCODDispute;
    if (!delegate) {
      throw new Error('COD dispute delegate is not configured on prisma client');
    }
    return delegate;
  }
}
