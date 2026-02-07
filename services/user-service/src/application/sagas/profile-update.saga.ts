import { UserProfileUpdatedEvent } from '../../domain/events';
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { notificationClient, auditClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';
import { v4 as uuidv4 } from 'uuid';

export interface ProfileUpdateContext {
  event: UserProfileUpdatedEvent;
  metadata: {
    correlationId: string;
    userId: string;
    timestamp: Date;
  };
}

export class ProfileUpdateSaga extends DistributedSagaOrchestrator<ProfileUpdateContext> {
  protected sagaType = 'ProfileUpdateSaga';

  constructor() {
    super(sagaLogRepository, 'user-service');
  }

  protected async onStart(sagaId: string, payload: ProfileUpdateContext, correlationId?: string): Promise<void> {
    logger.info(`Starting ProfileUpdateSaga for user ${payload.metadata.userId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating ProfileUpdateSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<ProfileUpdateContext>[] {
    return [
      {
        name: 'RecordAuditTrail',
        execute: async (context, sagaId) => {
          await auditClient.recordEvent(context.event.aggregateId, 'profile_updated', {
            changes: context.event.changes,
            oldValues: context.event.oldValues,
            newValues: context.event.newValues,
            updatedBy: context.event.updatedBy
          });
        },
        compensate: async (context, sagaId) => {
          await auditClient.recordEvent(context.event.aggregateId, 'profile_update_compensated', {
            originalEventId: context.event.eventId
          });
        }
      },
      {
        name: 'SyncPreferences',
        execute: async (context, sagaId) => {
          if (context.event.changes.includes('preferences')) {
            // Sync with preference service
            logger.info('Syncing preferences', { userId: context.metadata.userId, sagaId });
          }
        },
        compensate: async (context, sagaId) => {
          // Revert preference sync
        }
      },
      {
        name: 'NotifyProfileUpdate',
        execute: async (context, sagaId) => {
          await notificationClient.sendEmail(context.event.aggregateId, 'profile_updated', {
            changes: context.event.changes,
            timestamp: new Date().toISOString()
          });
        },
        compensate: async (context, sagaId) => {
          // Notification cannot be unsent, but log compensation
        }
      }
    ];
  }
}

export async function executeProfileUpdateSaga(event: UserProfileUpdatedEvent): Promise<void> {
  const saga = new ProfileUpdateSaga();
  const correlationId = event.metadata?.correlationId || uuidv4();
  const context: ProfileUpdateContext = {
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
    logger.error('Profile update saga failed to start', {
      error: error instanceof Error ? error.message : String(error),
      userId: event.aggregateId,
      correlationId
    });
    throw error;
  }
}
