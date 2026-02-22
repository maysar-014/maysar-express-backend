export { DistributedSagaOrchestrator as BaseSaga, SagaStep } from '@shared/saga/saga.orchestrator';

export interface SagaCompensationRecord {
  sagaId: string;
  stepName: string;
  compensatedAt: Date;
  success: boolean;
  error?: string;
}
