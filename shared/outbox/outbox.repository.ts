import { PrismaClient } from '@prisma/client';
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

export interface IOutboxRepository {
    save(entry: Partial<OutboxEntry>, transaction?: any): Promise<void>;
    update(eventId: string, updates: Partial<OutboxEntry>): Promise<void>;
    getPending(limit?: number): Promise<OutboxEntry[]>;
}

export class PrismaOutboxRepository implements IOutboxRepository {
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

    async save(entry: Partial<OutboxEntry>, transaction?: any): Promise<void> {
        const client = transaction || this.prisma;
        const model = (client as any)[this.modelName];

        await model.create({
            data: {
                id: entry.id || uuidv4(),
                eventId: entry.eventId!,
                eventType: entry.eventType!,
                eventData: entry.eventData,
                status: entry.status || OutboxStatus.PENDING,
                attempts: 0,
                createdAt: new Date()
            }
        });
    }

    async update(eventId: string, updates: Partial<OutboxEntry>): Promise<void> {
        await this.model.update({
            where: { eventId },
            data: {
                status: updates.status,
                processedAt: updates.processedAt,
                attempts: updates.attempts !== undefined ? { increment: 1 } : undefined,
                lastError: updates.lastError,
                nextRetryAt: updates.nextRetryAt
            }
        });
    }

    async getPending(limit = 100): Promise<OutboxEntry[]> {
        return this.model.findMany({
            where: {
                status: OutboxStatus.PENDING,
                OR: [
                    { nextRetryAt: null },
                    { nextRetryAt: { lte: new Date() } }
                ]
            },
            orderBy: { createdAt: 'asc' },
            take: limit
        }) as unknown as OutboxEntry[];
    }
}
