import prisma from '../database/prisma';
import { AnalyticsEvent } from '../../domain/entities/AnalyticsEvent.entity';

export class AnalyticsEventRepository {
    async save(event: AnalyticsEvent): Promise<void> {
        await prisma.analytics_Event.upsert({
            where: { id: event.id },
            update: {
                type: event.type,
                data: event.data,
                timestamp: event.timestamp,
                status: event.status,
                processedAt: event.processedAt ?? null,
                metadata: event.metadata ?? undefined
            },
            create: {
                id: event.id,
                type: event.type,
                data: event.data,
                timestamp: event.timestamp,
                status: event.status,
                processedAt: event.processedAt ?? null,
                metadata: event.metadata ?? undefined
            }
        });
    }

    async findById(id: string): Promise<AnalyticsEvent | null> {
        const record = await prisma.analytics_Event.findUnique({ where: { id } });
        if (!record) return null;

        return new AnalyticsEvent({
            id: record.id,
            type: record.type,
            data: record.data as Record<string, any>,
            timestamp: record.timestamp,
            status: record.status as any,
            processedAt: record.processedAt ?? undefined,
            metadata: record.metadata as Record<string, any> | undefined
        });
    }

    async findPending(): Promise<AnalyticsEvent[]> {
        const records = await prisma.analytics_Event.findMany({
            where: { status: 'pending' },
            orderBy: { timestamp: 'asc' }
        });

        return records.map(record => new AnalyticsEvent({
            id: record.id,
            type: record.type,
            data: record.data as Record<string, any>,
            timestamp: record.timestamp,
            status: record.status as any,
            processedAt: record.processedAt ?? undefined,
            metadata: record.metadata as Record<string, any> | undefined
        }));
    }

    async markProcessed(id: string): Promise<void> {
        await prisma.analytics_Event.updateMany({
            where: { id, status: { not: 'processed' } },
            data: { status: 'processed', processedAt: new Date() }
        });
    }
}
