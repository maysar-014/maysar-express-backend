export interface SagaStep {
  name: string;
  action: () => Promise<void>;
  compensation?: () => Promise<void>;
  retryCount?: number;
  timeout?: number;
}

export interface SagaContext<T = any> {
  sagaId: string;
  data: T;
  startTime: Date;
  completedSteps: string[];
  failedSteps: string[];
  compensations: string[];
  status: 'running' | 'completed' | 'failed' | 'compensating';
}

export abstract class BaseSaga<T = any> {
  protected context: SagaContext<T> | null = null;
  protected steps: SagaStep[] = [];
  protected compensations: Map<string, () => Promise<void>> = new Map();

  abstract execute(context: SagaContext<T>): Promise<void>;

  async start(data: T, metadata: any = {}): Promise<string> {
    const sagaId = this.generateSagaId();

    this.context = {
      sagaId,
      data,
      startTime: new Date(),
      completedSteps: [],
      failedSteps: [],
      compensations: [],
      status: 'running'
    };

    try {
      await this.execute(this.context);
      this.context.status = 'completed';
      await this.publishEvent('SagaCompleted', {
        sagaId,
        completedAt: new Date(),
        metadata
      });
      return sagaId;
    } catch (error: any) {
      this.context.status = 'compensating';
      await this.compensate(error);
      this.context.status = 'failed';
      await this.publishEvent('SagaFailed', {
        sagaId,
        error: error.message,
        failedAt: new Date(),
        metadata
      });
      throw error;
    }
  }

  protected step(name: string, action: () => Promise<void>): void {
    this.steps.push({ name, action });
  }

  protected addCompensation(stepName: string, compensation: () => Promise<void>): void {
    this.compensations.set(stepName, compensation);
  }

  protected async executeStep(step: SagaStep): Promise<void> {
    if (!this.context) throw new Error('Saga context not initialized');

    try {
      await step.action();
      this.context.completedSteps.push(step.name);
      await this.publishEvent('SagaStepCompleted', {
        sagaId: this.context.sagaId,
        stepName: step.name,
        completedAt: new Date()
      });
    } catch (error: any) {
      this.context.failedSteps.push(step.name);
      await this.publishEvent('SagaStepFailed', {
        sagaId: this.context.sagaId,
        stepName: step.name,
        error: error.message,
        failedAt: new Date()
      });
      throw error;
    }
  }

  protected async compensate(originalError: Error): Promise<void> {
    if (!this.context) return;

    const compensationsToRun = this.context.completedSteps.reverse();

    for (const stepName of compensationsToRun) {
      try {
        const compensation = this.compensations.get(stepName);
        if (compensation) {
          await compensation();
          this.context.compensations.push(stepName);
          await this.publishEvent('SagaCompensationCompleted', {
            sagaId: this.context.sagaId,
            stepName,
            compensatedAt: new Date()
          });
        }
      } catch (compensationError: any) {
        await this.publishEvent('SagaCompensationFailed', {
          sagaId: this.context.sagaId,
          stepName,
          error: compensationError.message,
          failedAt: new Date()
        });
        // Log compensation failure but continue with other compensations
        console.error(`Compensation failed for step ${stepName}:`, compensationError);
      }
    }
  }

  protected async publishEvent(eventType: string, data: any): Promise<void> {
    // This will be implemented by the infrastructure layer
    // For now, just log the event
    console.log(`Saga Event: ${eventType}`, {
      sagaId: this.context?.sagaId,
      ...data
    });
  }

  private generateSagaId(): string {
    return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getContext(): SagaContext<T> | null {
    return this.context;
  }

  getStatus(): string {
    return this.context?.status || 'not_started';
  }
}
