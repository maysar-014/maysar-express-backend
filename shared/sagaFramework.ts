function generateId(): string {
  return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
import { eventBus } from './events/eventBus';

export interface SagaContext<T = any> {
  sagaId: string;
  data: T;
  metadata: any;
  currentStep: number;
  status: 'running' | 'completed' | 'failed' | 'compensating';
  createdAt: Date;
  updatedAt: Date;
}

export abstract class SagaStep {
  abstract execute(context: SagaContext): Promise<void>;
  abstract compensate(context: SagaContext): Promise<void>;

  protected async waitForEvent(eventType: string, filter: any, timeout: number = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);

      eventBus.subscribe(eventType, {
        name: `wait-${eventType}-${Date.now()}`,
        handler: async (envelope) => {
          const matches = Object.keys(filter).every(key => envelope.data[key] === filter[key]);
          if (matches) {
            clearTimeout(timeoutId);
            resolve(envelope.data);
          }
        }
      });
    });
  }
}

export abstract class Saga {
  protected steps: SagaStep[] = [];
  protected sagaName: string;

  constructor(sagaName: string) {
    this.sagaName = sagaName;
  }

  abstract execute(context: SagaContext): Promise<void>;

  protected async addStep(step: SagaStep): Promise<void> {
    this.steps.push(step);
  }

  async start<T>(data: T, metadata: any = {}): Promise<string> {
    const sagaId = generateId();
    const context: SagaContext<T> = {
      sagaId,
      data,
      metadata,
      currentStep: 0,
      status: 'running',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await eventBus.publish('SagaStarted.v1', {
        sagaId,
        sagaName: this.sagaName,
        data,
        metadata,
        startedAt: new Date()
      });

      await this.execute(context);
      await this.executeSteps(context);

      context.status = 'completed';
      await eventBus.publish('SagaCompleted.v1', {
        sagaId,
        sagaName: this.sagaName,
        completedAt: new Date()
      });

      return sagaId;
    } catch (error: any) {
      context.status = 'failed';
      await eventBus.publish('SagaFailed.v1', {
        sagaId,
        sagaName: this.sagaName,
        error: error.message,
        failedAt: new Date()
      });

      await this.compensate(context);
      throw error;
    }
  }

  private async executeSteps(context: SagaContext): Promise<void> {
    for (let i = 0; i < this.steps.length; i++) {
      context.currentStep = i;
      context.updatedAt = new Date();

      try {
        await eventBus.publish('SagaStepStarted.v1', {
          sagaId: context.sagaId,
          stepIndex: i,
          stepName: this.steps[i].constructor.name,
          startedAt: new Date()
        });

        await this.steps[i].execute(context);

        await eventBus.publish('SagaStepCompleted.v1', {
          sagaId: context.sagaId,
          stepIndex: i,
          stepName: this.steps[i].constructor.name,
          completedAt: new Date()
        });
      } catch (error: any) {
        await eventBus.publish('SagaStepFailed.v1', {
          sagaId: context.sagaId,
          stepIndex: i,
          stepName: this.steps[i].constructor.name,
          error: error.message,
          failedAt: new Date()
        });
        throw error;
      }
    }
  }

  private async compensate(context: SagaContext): Promise<void> {
    context.status = 'compensating';
    
    await eventBus.publish('SagaCompensationStarted.v1', {
      sagaId: context.sagaId,
      sagaName: this.sagaName,
      startedAt: new Date()
    });

    for (let i = context.currentStep; i >= 0; i--) {
      try {
        await eventBus.publish('SagaCompensationStepStarted.v1', {
          sagaId: context.sagaId,
          stepIndex: i,
          stepName: this.steps[i].constructor.name,
          startedAt: new Date()
        });

        await this.steps[i].compensate(context);

        await eventBus.publish('SagaCompensationStepCompleted.v1', {
          sagaId: context.sagaId,
          stepIndex: i,
          stepName: this.steps[i].constructor.name,
          completedAt: new Date()
        });
      } catch (compensationError: any) {
        await eventBus.publish('SagaCompensationStepFailed.v1', {
          sagaId: context.sagaId,
          stepIndex: i,
          stepName: this.steps[i].constructor.name,
          error: compensationError.message,
          failedAt: new Date()
        });
      }
    }

    await eventBus.publish('SagaCompensationCompleted.v1', {
      sagaId: context.sagaId,
      sagaName: this.sagaName,
      completedAt: new Date()
    });
  }
}

export class SagaOrchestrator {
  private sagas: Map<string, Saga> = new Map();

  registerSaga(name: string, saga: Saga): void {
    this.sagas.set(name, saga);
  }

  async executeSaga<T>(sagaName: string, data: T, metadata: any = {}): Promise<string> {
    const saga = this.sagas.get(sagaName);
    if (!saga) {
      throw new Error(`Saga not found: ${sagaName}`);
    }

    return await saga.start(data, metadata);
  }

  getSaga(name: string): Saga | undefined {
    return this.sagas.get(name);
  }

  listSagas(): string[] {
    return Array.from(this.sagas.keys());
  }
}

export const sagaOrchestrator = new SagaOrchestrator();