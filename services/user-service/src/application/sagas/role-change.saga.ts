import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { notificationClient, auditClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';
import { v4 as uuidv4 } from 'uuid';

export interface RoleChangeEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
  timestamp: Date;
  metadata?: { correlationId: string };
}

export class RoleChangeSaga extends DistributedSagaOrchestrator<RoleChangeEvent> {
  protected sagaType = 'RoleChangeSaga';

  constructor() {
    super(sagaLogRepository, 'user-service');
  }

  protected async onStart(sagaId: string, payload: RoleChangeEvent, correlationId?: string): Promise<void> {
    logger.info(`Starting RoleChangeSaga for user ${payload.userId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating RoleChangeSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<RoleChangeEvent>[] {
    return [
      {
        name: 'SyncPermissions',
        execute: async (payload, sagaId) => {
          logger.info('Syncing permissions for role change', { userId: payload.userId, newRole: payload.newRole, sagaId });
          // Sync with permission service
        },
        compensate: async (payload, sagaId) => {
          logger.info('Reverting permissions to old role', { userId: payload.userId, oldRole: payload.oldRole, sagaId });
          // Revert to old role permissions
        }
      },
      {
        name: 'UpdateAccessControl',
        execute: async (payload, sagaId) => {
          logger.info('Updating access control lists', { userId: payload.userId, newRole: payload.newRole, sagaId });
          // Update ACLs in all services
        },
        compensate: async (payload, sagaId) => {
          logger.info('Reverting access control lists', { userId: payload.userId, sagaId });
          // Revert ACLs
        }
      },
      {
        name: 'RecordAuditEvent',
        execute: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, 'role_changed', {
            oldRole: payload.oldRole,
            newRole: payload.newRole,
            changedBy: payload.changedBy
          });
        },
        compensate: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, 'role_change_compensated', {
            originalEventId: payload.eventId
          });
        }
      },
      {
        name: 'NotifyRoleChange',
        execute: async (payload, sagaId) => {
          await notificationClient.sendEmail(payload.userId, 'role_changed', {
            oldRole: payload.oldRole,
            newRole: payload.newRole,
            timestamp: new Date().toISOString()
          });
        },
        compensate: async (payload, sagaId) => {
          // Cannot unsend notification
        }
      }
    ];
  }
}

export async function executeRoleChangeSaga(event: RoleChangeEvent): Promise<void> {
  const saga = new RoleChangeSaga();
  const correlationId = event.metadata?.correlationId || uuidv4();

  try {
    await saga.start(event, correlationId);
  } catch (error) {
    logger.error('Role change saga failed to start', {
      error: error instanceof Error ? error.message : String(error),
      userId: event.userId,
      correlationId
    });
    throw error;
  }
}
