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
    payload: any;
    context: any;
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
    save(entry: SagaLogEntry, transaction?: any): Promise<void>;
    update(sagaId: string, updates: Partial<SagaLogEntry>, transaction?: any): Promise<void>;
    getById(sagaId: string): Promise<SagaLogEntry | null>;

    saveStep(step: SagaStepLog, transaction?: any): Promise<void>;
    updateStep(stepId: string, updates: Partial<SagaStepLog>, transaction?: any): Promise<void>;
    getSteps(sagaId: string): Promise<SagaStepLog[]>;
}
