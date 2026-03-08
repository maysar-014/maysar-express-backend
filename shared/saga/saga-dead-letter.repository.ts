import { Prisma, PrismaClient } from '@prisma/client';

export interface SagaDeadLetterEntry {
    id?: string;
    sagaId: string;
    sagaType: string;
    payload: unknown;
    lastError: string;
    failedAt?: Date;
    reason: string;
}

export interface ISagaDeadLetterRepository {
    save(entry: SagaDeadLetterEntry): Promise<void>;
}

export class PrismaSagaDeadLetterRepository implements ISagaDeadLetterRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async save(entry: SagaDeadLetterEntry): Promise<void> {
        await this.prisma.sagaDeadLetter.upsert({
            where: { sagaId: entry.sagaId },
            create: {
                sagaId: entry.sagaId,
                sagaType: entry.sagaType,
                payload: entry.payload as Prisma.InputJsonValue,
                lastError: entry.lastError,
                failedAt: entry.failedAt ?? new Date(),
                reason: entry.reason
            },
            update: {
                lastError: entry.lastError,
                failedAt: entry.failedAt ?? new Date(),
                reason: entry.reason
            }
        });
    }
}
