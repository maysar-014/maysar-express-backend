export interface SagaContext<T = unknown> {
  sagaId: string;
  data: T;
}

export abstract class SagaStep<T = unknown> {
  abstract execute(context: SagaContext<T>): Promise<void>;
  abstract compensate(context: SagaContext<T>): Promise<void>;
}

export abstract class Saga<T = unknown> {
  protected steps: SagaStep<T>[] = [];

  addStep(step: SagaStep<T>): void {
    this.steps.push(step);
  }

  async start<TData extends T>(data: TData): Promise<string> {
    const sagaId = `saga-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const context: SagaContext<TData> = { sagaId, data };

    try {
      for (const step of this.steps as SagaStep<TData>[]) {
        await step.execute(context);
      }
      await this.execute(context);
      return sagaId;
    } catch (error) {
      // Compensate in reverse order
      for (let i = this.steps.length - 1; i >= 0; i--) {
        try {
          await (this.steps[i] as SagaStep<TData>).compensate(context);
        } catch (compensationError) {
          console.error('Compensation failed:', compensationError);
        }
      }
      throw error;
    }
  }

  abstract execute(context: SagaContext<T>): Promise<void>;
}
