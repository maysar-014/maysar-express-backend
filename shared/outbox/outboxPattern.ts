import { PrismaClient } from '@prisma/client';
import { EventEnvelope } from '../../events';
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
  processedAt?: Date;
  attempts: number;
  lastError?: string;
  nextRetryAt?: Date;
}

export class TransactionalOutbox {
  constructor(private prisma: PrismaClient) {}

  async saveEvent<T>(
    envelope: EventEnvelope<T>,
    transaction?: any
  ): Promise<void> {
    const prismaClient = transaction || this.prisma;
    
    await prismaClient.outboxEvent.create({
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
    return this.prisma.outboxEvent.findMany({
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
  }

  async markAsProcessing(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: { 
        status: OutboxStatus.PROCESSING,
        processedAt: new Date()
      }
    });
  }

  async markAsSent(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: { 
        status: OutboxStatus.SENT,
        processedAt: new Date()
      }
    });
  }

  async markAsFailed(eventId: string, error: string, nextRetryAt?: Date): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: {
        status: OutboxStatus.FAILED,
        attempts: { increment: 1 },
        lastError: error,
        nextRetryAt,
        processedAt: new Date()
      }
    });
  }

  async resetToRetry(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: {
        status: OutboxStatus.PENDING,
        nextRetryAt: null
      }
    });
  }
}