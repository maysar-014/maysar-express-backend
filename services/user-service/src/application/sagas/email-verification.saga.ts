import { UserEmailVerifiedEvent } from '../../domain/events';
import { logger } from '../../infrastructure/services/logger.service';

export interface EmailVerificationSagaStep {
  name: string;
  execute: () => Promise<void>;
  compensate: () => Promise<void>;
}

export class EmailVerificationSaga {
  private steps: EmailVerificationSagaStep[] = [];

  addStep(step: EmailVerificationSagaStep): void {
    this.steps.push(step);
  }

  async execute(): Promise<void> {
    const executedSteps: EmailVerificationSagaStep[] = [];

    try {
      for (const step of this.steps) {
        await step.execute();
        executedSteps.push(step);
        logger.info(`Email verification saga step completed: ${step.name}`);
      }
    } catch (error) {
      logger.error(`Email verification saga step failed: ${error}`, { error });
      await this.compensate(executedSteps);
      throw error;
    }
  }

  private async compensate(executedSteps: EmailVerificationSagaStep[]): Promise<void> {
    for (let i = executedSteps.length - 1; i >= 0; i--) {
      const step = executedSteps[i];
      if (!step) continue;
      try {
        await step.compensate();
        logger.info(`Email verification saga compensation completed: ${step.name}`);
      } catch (compensationError) {
        logger.error(`Email verification saga compensation failed: ${compensationError}`, { error: compensationError });
      }
    }
  }
}

export async function executeEmailVerificationSaga(event: UserEmailVerifiedEvent): Promise<void> {
  const saga = new EmailVerificationSaga();

  saga.addStep({
    name: 'UpdateUserStatus',
    execute: async () => {
      logger.info('Updating user status to verified', { userId: event.aggregateId });
    },
    compensate: async () => {
      logger.info('Compensating: Reverting user status', { userId: event.aggregateId });
    }
  });

  saga.addStep({
    name: 'SendConfirmationEmail',
    execute: async () => {
      logger.info('Sending confirmation email', { userId: event.aggregateId });
    },
    compensate: async () => {
      logger.info('Compensating: Removing confirmation email', { userId: event.aggregateId });
    }
  });

  await saga.execute();
}
