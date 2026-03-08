import { PrismaClient } from '@prisma/client';
import { EventEnvelope } from '../events/eventBus';
import type { PrismaTransaction } from '../types';

export interface OutboxEvent {
  id: string;
  eventId: string;
  eventType: string;
  eventData: unknown;
  status: string;
  createdAt: Date;
  processedAt?: Date;
  attempts: number;
  lastError?: string;
  nextRetryAt?: Date;
}

export enum OutboxStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED'
}

export interface IOutboxRepository {
  save(envelope: EventEnvelope, transaction?: PrismaClient | PrismaTransaction): Promise<void>;
  getPending(limit?: number): Promise<OutboxEvent[]>;
  markProcessed(eventId: string): Promise<void>;
}

interface OutboxModelDelegate {
  create(args: { data: Record<string, unknown> }): Promise<OutboxRecord>;
  findMany(args: {
    where: Record<string, unknown>;
    orderBy: Record<string, 'asc' | 'desc'>;
    take: number;
  }): Promise<OutboxRecord[]>;
  update(args: { where: { eventId: string }; data: Record<string, unknown> }): Promise<OutboxRecord>;
}

interface OutboxRecord {
  id: string;
  eventId: string;
  eventType: string;
  eventData: unknown;
  status: string;
  createdAt: Date;
  processedAt: Date | null;
  attempts: number;
  lastError: string | null;
  nextRetryAt: Date | null;
}

export class OutboxRepository implements IOutboxRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly modelName: string = 'sharedOutboxEvent'
  ) {}

  async save(envelope: EventEnvelope, transaction?: PrismaClient | PrismaTransaction): Promise<void> {
    const model = this.getModel(transaction || this.prisma);
    await model.create({
      data: {
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        eventData: envelope,
        status: OutboxStatus.PENDING,
        createdAt: envelope.timestamp || new Date(),
        attempts: 0
      }
    });
  }

  async getPending(limit: number = 100): Promise<OutboxEvent[]> {
    const model = this.getModel();
    const records = await model.findMany({
      where: {
        status: OutboxStatus.PENDING,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }]
      },
      orderBy: { createdAt: 'asc' },
      take: limit
    });

    return records.map(record => this.toOutboxEvent(record));
  }

  async markProcessed(eventId: string): Promise<void> {
    const model = this.getModel();
    await model.update({
      where: { eventId },
      data: {
        status: OutboxStatus.PROCESSED,
        processedAt: new Date()
      }
    });
  }

  private getModel(client: PrismaClient | PrismaTransaction = this.prisma): OutboxModelDelegate {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dynamicClient = client as any;
    // Dynamic Prisma model lookup is intentional; Prisma does not expose model delegates generically by runtime name.
    const model = (dynamicClient[this.modelName] || dynamicClient.sharedOutboxEvent || dynamicClient.outboxEvent) as
      | OutboxModelDelegate
      | undefined;
    if (!model) {
      throw new Error(
        `Prisma outbox model "${this.modelName}" was not found. Expected ${this.modelName}, sharedOutboxEvent, or outboxEvent.`
      );
    }

    return model;
  }

  private toOutboxEvent(record: OutboxRecord): OutboxEvent {
    return {
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
    };
  }
}

export class PrismaOutboxRepository extends OutboxRepository {}
