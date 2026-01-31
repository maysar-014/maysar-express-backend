import { PrismaClient } from '@prisma/client';
import { logger } from '../services/logger.service';

export interface OutboxEventRecord {
  id: string;
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  createdAt: Date;
  publishedAt?: Date | null;
  retryCount: number;
  lastError?: string | null;
}

export interface IOutboxRepository {
  create(payload: {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    payload: Record<string, unknown>;
  }): Promise<OutboxEventRecord>;

  getPending(limit?: number): Promise<OutboxEventRecord[]>;

  markPublished(id: string): Promise<void>;

  markFailed(id: string, error: string): Promise<void>;

  incrementRetry(id: string, error: string): Promise<void>;
}

export class PrismaOutboxRepository implements IOutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(payload: {
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    payload: Record<string, unknown>;
  }): Promise<OutboxEventRecord> {
    const record = await this.prisma.outboxEvent.create({
      data: {
        eventId: payload.eventId,
        eventType: payload.eventType,
        aggregateId: payload.aggregateId,
        aggregateType: payload.aggregateType,
        payload: payload.payload as object,
        status: 'PENDING'
      }
    });
    return this.mapToRecord(record);
  }

  async getPending(limit = 50): Promise<OutboxEventRecord[]> {
    const records = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit
    });
    return records.map(r => this.mapToRecord(r));
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() }
    });
    logger.debug('Outbox event published', { outboxId: id });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'FAILED', lastError: error }
    });
  }

  async incrementRetry(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        lastError: error
      }
    });
  }

  private mapToRecord(data: {
    id: string;
    eventId: string;
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    payload: unknown;
    status: string;
    createdAt: Date;
    publishedAt: Date | null;
    retryCount: number;
    lastError: string | null;
  }): OutboxEventRecord {
    return {
      id: data.id,
      eventId: data.eventId,
      eventType: data.eventType,
      aggregateId: data.aggregateId,
      aggregateType: data.aggregateType,
      payload: data.payload as Record<string, unknown>,
      status: data.status as 'PENDING' | 'PUBLISHED' | 'FAILED',
      createdAt: data.createdAt,
      publishedAt: data.publishedAt ?? undefined,
      retryCount: data.retryCount,
      lastError: data.lastError ?? undefined
    };
  }
}
