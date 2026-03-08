export abstract class BaseSaga {
  abstract execute(...args: any[]): Promise<void>;
  abstract compensate(...args: any[]): Promise<void>;
}

export class SagaError extends Error {
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    this.name = 'SagaError';
  }
}

export interface SagaStepOptions {
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
}

export interface SagaStep<TContext = any> {
  name: string;
  execute(context: TContext): Promise<void>;
  compensate?(context: TContext): Promise<void>;
  options?: SagaStepOptions;
}

export interface SagaCompensationRecord {
  stepName: string;
  compensatedAt: Date;
  reason?: string;
}
