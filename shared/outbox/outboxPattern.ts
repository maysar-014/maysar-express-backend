import { PrismaClient } from '@prisma/client';
import { EventEnvelope } from '../events/eventBus';
import { v4 as uuidv4 } from 'uuid';

export enum OutboxStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED'
}

export interface OutboxEntry {
  id: string;
  eventId: string;
  eventType: string;
  eventData: any;
  status: OutboxStatus;
  createdAt: Date;
  processedAt?: Date | null;
  attempts: number;
  lastError?: string | null;
  nextRetryAt?: Date | null;
}

export class TransactionalOutbox {
  private model: any;

  constructor(
    private prisma: PrismaClient,
    private modelName: string = 'outboxEvent'
  ) {
    this.model = (this.prisma as any)[this.modelName];
    if (!this.model) {
      throw new Error(`Prisma model ${this.modelName} not found in client`);
    }
  }

  async saveEvent<T>(
    envelope: EventEnvelope<T>,
    transaction?: any
  ): Promise<void> {
    const prismaClient = transaction || this.prisma;
    const model = (prismaClient as any)[this.modelName];

    await model.create({
      data: {
        id: uuidv4(),
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        eventData: envelope,
        status: OutboxStatus.PENDING,
        attempts: 0,
        createdAt: new Date()
      }
    });
  }

  async getPendingEvents(limit = 100): Promise<OutboxEntry[]> {
    const results = await this.model.findMany({
      where: {
        status: OutboxStatus.PENDING,
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: limit
    });

    return results.map((record: any) => ({
      ...record,
      status: record.status as OutboxStatus,
      processedAt: record.processedAt ?? undefined,
      lastError: record.lastError ?? undefined,
      nextRetryAt: record.nextRetryAt ?? undefined
    }));
  }

  async markAsProcessing(eventId: string): Promise<void> {
    await this.model.update({
      where: { eventId },
      data: {
        status: OutboxStatus.PROCESSING,
        processedAt: new Date()
      }
    });
  }

  async markAsSent(eventId: string): Promise<void> {
    await this.model.update({
      where: { eventId },
      data: {
        status: OutboxStatus.SENT,
        processedAt: new Date()
      }
    });
  }

  async markAsFailed(eventId: string, error: string, nextRetryAt?: Date): Promise<void> {
    await this.model.update({
      where: { eventId },
      data: {
        attempts: { increment: 1 },
        lastError: error,
        nextRetryAt: nextRetryAt || null,
        processedAt: new Date()
      }
    });
  }

  async markAsDeadLetter(eventId: string, error: string): Promise<void> {
    await this.model.update({
      where: { eventId },
      data: {
        status: OutboxStatus.FAILED,
        attempts: { increment: 1 },
        lastError: error,
        processedAt: new Date(),
        nextRetryAt: null
      }
    });
  }

  async resetToRetry(eventId: string): Promise<void> {
    await this.model.update({
      where: { eventId },
      data: {
        status: OutboxStatus.PENDING,
        nextRetryAt: null
      }
    });
  }
}
