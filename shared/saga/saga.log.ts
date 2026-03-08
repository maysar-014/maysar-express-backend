import { PrismaClient } from '@prisma/client';
import type { PrismaTransaction } from '../types';

export enum SagaStatus {
    STARTED = 'STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    COMPENSATING = 'COMPENSATING',
    COMPENSATED = 'COMPENSATED'
}

export enum SagaStepStatus {
    PENDING = 'PENDING',
    STARTED = 'STARTED',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    COMPENSATED = 'COMPENSATED'
}

export interface SagaLogEntry {
    sagaId: string;
    sagaType: string;
    status: SagaStatus;
    currentStep: string;
    payload: unknown;
    context: unknown;
    createdAt: Date;
    updatedAt: Date;
    error?: string;
}

export interface SagaStepLog {
    id: string;
    sagaId: string;
    stepName: string;
    status: SagaStepStatus;
    startedAt: Date;
    completedAt?: Date;
    error?: string;
}

export interface ISagaLogRepository {
    save(entry: SagaLogEntry, transaction?: PrismaClient | PrismaTransaction): Promise<void>;
    update(sagaId: string, updates: Partial<SagaLogEntry>, transaction?: PrismaClient | PrismaTransaction): Promise<void>;
    getById(sagaId: string): Promise<SagaLogEntry | null>;

    saveStep(step: SagaStepLog, transaction?: PrismaClient | PrismaTransaction): Promise<void>;
    updateStep(stepId: string, updates: Partial<SagaStepLog>, transaction?: PrismaClient | PrismaTransaction): Promise<void>;
    getSteps(sagaId: string): Promise<SagaStepLog[]>;

    findStuck(statuses: SagaStatus[], olderThanMs: number): Promise<SagaLogEntry[]>;
}
