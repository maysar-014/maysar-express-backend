
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
            await this.prisma.payment_OutboxEvent.create({
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

    /**
     * Compatibility method for DistributedSagaOrchestrator
     */
    async saveEvent<T>(envelope: any, transaction?: any): Promise<void> {
        const entry: OutboxEntry = {
            eventId: envelope.metadata?.requestId || envelope.eventId || new Date().toISOString(), // Fallback ID
            eventType: envelope.eventType,
            eventData: envelope.data,
            occurredAt: new Date(),
            status: 'PENDING'
        };

        const prisma = transaction || this.prisma;

        try {
            await prisma.payment_OutboxEvent.create({
                data: {
                    eventId: entry.eventId,
                    eventType: entry.eventType,
                    eventData: entry.eventData,
                    status: entry.status,
                    createdAt: entry.occurredAt
                }
            });
        } catch (error) {
            console.error('Failed to save event via saveEvent adapter:', error);
            throw error;
        }
    }

    async findUnprocessed(limit: number = 100): Promise<any[]> {
        try {
            return await this.prisma.payment_OutboxEvent.findMany({
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
            await this.prisma.payment_OutboxEvent.update({
                where: { id },
                data: {
                    status: 'SENT',
                    processedAt: new Date()
                }
            });
        } catch (error) { }
    }
}
