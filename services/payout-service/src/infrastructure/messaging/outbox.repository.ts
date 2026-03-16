
import { PrismaClient } from '@prisma/client';

export interface OutboxEntry {
    eventId: string;
    eventType: string;
    eventData: any;
    status?: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
    occurredAt?: Date;
}

export class OutboxRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(entry: OutboxEntry): Promise<void> {
        try {
            await this.prisma.payoutOutboxEvent.create({
                data: {
                    eventId: entry.eventId,
                    eventType: entry.eventType,
                    eventData: entry.eventData,
                    status: entry.status || 'PENDING',
                    createdAt: entry.occurredAt || new Date()
                }
            });
        } catch (error) {
            console.error('Failed to save to outbox:', error);
            console.log('Outbox Entry:', entry);
        }
    }

    async findUnprocessed(limit: number = 100): Promise<any[]> {
        try {
            return await this.prisma.payoutOutboxEvent.findMany({
                where: { status: 'PENDING' },
                take: limit,
                orderBy: { createdAt: 'asc' }
            });
        } catch (error) {
            return [];
        }
    }

    async markAsProcessed(id: string): Promise<void> {
        try {
            await this.prisma.payoutOutboxEvent.update({
                where: { id },
                data: {
                    status: 'SENT',
                    processedAt: new Date()
                }
            });
        } catch (error) { }
    }
}
