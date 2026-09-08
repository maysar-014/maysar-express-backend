/**
 * Prisma implementation of RequestProcurementRepository (Phase 2 §2.3).
 */

import { RequestProcurement, ProcurementStatus } from '../../domain/entities/request-procurement.entity';
import { RequestProcurementRepository } from '../../domain/repositories/request-procurement.repository';

export class PrismaRequestProcurementRepository implements RequestProcurementRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(procurement: RequestProcurement): Promise<void> {
    const data = procurement.toJSON();
    await this.prisma?.request_Procurement?.upsert?.({
      where: { id: data.id },
      create: this.rowFromData(data),
      update: this.rowFromData(data),
    });
  }

  async findById(id: string): Promise<RequestProcurement | null> {
    const row = await this.prisma?.request_Procurement?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async findByOrderId(orderId: string): Promise<RequestProcurement[]> {
    const rows = await this.prisma?.request_Procurement?.findMany?.({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async updateStatus(
    id: string,
    status: ProcurementStatus,
    extra?: { orderedAt?: Date | null; receivedAt?: Date | null; notes?: string | null },
  ): Promise<void> {
    await this.prisma?.request_Procurement?.update?.({
      where: { id },
      data: {
        procurementStatus: status,
        orderedAt: extra?.orderedAt !== undefined ? (extra.orderedAt ?? null) : undefined,
        receivedAt: extra?.receivedAt !== undefined ? (extra.receivedAt ?? null) : undefined,
        notes: extra?.notes !== undefined ? (extra.notes ?? null) : undefined,
      },
    });
  }

  private rowFromData(data: ReturnType<RequestProcurement['toJSON']>): Record<string, unknown> {
    return {
      id: data.id,
      orderId: data.orderId,
      itemId: data.itemId,
      supplierId: data.supplierId,
      sourceId: data.sourceId,
      agreedPriceTzs: data.agreedPriceTzs,
      procurementStatus: data.procurementStatus,
      orderedAt: data.orderedAt,
      receivedAt: data.receivedAt,
      notes: data.notes,
      createdAt: data.createdAt,
    };
  }

  private rowToEntity(row: any): RequestProcurement {
    return new RequestProcurement({
      id: row.id,
      orderId: row.orderId,
      itemId: row.itemId,
      supplierId: row.supplierId,
      sourceId: row.sourceId,
      agreedPriceTzs: row.agreedPriceTzs,
      procurementStatus: row.procurementStatus,
      orderedAt: row.orderedAt,
      receivedAt: row.receivedAt,
      notes: row.notes,
      createdAt: row.createdAt,
    });
  }
}