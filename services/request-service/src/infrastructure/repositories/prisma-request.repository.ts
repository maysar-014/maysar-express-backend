/**
 * Prisma implementation of RequestRepository (Phase 1 §1.1).
 *
 * Thin mapper over Request_Request. The entity owns all invariants and
 * state-machine enforcement.
 */

import {
  RequestEntity,
  RequestData,
  RequestStatus,
} from '../../domain/entities/request.entity';
import { RequestRepository, RequestPage } from '../../domain/repositories/request.repository';

export class PrismaRequestRepository implements RequestRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(request: RequestEntity): Promise<void> {
    const data = request.toJSON();
    await this.prisma?.request_Request?.upsert?.({
      where: { id: data.id },
      create: this.rowFromData(data),
      update: this.rowFromData(data),
    });
  }

  async findById(id: string): Promise<RequestEntity | null> {
    const row = await this.prisma?.request_Request?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async findByCustomerId(
    customerId: string,
    opts?: { limit?: number; cursor?: string | null },
  ): Promise<RequestPage> {
    const limit = opts?.limit ?? 20;
    const rows = await this.prisma?.request_Request?.findMany?.({
      where: opts?.cursor
        ? { customerId, id: { lt: opts.cursor } }
        : { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    return this.toPage(rows ?? [], limit);
  }

  async findForProvider(
    providerId: string | null,
    opts?: { limit?: number; cursor?: string | null },
  ): Promise<RequestPage> {
    const limit = opts?.limit ?? 20;
    const baseWhere = providerId
      ? { OR: [{ assignedProviderId: providerId }, { assignedProviderId: null }] }
      : { assignedProviderId: null };
    const where = opts?.cursor
      ? { ...baseWhere, id: { lt: opts.cursor } }
      : baseWhere;
    const rows = await this.prisma?.request_Request?.findMany?.({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    return this.toPage(rows ?? [], limit);
  }

  async updateStatus(
    id: string,
    status: RequestStatus,
    extra?: {
      unfulfillableReason?: string | null;
      orderId?: string | null;
      convertedQuoteId?: string | null;
    },
  ): Promise<void> {
    await this.prisma?.request_Request?.update?.({
      where: { id },
      data: {
        status,
        unfulfillableReason: extra?.unfulfillableReason ?? undefined,
        orderId: extra?.orderId ?? undefined,
        convertedQuoteId: extra?.convertedQuoteId ?? undefined,
        updatedAt: new Date(),
      },
    });
  }

  async assignProvider(id: string, providerId: string): Promise<void> {
    await this.prisma?.request_Request?.update?.({
      where: { id },
      data: { assignedProviderId: providerId, updatedAt: new Date() },
    });
  }

  async listAll(opts?: { limit?: number }): Promise<RequestEntity[]> {
    const rows = await this.prisma?.request_Request?.findMany?.({
      orderBy: { createdAt: 'desc' },
      take: opts?.limit,
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  private toPage(rows: any[], limit: number): RequestPage {
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((r: any) => this.rowToEntity(r));
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: hasMore && last ? last.createdAt.toISOString() : null,
      hasMore,
    };
  }

  private rowFromData(data: RequestData): Record<string, unknown> {
    return {
      id: data.id,
      customerId: data.customerId,
      title: data.title,
      description: data.description,
      deliveryAddress: data.deliveryAddress,
      preferredDeliveryDate: data.preferredDeliveryDate,
      budgetTzs: data.budgetTzs,
      attachments: data.attachments,
      status: data.status,
      assignedProviderId: data.assignedProviderId,
      unfulfillableReason: data.unfulfillableReason,
      orderId: data.orderId,
      convertedQuoteId: data.convertedQuoteId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private rowToEntity(row: any): RequestEntity {
    return new RequestEntity({
      id: row.id,
      customerId: row.customerId,
      title: row.title,
      description: row.description,
      deliveryAddress: row.deliveryAddress,
      preferredDeliveryDate: row.preferredDeliveryDate,
      budgetTzs: row.budgetTzs,
      attachments: row.attachments,
      status: row.status,
      assignedProviderId: row.assignedProviderId,
      unfulfillableReason: row.unfulfillableReason,
      orderId: row.orderId,
      convertedQuoteId: row.convertedQuoteId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}