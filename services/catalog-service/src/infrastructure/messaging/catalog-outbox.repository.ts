import { Prisma, PrismaClient } from '@prisma/client';
import type { PrismaTransaction } from '../../../../../shared/types';

export interface CatalogOutboxEventPayload {
  eventId: string;
  eventType: string;
  eventData: unknown;
  status?: string;
}

export class CatalogOutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(payload: CatalogOutboxEventPayload, transaction?: PrismaClient | PrismaTransaction): Promise<void> {
    const client = (transaction || this.prisma) as PrismaClient;
    const eventData = JSON.parse(JSON.stringify(payload.eventData ?? null)) as Prisma.InputJsonValue;
    await client.catalogOutboxEvent.create({
      data: {
        eventId: payload.eventId,
        eventType: payload.eventType,
        eventData,
        status: payload.status || 'PENDING',
        createdAt: new Date(),
        attempts: 0
      }
    });
  }
}
