import { PrismaClient } from '@prisma/client';
import { IEventStoreRepository } from '../../domain/repositories';
import { prisma } from '../database/prisma-client';

export class PrismaEventStoreRepository implements IEventStoreRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async saveEvent(event: {
    eventId: string;
    aggregateId: string;
    eventType: string;
    eventData: any;
    occurredAt: Date;
    eventVersion: number;
  }): Promise<void> {
    await this.prismaClient.commission_EventStore.create({
      data: {
        id: event.eventId,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        eventData: event.eventData,
        occurredAt: event.occurredAt,
        eventVersion: event.eventVersion,
        createdAt: new Date()
      }
    });
  }

  async getEventsForAggregate(aggregateId: string): Promise<Array<{
    eventId: string;
    eventType: string;
    eventData: any;
    occurredAt: Date;
    eventVersion: number;
  }>> {
    const rows = await this.prismaClient.commission_EventStore.findMany({
      where: { aggregateId },
      orderBy: { occurredAt: 'asc' }
    });

    return rows.map(row => ({
      eventId: row.id,
      eventType: row.eventType,
      eventData: row.eventData,
      occurredAt: row.occurredAt,
      eventVersion: row.eventVersion
    }));
  }

  async getAllEvents(eventTypes?: string[], dateFrom?: Date, dateTo?: Date): Promise<Array<{
    eventId: string;
    aggregateId: string;
    eventType: string;
    eventData: any;
    occurredAt: Date;
    eventVersion: number;
  }>> {
    const where: any = {};
    if (eventTypes && eventTypes.length > 0) {
      where.eventType = { in: eventTypes };
    }
    if (dateFrom || dateTo) {
      where.occurredAt = {};
      if (dateFrom) where.occurredAt.gte = dateFrom;
      if (dateTo) where.occurredAt.lte = dateTo;
    }

    const rows = await this.prismaClient.commission_EventStore.findMany({
      where,
      orderBy: { occurredAt: 'asc' }
    });

    return rows.map(row => ({
      eventId: row.id,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
      eventData: row.eventData,
      occurredAt: row.occurredAt,
      eventVersion: row.eventVersion
    }));
  }
}
