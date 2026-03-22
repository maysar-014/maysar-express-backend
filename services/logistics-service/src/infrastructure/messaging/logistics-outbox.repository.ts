import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { IOutboxRepository, OutboxEvent, OutboxStatus } from '../../../../../shared/outbox/outbox.repository';
import { EventEnvelope } from '../../../../../shared/events/eventBus';
import type { PrismaTransaction } from '../../../../../shared/types';
import { getModelPrefix, makeId } from '@shared/ids/id';

export class LogisticsOutboxRepository implements IOutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(envelope: EventEnvelope, transaction?: PrismaClient | PrismaTransaction): Promise<void> {
    const client = (transaction || this.prisma) as PrismaClient;
    const eventId = envelope.eventId || (envelope.metadata?.eventId as string | undefined) || randomUUID();
    const eventType = envelope.eventType || envelope.type || envelope.event || 'unknown';
    const eventData = JSON.parse(JSON.stringify(envelope)) as Prisma.InputJsonValue;
    const createdAt = envelope.timestamp ? new Date(envelope.timestamp) : new Date();
    await client.logistics_OutboxEvent.create({
      data: {
        id: makeId(getModelPrefix('Logistics_OutboxEvent')),
        eventId,
        eventType,
        eventData,
        status: OutboxStatus.PENDING,
        createdAt,
        attempts: 0
      }
    });
  }

  async getPending(limit: number = 100): Promise<OutboxEvent[]> {
    const records = await this.prisma.logistics_OutboxEvent.findMany({
      where: {
        status: OutboxStatus.PENDING,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }]
      },
      orderBy: { createdAt: 'asc' },
      take: limit
    });

    return records.map(record => ({
      id: record.id,
      eventId: record.eventId,
      eventType: record.eventType,
      eventData: record.eventData,
      status: record.status,
      createdAt: record.createdAt,
      processedAt: record.processedAt || undefined,
      attempts: record.attempts,
      lastError: record.lastError || undefined,
      nextRetryAt: record.nextRetryAt || undefined
    }));
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.prisma.logistics_OutboxEvent.update({
      where: { eventId },
      data: {
        status: OutboxStatus.PROCESSED,
        processedAt: new Date()
      }
    });
  }
}
