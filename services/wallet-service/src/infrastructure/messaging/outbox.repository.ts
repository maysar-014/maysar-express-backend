
import { Prisma, PrismaClient } from '@prisma/client';

export interface OutboxEntry {
    eventId: string;
    eventType: string;
    eventData: Record<string, unknown>;
    status?: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
    occurredAt?: Date;
}

type OutboxStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';

interface PersistedOutboxEntry {
    id: string;
    eventId: string;
    eventType: string;
    eventData: Prisma.JsonValue;
    status: OutboxStatus;
    createdAt: Date;
    processedAt: Date | null;
}

export class OutboxRepository {
    constructor(private readonly prisma: PrismaClient) { }

    private toOutboxStatus(status: string): OutboxStatus {
        if (status === 'PENDING' || status === 'PROCESSING' || status === 'SENT' || status === 'FAILED') {
            return status;
        }
        return 'PENDING';
    }

    async save(entry: OutboxEntry): Promise<void> {
        try {
            await this.prisma.outboxEvent.create({
                data: {
                    eventId: entry.eventId,
                    eventType: entry.eventType,
                    eventData: entry.eventData as Prisma.InputJsonValue,
                    status: entry.status || 'PENDING',
                    createdAt: entry.occurredAt || new Date()
                }
            });
        } catch (error) {
            console.error('Failed to save to outbox:', error);
            console.log('Outbox Entry:', entry);
        }
    }

    async findUnprocessed(limit: number = 100): Promise<PersistedOutboxEntry[]> {
        try {
            const records = await this.prisma.outboxEvent.findMany({
                where: { status: 'PENDING' },
                take: limit,
                orderBy: { createdAt: 'asc' }
            });
            return records.map(record => ({
                ...record,
                status: this.toOutboxStatus(record.status)
            }));
        } catch (error) {
            return [];
        }
    }

    async markAsProcessed(id: string): Promise<void> {
        try {
            await this.prisma.outboxEvent.update({
                where: { id },
                data: {
                    status: 'SENT',
                    processedAt: new Date()
                }
            });
        } catch (error) {
            // Silently fail
        }
    }
}
