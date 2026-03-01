import { ISagaLogRepository, SagaLogEntry, SagaStatus, SagaStepLog } from './saga.log';

export class PrismaSagaLogRepository implements ISagaLogRepository {
    constructor(private readonly prisma: any) { }

    async save(entry: SagaLogEntry, transaction?: any): Promise<void> {
        const client = transaction || this.prisma;
        await client.sagaLog.create({
            data: {
                sagaId: entry.sagaId,
                sagaType: entry.sagaType,
                status: entry.status,
                currentStep: entry.currentStep,
                payload: entry.payload,
                context: entry.context,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt
            }
        });
    }

    async update(sagaId: string, updates: Partial<SagaLogEntry>, transaction?: any): Promise<void> {
        const client = transaction || this.prisma;
        await client.sagaLog.update({
            where: { sagaId },
            data: {
                ...updates,
                updatedAt: new Date()
            }
        });
    }

    async getById(sagaId: string): Promise<SagaLogEntry | null> {
        return this.prisma.sagaLog.findUnique({
            where: { sagaId }
        });
    }

    async saveStep(step: SagaStepLog, transaction?: any): Promise<void> {
        const client = transaction || this.prisma;
        await client.sagaStepLog.create({
            data: {
                id: step.id,
                sagaId: step.sagaId,
                stepName: step.stepName,
                status: step.status,
                startedAt: step.startedAt,
                completedAt: step.completedAt,
                error: step.error
            }
        });
    }

    async updateStep(stepId: string, updates: Partial<SagaStepLog>, transaction?: any): Promise<void> {
        const client = transaction || this.prisma;
        await client.sagaStepLog.update({
            where: { id: stepId },
            data: updates
        });
    }

    async getSteps(sagaId: string): Promise<SagaStepLog[]> {
        return this.prisma.sagaStepLog.findMany({
            where: { sagaId },
            orderBy: { startedAt: 'asc' }
        });
    }

    async findStuck(statuses: SagaStatus[], olderThanMs: number): Promise<SagaLogEntry[]> {
        const cutoff = new Date(Date.now() - olderThanMs);
        return this.prisma.sagaLog.findMany({
            where: {
                status: { in: statuses },
                updatedAt: { lt: cutoff }
            },
            orderBy: { updatedAt: 'asc' }
        });
    }
}
