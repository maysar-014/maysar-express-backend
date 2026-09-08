/**
 * Prisma implementation of RequestSupplierRepository (Phase 2 §2.2).
 * Suppliers are fulfillment sources only — never customer-facing.
 */

import { RequestSupplier } from '../../domain/entities/request-supplier.entity';
import { RequestSupplierRepository } from '../../domain/repositories/request-supplier.repository';

export class PrismaRequestSupplierRepository implements RequestSupplierRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(supplier: RequestSupplier): Promise<void> {
    const data = supplier.toJSON();
    await this.prisma?.request_Supplier?.upsert?.({
      where: { id: data.id },
      create: this.rowFromData(data),
      update: this.rowFromData(data),
    });
  }

  async findById(id: string): Promise<RequestSupplier | null> {
    const row = await this.prisma?.request_Supplier?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async list(filter?: { id?: string; isActive?: boolean }): Promise<RequestSupplier[]> {
    const where: Record<string, unknown> = {};
    if (filter?.id) where.id = filter.id;
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;
    const rows = await this.prisma?.request_Supplier?.findMany?.({
      where,
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async listDiscoveredByRequest(requestId: string): Promise<RequestSupplier[]> {
    const rows = await this.prisma?.request_Supplier?.findMany?.({
      where: { source: 'DISCOVERED', discoveredViaRequestId: requestId },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  private rowFromData(data: ReturnType<RequestSupplier['toJSON']>): Record<string, unknown> {
    return {
      id: data.id,
      name: data.name,
      contact: data.contact as unknown as Record<string, unknown>,
      source: data.source,
      discoveredViaRequestId: data.discoveredViaRequestId,
      isActive: data.isActive,
      inviteStatus: data.inviteStatus,
      notes: data.notes,
      createdAt: data.createdAt,
    };
  }

  private rowToEntity(row: any): RequestSupplier {
    return new RequestSupplier({
      id: row.id,
      name: row.name,
      contact: row.contact ?? {},
      source: row.source,
      discoveredViaRequestId: row.discoveredViaRequestId,
      isActive: row.isActive,
      inviteStatus: row.inviteStatus,
      notes: row.notes,
      createdAt: row.createdAt,
    });
  }
}