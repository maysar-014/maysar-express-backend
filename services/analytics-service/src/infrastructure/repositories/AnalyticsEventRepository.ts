import prisma from '../database/prisma';
import { AnalyticsEvent, type EventStatus } from '../../domain/entities/AnalyticsEvent.entity';

type EventPayload = Record<string, unknown>;

export class AnalyticsEventRepository {
    private readonly useMemoryStore = process.env.NODE_ENV === 'test';
    private readonly memoryStore = new Map<string, AnalyticsEvent>();

    async save(event: AnalyticsEvent): Promise<void> {
        if (this.useMemoryStore) {
            this.memoryStore.set(event.id, event);
            return;
        }

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
        if (this.useMemoryStore) {
            return this.memoryStore.get(id) ?? null;
        }

        const record = await prisma.analytics_Event.findUnique({ where: { id } });
        if (!record) return null;

        return this.toDomainEvent(record);
    }

    async findPending(): Promise<AnalyticsEvent[]> {
        if (this.useMemoryStore) {
            return [...this.memoryStore.values()]
                .filter(event => event.status === 'pending')
                .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
        }

        const records = await prisma.analytics_Event.findMany({
            where: { status: 'pending' },
            orderBy: { timestamp: 'asc' }
        });

        return records.map(record => this.toDomainEvent(record));
    }

    async markProcessed(id: string): Promise<void> {
        if (this.useMemoryStore) {
            const current = this.memoryStore.get(id);
            if (!current || current.status === 'processed') {
                return;
            }

            this.memoryStore.set(id, current.markAsProcessed());
            return;
        }

        await prisma.analytics_Event.updateMany({
            where: { id, status: { not: 'processed' } },
            data: { status: 'processed', processedAt: new Date() }
        });
    }

    private toDomainEvent(record: {
        id: string;
        type: string;
        data: unknown;
        timestamp: Date;
        status: EventStatus | string;
        processedAt?: Date | null;
        metadata?: unknown;
    }): AnalyticsEvent {
        return new AnalyticsEvent({
            id: record.id,
            type: record.type,
            data: this.normalizeRecord(record.data),
            timestamp: record.timestamp,
            status: record.status as EventStatus,
            processedAt: record.processedAt ?? undefined,
            metadata: record.metadata ? this.normalizeRecord(record.metadata) : undefined
        });
    }

    private normalizeRecord(value: unknown): EventPayload {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }

        return { ...(value as EventPayload) };
    }
}
