import { UserPasswordChangedEvent } from '../../domain/events';
import { logger } from '../../infrastructure/services/logger.service';

export interface PasswordResetSagaStep {
  name: string;
  execute: () => Promise<void>;
  compensate: () => Promise<void>;
}

export class PasswordResetSaga {
  private steps: PasswordResetSagaStep[] = [];

  addStep(step: PasswordResetSagaStep): void {
    this.steps.push(step);
  }

  async execute(): Promise<void> {
    const executedSteps: PasswordResetSagaStep[] = [];

    try {
      for (const step of this.steps) {
        await step.execute();
        executedSteps.push(step);
        logger.info(`Password reset saga step completed: ${step.name}`);
      }
    } catch (error) {
      logger.error(`Password reset saga step failed: ${error}`, { error });
      await this.compensate(executedSteps);
      throw error;
    }
  }

  private async compensate(executedSteps: PasswordResetSagaStep[]): Promise<void> {
    for (let i = executedSteps.length - 1; i >= 0; i--) {
      const step = executedSteps[i];
      if (!step) continue;
      try {
        await step.compensate();
        logger.info(`Password reset saga compensation completed: ${step.name}`);
      } catch (compensationError) {
        logger.error(`Password reset saga compensation failed: ${compensationError}`, { error: compensationError });
      }
    }
  }
}

export async function executePasswordResetSaga(event: UserPasswordChangedEvent): Promise<void> {
  const saga = new PasswordResetSaga();

  saga.addStep({
    name: 'InvalidateActiveSessions',
    execute: async () => {
      logger.info('Invalidating active sessions', { userId: event.aggregateId });
    },
    compensate: async () => {
      logger.info('Compensating: Restoring sessions', { userId: event.aggregateId });
    }
  });

  saga.addStep({
    name: 'SendPasswordChangeNotification',
    execute: async () => {
      logger.info('Sending password change notification', { userId: event.aggregateId });
    },
    compensate: async () => {
      logger.info('Compensating: Removing notification', { userId: event.aggregateId });
    }
  });

  await saga.execute();
}
