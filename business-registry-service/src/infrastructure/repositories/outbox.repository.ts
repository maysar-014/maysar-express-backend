import { PrismaClient } from '@prisma/client';
import { logger } from '../services/logger.service';

export interface OutboxEventRecord {
  id: string;
  eventId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  status: string;
  createdAt: Date;
  processedAt?: Date | null;
  attempts: number;
  lastError?: string | null;
  nextRetryAt?: Date | null;
}

export interface IOutboxRepository {
  create(payload: {
    eventId: string;
    eventType: string;
    eventData: Record<string, unknown>;
  }, transaction?: any): Promise<OutboxEventRecord>;

  getPending(limit?: number): Promise<OutboxEventRecord[]>;

  markPublished(id: string): Promise<void>;

  markFailed(id: string, error: string): Promise<void>;

  incrementRetry(id: string, error: string, nextRetryAt?: Date): Promise<void>;
}

export class PrismaOutboxRepository implements IOutboxRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async create(payload: {
    eventId: string;
    eventType: string;
    eventData: Record<string, unknown>;
  }, transaction?: any): Promise<OutboxEventRecord> {
    const client = transaction || this.prisma;
    const record = await client.outboxEvent.create({
      data: {
        eventId: payload.eventId,
        eventType: payload.eventType,
        eventData: payload.eventData as object,
        status: 'PENDING',
        attempts: 0
      }
    });
    return this.mapToRecord(record);
  }

  async getPending(limit = 50): Promise<OutboxEventRecord[]> {
    const records = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: limit
    });
    return records.map(r => this.mapToRecord(r));
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'SENT',
        processedAt: new Date(),
        attempts: { increment: 1 }
      }
    });
    logger.debug('Outbox event marked as SENT', { outboxId: id });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'FAILED', lastError: error }
    });
  }

  async incrementRetry(id: string, error: string, nextRetryAt?: Date): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: error,
        nextRetryAt: nextRetryAt
      }
    });
  }

  private mapToRecord(data: any): OutboxEventRecord {
    return {
      id: data.id,
      eventId: data.eventId,
      eventType: data.eventType,
      eventData: data.eventData as Record<string, unknown>,
      status: data.status,
      createdAt: data.createdAt,
      processedAt: data.processedAt,
      attempts: data.attempts,
      lastError: data.lastError,
      nextRetryAt: data.nextRetryAt
    };
  }
}
