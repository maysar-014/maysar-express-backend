/**
 * Prisma implementation of RequestSourceRepository (Phase 2 §2.2).
 */

import { RequestSource, SourceAvailability } from '../../domain/entities/request-source.entity';
import { RequestSourceRepository } from '../../domain/repositories/request-source.repository';

export class PrismaRequestSourceRepository implements RequestSourceRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(source: RequestSource): Promise<void> {
    const data = source.toJSON();
    await this.prisma?.request_Source?.upsert?.({
      where: { id: data.id },
      create: this.rowFromData(data),
      update: this.rowFromData(data),
    });
  }

  async findById(id: string): Promise<RequestSource | null> {
    const row = await this.prisma?.request_Source?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async findByItemId(itemId: string): Promise<RequestSource[]> {
    const rows = await this.prisma?.request_Source?.findMany?.({
      where: { itemId },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async listBySupplierId(supplierId: string): Promise<RequestSource[]> {
    const rows = await this.prisma?.request_Source?.findMany?.({
      where: { supplierId },
      orderBy: { createdAt: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async updateAvailability(id: string, availability: SourceAvailability, availableUntil?: Date | null): Promise<void> {
    await this.prisma?.request_Source?.update?.({
      where: { id },
      data: {
        availability,
        availableUntil: availableUntil !== undefined ? (availableUntil ?? null) : undefined,
      },
    });
  }

  private rowFromData(data: ReturnType<RequestSource['toJSON']>): Record<string, unknown> {
    return {
      id: data.id,
      itemId: data.itemId,
      supplierId: data.supplierId,
      agreedPriceTzs: data.agreedPriceTzs,
      availability: data.availability,
      availableUntil: data.availableUntil,
      notes: data.notes,
      createdAt: data.createdAt,
    };
  }

  private rowToEntity(row: any): RequestSource {
    return new RequestSource({
      id: row.id,
      itemId: row.itemId,
      supplierId: row.supplierId,
      agreedPriceTzs: row.agreedPriceTzs,
      availability: row.availability,
      availableUntil: row.availableUntil,
      notes: row.notes,
      createdAt: row.createdAt,
    });
  }
}