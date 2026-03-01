export interface SagaDeadLetterEntry {
    id?: string;
    sagaId: string;
    sagaType: string;
    payload: any;
    lastError: string;
    failedAt?: Date;
    reason: string;
}

export interface ISagaDeadLetterRepository {
    save(entry: SagaDeadLetterEntry): Promise<void>;
}

export class PrismaSagaDeadLetterRepository implements ISagaDeadLetterRepository {
    constructor(private readonly prisma: any) {}

    async save(entry: SagaDeadLetterEntry): Promise<void> {
        await this.prisma.sagaDeadLetter.upsert({
            where: { sagaId: entry.sagaId },
            create: {
                sagaId: entry.sagaId,
                sagaType: entry.sagaType,
                payload: entry.payload,
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
