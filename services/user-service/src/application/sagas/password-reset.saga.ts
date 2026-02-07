import { UserPasswordChangedEvent } from '../../domain/events';
import { logger } from '../../infrastructure/services/logger.service';
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { v4 as uuidv4 } from 'uuid';

export interface PasswordResetContext {
  event: UserPasswordChangedEvent;
  metadata: {
    correlationId: string;
    userId: string;
    timestamp: Date;
  };
}

export class PasswordResetSaga extends DistributedSagaOrchestrator<PasswordResetContext> {
  protected sagaType = 'PasswordResetSaga';

  constructor() {
    super(sagaLogRepository, 'user-service');
  }

  protected async onStart(sagaId: string, payload: PasswordResetContext, correlationId?: string): Promise<void> {
    logger.info(`Starting PasswordResetSaga for user ${payload.metadata.userId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating PasswordResetSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<PasswordResetContext>[] {
    return [
      {
        name: 'InvalidateActiveSessions',
        execute: async (context, sagaId) => {
          logger.info('Invalidating active sessions', { userId: context.metadata.userId, sagaId });
        },
        compensate: async (context, sagaId) => {
          logger.info('Compensating: Restoring sessions', { userId: context.metadata.userId, sagaId });
        }
      },
      {
        name: 'SendPasswordChangeNotification',
        execute: async (context, sagaId) => {
          logger.info('Sending password change notification', { userId: context.metadata.userId, sagaId });
        },
        compensate: async (context, sagaId) => {
          logger.info('Compensating: Removing notification', { userId: context.metadata.userId, sagaId });
        }
      }
    ];
  }
}

export async function executePasswordResetSaga(event: UserPasswordChangedEvent): Promise<void> {
  const saga = new PasswordResetSaga();
  const correlationId = event.metadata?.correlationId || uuidv4();
  const context: PasswordResetContext = {
    event,
    metadata: {
      correlationId,
      userId: event.aggregateId,
      timestamp: new Date()
    }
  };

  try {
    await saga.start(context, correlationId);
  } catch (error) {
    logger.error('Password reset saga failed to start', {
      error: error instanceof Error ? error.message : String(error),
      userId: event.aggregateId,
      correlationId
    });
    throw error;
  }
}
