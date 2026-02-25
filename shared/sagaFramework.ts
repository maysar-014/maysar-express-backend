export interface SagaContext<T = any> {
  sagaId: string;
  data: T;
}

export abstract class SagaStep {
  abstract execute(context: SagaContext): Promise<void>;
  abstract compensate(context: SagaContext): Promise<void>;
}

export abstract class Saga {
  protected steps: SagaStep[] = [];

  addStep(step: SagaStep): void {
    this.steps.push(step);
  }

  async start(data: any): Promise<string> {
    const sagaId = `saga-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const context: SagaContext = { sagaId, data };

    try {
      for (const step of this.steps) {
        await step.execute(context);
      }
      await this.execute(context);
      return sagaId;
    } catch (error) {
      // Compensate in reverse order
      for (let i = this.steps.length - 1; i >= 0; i--) {
        try {
          await this.steps[i].compensate(context);
        } catch (compensationError) {
          console.error('Compensation failed:', compensationError);
        }
      }
      throw error;
    }
  }

  abstract execute(context: SagaContext): Promise<void>;
}