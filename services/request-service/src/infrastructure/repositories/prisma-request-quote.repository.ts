/**
 * Prisma implementation of RequestQuoteRepository (Phase 1 §1.4).
 * `save` upserts the full row; `updateStatus` only ever touches status
 * + publishedAt — there is no general update path on quotes (immutability).
 */

import { RequestQuote, QuoteStatus } from '../../domain/entities/request-quote.entity';
import { RequestQuoteRepository } from '../../domain/repositories/request-quote.repository';

export class PrismaRequestQuoteRepository implements RequestQuoteRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(quote: RequestQuote): Promise<void> {
    const data = quote.toJSON();
    await this.prisma?.request_Quote?.upsert?.({
      where: { id: data.id },
      create: this.rowFromData(data),
      update: this.rowFromData(data),
    });
  }

  async updateStatus(
    id: string,
    status: QuoteStatus,
    extra?: { publishedAt?: Date | null },
  ): Promise<void> {
    await this.prisma?.request_Quote?.update?.({
      where: { id },
      data: {
        status,
        publishedAt: extra?.publishedAt !== undefined ? (extra.publishedAt ?? null) : undefined,
      },
    });
  }

  async findById(id: string): Promise<RequestQuote | null> {
    const row = await this.prisma?.request_Quote?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async listByRequest(requestId: string): Promise<RequestQuote[]> {
    const rows = await this.prisma?.request_Quote?.findMany?.({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async listCustomerVisible(requestId: string): Promise<RequestQuote[]> {
    // Customer-visible = currently offered quotes only (PUBLISHED/ACCEPTED).
    // SUPERSEDED rows stay in the DB for audit/history but are never shown to
    // the customer again — supersession makes the old price unpurchasable.
    const rows = await this.prisma?.request_Quote?.findMany?.({
      where: { requestId, status: { in: ['PUBLISHED', 'ACCEPTED'] } },
      orderBy: { createdAt: 'desc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async listAll(opts?: { limit?: number }): Promise<RequestQuote[]> {
    const rows = await this.prisma?.request_Quote?.findMany?.({
      orderBy: { createdAt: 'desc' },
      take: opts?.limit,
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  private rowFromData(data: ReturnType<RequestQuote['toJSON']>): Record<string, unknown> {
    return {
      id: data.id,
      requestId: data.requestId,
      createdByProviderId: data.createdByProviderId,
      label: data.label,
      status: data.status,
      items: data.items as unknown as Record<string, unknown>[],
      procurementCostTzs: data.procurementCostTzs,
      logisticsCostTzs: data.logisticsCostTzs,
      sellingPriceTzs: data.sellingPriceTzs,
      deliveryDate: data.deliveryDate,
      warrantyNote: data.warrantyNote,
      explanation: data.explanation,
      validUntil: data.validUntil,
      publishedAt: data.publishedAt,
      createdAt: data.createdAt,
    };
  }

  private rowToEntity(row: any): RequestQuote {
    return new RequestQuote({
      id: row.id,
      requestId: row.requestId,
      createdByProviderId: row.createdByProviderId,
      label: row.label,
      status: row.status,
      items: row.items ?? [],
      procurementCostTzs: row.procurementCostTzs,
      logisticsCostTzs: row.logisticsCostTzs,
      sellingPriceTzs: row.sellingPriceTzs,
      deliveryDate: row.deliveryDate,
      warrantyNote: row.warrantyNote,
      explanation: row.explanation,
      validUntil: row.validUntil,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
    });
  }
}