/**
 * Prisma implementation of RequestMessageRepository (Phase 1 §1.2).
 * Append-only: addMessage creates a row; there is no update/delete.
 */

import { RequestMessage } from '../../domain/entities/request-message.entity';
import { RequestMessageRepository } from '../../domain/repositories/request-message.repository';

export class PrismaRequestMessageRepository implements RequestMessageRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async addMessage(message: RequestMessage): Promise<void> {
    const data = message.toJSON();
    await this.prisma?.request_Message?.create?.({
      data: {
        id: data.id,
        requestId: data.requestId,
        authorType: data.authorType,
        authorId: data.authorId,
        body: data.body,
        attachments: data.attachments,
        createdAt: data.createdAt,
      },
    });
  }

  async listByRequest(
    requestId: string,
    opts?: { limit?: number; cursor?: string | null },
  ): Promise<RequestMessage[]> {
    const limit = opts?.limit ?? 50;
    const rows = await this.prisma?.request_Message?.findMany?.({
      where: opts?.cursor
        ? { requestId, id: { gt: opts.cursor } }
        : { requestId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  private rowToEntity(row: any): RequestMessage {
    return new RequestMessage({
      id: row.id,
      requestId: row.requestId,
      authorType: row.authorType,
      authorId: row.authorId,
      body: row.body,
      attachments: row.attachments,
      createdAt: row.createdAt,
    });
  }
}