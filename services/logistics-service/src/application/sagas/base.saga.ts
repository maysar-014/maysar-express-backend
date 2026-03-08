export type SagaStatus = 'not_started' | 'running' | 'completed' | 'failed';

export interface SagaContext<TData = unknown> {
  sagaId: string;
  data: TData;
  status: SagaStatus;
  startTime: Date;
  completedSteps: string[];
  failedSteps: string[];
  compensations: string[];
}

export interface SagaStep<TData = unknown> {
  name: string;
  execute: (context: SagaContext<TData>) => Promise<void>;
}

export abstract class BaseSaga<TData = unknown> {
  protected readonly steps: SagaStep<TData>[] = [];
  protected readonly compensations = new Map<string, (context: SagaContext<TData>) => Promise<void>>();
  protected context: SagaContext<TData> | null = null;
  private status: SagaStatus = 'not_started';

  protected async step(name: string, handler: (context: SagaContext<TData>) => Promise<void>): Promise<void> {
    const step: SagaStep<TData> = { name, execute: handler };

    if (!this.context) {
      this.steps.push(step);
      return;
    }

    await this.executeStep(step);
  }

  protected addCompensation(
    stepName: string,
    compensation: (context: SagaContext<TData>) => Promise<void>
  ): void {
    this.compensations.set(stepName, compensation);
  }

  protected async executeStep(step: SagaStep<TData>): Promise<void> {
    if (!this.context) {
      throw new Error('Saga context not initialized');
    }

    try {
      await step.execute(this.context);
      this.context.completedSteps.push(step.name);
      this.publishEvent('SagaStepCompleted', {
        sagaId: this.context.sagaId,
        stepName: step.name,
        completedAt: new Date()
      });
    } catch (error) {
      this.context.failedSteps.push(step.name);
      const message = error instanceof Error ? error.message : String(error);
      this.publishEvent('SagaStepFailed', {
        sagaId: this.context.sagaId,
        stepName: step.name,
        error: message,
        failedAt: new Date()
      });
      throw error;
    }
  }

  async start(data: TData): Promise<string> {
    const sagaId = `saga_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    this.context = {
      sagaId,
      data,
      status: 'running',
      startTime: new Date(),
      completedSteps: [],
      failedSteps: [],
      compensations: []
    };
    this.status = 'running';

    try {
      await this.execute(this.context);
      this.status = 'completed';
      this.context.status = 'completed';
      this.publishEvent('SagaCompleted', {
        sagaId: this.context.sagaId,
        completedAt: new Date(),
        metadata: {
          completedSteps: [...this.context.completedSteps]
        }
      });
      return sagaId;
    } catch (error) {
      this.status = 'failed';
      this.context.status = 'failed';
      await this.executeCompensations();

      const message = error instanceof Error ? error.message : String(error);
      this.publishEvent('SagaFailed', {
        sagaId: this.context.sagaId,
        error: message,
        failedAt: new Date(),
        metadata: {
          completedSteps: [...this.context.completedSteps],
          failedSteps: [...this.context.failedSteps]
        }
      });

      throw error;
    }
  }

  getStatus(): SagaStatus {
    return this.status;
  }

  getContext(): SagaContext<TData> | null {
    return this.context;
  }

  private async executeCompensations(): Promise<void> {
    if (!this.context) {
      return;
    }

    const completed = [...this.context.completedSteps].reverse();
    for (const stepName of completed) {
      const compensation = this.compensations.get(stepName);
      if (!compensation) {
        continue;
      }

      try {
        await compensation(this.context);
        this.context.compensations.push(stepName);
        this.publishEvent('SagaCompensationCompleted', {
          sagaId: this.context.sagaId,
          stepName,
          compensatedAt: new Date()
        });
      } catch (error) {
        console.error(`Compensation failed for step ${stepName}:`, error);
      }
    }
  }

  private publishEvent(eventType: string, payload: Record<string, unknown>): void {
    console.log(`Saga Event: ${eventType}`, payload);
  }

  abstract execute(context: SagaContext<TData>): Promise<void>;
}

