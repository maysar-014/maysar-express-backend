/**
 * Prisma implementation of RequestAccessLinkRepository (Phase 1 §1.5).
 */

import {
  RequestAccessLink,
  AccessLinkStatus,
} from '../../domain/entities/request-access-link.entity';
import { RequestAccessLinkRepository } from '../../domain/repositories/request-access-link.repository';

export class PrismaRequestAccessLinkRepository implements RequestAccessLinkRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(link: RequestAccessLink): Promise<void> {
    const data = link.toJSON();
    await this.prisma?.request_AccessLink?.create?.({
      data: {
        id: data.id,
        requestId: data.requestId,
        quoteId: data.quoteId,
        customerId: data.customerId,
        tokenHash: data.tokenHash,
        status: data.status,
        expiresAt: data.expiresAt,
        usedAt: data.usedAt,
        createdAt: data.createdAt,
      },
    });
  }

  async updateStatus(
    id: string,
    status: AccessLinkStatus,
    extra?: { usedAt?: Date | null },
  ): Promise<void> {
    await this.prisma?.request_AccessLink?.update?.({
      where: { id },
      data: {
        status,
        usedAt: extra?.usedAt !== undefined ? (extra.usedAt ?? null) : undefined,
      },
    });
  }

  async findByHash(tokenHash: string): Promise<RequestAccessLink | null> {
    const row = await this.prisma?.request_AccessLink?.findUnique?.({ where: { tokenHash } });
    return row ? this.rowToEntity(row) : null;
  }

  async findById(id: string): Promise<RequestAccessLink | null> {
    const row = await this.prisma?.request_AccessLink?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async listByQuote(quoteId: string): Promise<RequestAccessLink[]> {
    const rows = await this.prisma?.request_AccessLink?.findMany?.({
      where: { quoteId },
      orderBy: { createdAt: 'desc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  private rowToEntity(row: any): RequestAccessLink {
    return new RequestAccessLink({
      id: row.id,
      requestId: row.requestId,
      quoteId: row.quoteId,
      customerId: row.customerId,
      tokenHash: row.tokenHash,
      status: row.status,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    });
  }
}