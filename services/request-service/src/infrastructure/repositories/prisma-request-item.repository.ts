/**
 * Prisma implementation of RequestItemRepository (Phase 2 §2.1).
 */

import { RequestItem } from '../../domain/entities/request-item.entity';
import { RequestItemRepository } from '../../domain/repositories/request-item.repository';

export class PrismaRequestItemRepository implements RequestItemRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(item: RequestItem): Promise<void> {
    const data = item.toJSON();
    await this.prisma?.request_Item?.upsert?.({
      where: { id: data.id },
      create: this.rowFromData(data),
      update: this.rowFromData(data),
    });
  }

  async findById(id: string): Promise<RequestItem | null> {
    const row = await this.prisma?.request_Item?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async findByRequestId(requestId: string): Promise<RequestItem[]> {
    const rows = await this.prisma?.request_Item?.findMany?.({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async findByQuoteId(quoteId: string): Promise<RequestItem[]> {
    const rows = await this.prisma?.request_Item?.findMany?.({
      where: { quoteId },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  private rowFromData(data: ReturnType<RequestItem['toJSON']>): Record<string, unknown> {
    return {
      id: data.id,
      requestId: data.requestId,
      quoteId: data.quoteId,
      description: data.description,
      quantity: data.quantity,
      unitPriceTzs: data.unitPriceTzs,
      specifications: data.specifications as unknown as Record<string, unknown> | null,
      warranty: data.warranty,
      sourceType: data.sourceType,
      catalogProductId: data.catalogProductId,
      fulfillmentNote: data.fulfillmentNote,
      createdAt: data.createdAt,
    };
  }

  private rowToEntity(row: any): RequestItem {
    return new RequestItem({
      id: row.id,
      requestId: row.requestId,
      quoteId: row.quoteId,
      description: row.description,
      quantity: row.quantity,
      unitPriceTzs: row.unitPriceTzs,
      specifications: row.specifications ?? null,
      warranty: row.warranty,
      sourceType: row.sourceType,
      catalogProductId: row.catalogProductId,
      fulfillmentNote: row.fulfillmentNote,
      createdAt: row.createdAt,
    });
  }
}