import { ISagaLogRepository, SagaLogEntry, SagaStatus, SagaStepLog } from './saga.log';
import { Prisma, PrismaClient } from '@prisma/client';
import type { PrismaTransaction } from '../types';

interface SagaLogRecord {
    sagaId: string;
    sagaType: string;
    status: SagaStatus;
    currentStep: string;
    payload: Prisma.JsonValue;
    context: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    error: string | null;
}

interface SagaStepRecord {
    id: string;
    sagaId: string;
    stepName: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    error: string | null;
}

export class PrismaSagaLogRepository implements ISagaLogRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(entry: SagaLogEntry, transaction?: PrismaClient | PrismaTransaction): Promise<void> {
        const client = transaction || this.prisma;
        await client.sagaLog.create({
            data: {
                sagaId: entry.sagaId,
                sagaType: entry.sagaType,
                status: entry.status,
                currentStep: entry.currentStep,
                payload: this.toJson(entry.payload),
                context: this.toJson(entry.context),
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt
            }
        });
    }

    async update(
        sagaId: string,
        updates: Partial<SagaLogEntry>,
        transaction?: PrismaClient | PrismaTransaction
    ): Promise<void> {
        const client = transaction || this.prisma;
        const updateData: Prisma.SagaLogUpdateInput = {
            updatedAt: new Date()
        };

        if (updates.sagaType !== undefined) {
            updateData.sagaType = updates.sagaType;
        }
        if (updates.status !== undefined) {
            updateData.status = updates.status;
        }
        if (updates.currentStep !== undefined) {
            updateData.currentStep = updates.currentStep;
        }
        if (updates.payload !== undefined) {
            updateData.payload = this.toJson(updates.payload);
        }
        if (updates.context !== undefined) {
            updateData.context = this.toJson(updates.context);
        }
        if (updates.error !== undefined) {
            updateData.error = updates.error;
        }

        await client.sagaLog.update({
            where: { sagaId },
            data: updateData
        });
    }

    async getById(sagaId: string): Promise<SagaLogEntry | null> {
        const record = await this.prisma.sagaLog.findUnique({
            where: { sagaId }
        });

        return record ? this.toSagaLogEntry(record as SagaLogRecord) : null;
    }

    async saveStep(step: SagaStepLog, transaction?: PrismaClient | PrismaTransaction): Promise<void> {
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

    async updateStep(
        stepId: string,
        updates: Partial<SagaStepLog>,
        transaction?: PrismaClient | PrismaTransaction
    ): Promise<void> {
        const client = transaction || this.prisma;
        await client.sagaStepLog.update({
            where: { id: stepId },
            data: updates
        });
    }

    async getSteps(sagaId: string): Promise<SagaStepLog[]> {
        const records = await this.prisma.sagaStepLog.findMany({
            where: { sagaId },
            orderBy: { startedAt: 'asc' }
        });

        return records.map(record => this.toSagaStepLog(record as SagaStepRecord));
    }

    async findStuck(statuses: SagaStatus[], olderThanMs: number, sagaTypes?: string[]): Promise<SagaLogEntry[]> {
        if (Array.isArray(sagaTypes) && sagaTypes.length === 0) {
            return [];
        }

        const cutoff = new Date(Date.now() - olderThanMs);
        const where: Prisma.SagaLogWhereInput = {
            status: { in: statuses },
            updatedAt: { lt: cutoff }
        };

        if (Array.isArray(sagaTypes) && sagaTypes.length > 0) {
            where.sagaType = { in: sagaTypes };
        }

        const records = await this.prisma.sagaLog.findMany({
            where,
            orderBy: { updatedAt: 'asc' }
        });

        return records.map(record => this.toSagaLogEntry(record as SagaLogRecord));
    }

    private toSagaLogEntry(record: SagaLogRecord): SagaLogEntry {
        return {
            sagaId: record.sagaId,
            sagaType: record.sagaType,
            status: record.status,
            currentStep: record.currentStep,
            payload: record.payload,
            context: record.context,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            error: record.error || undefined
        };
    }

    private toSagaStepLog(record: SagaStepRecord): SagaStepLog {
        return {
            id: record.id,
            sagaId: record.sagaId,
            stepName: record.stepName,
            status: record.status as SagaStepLog['status'],
            startedAt: record.startedAt,
            completedAt: record.completedAt || undefined,
            error: record.error || undefined
        };
    }

    private toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
        if (value === null) {
            return Prisma.JsonNull;
        }

        return value as Prisma.InputJsonValue;
    }
}
