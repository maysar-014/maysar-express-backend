import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { auditClient, sessionClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from './service-clients';

export interface SecurityPolicyBreachEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  breachType: 'suspicious_login' | 'multiple_failed_attempts' | 'unusual_activity' | 'location_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: Date;
  metadata?: { correlationId: string };
}

export class SecurityPolicyBreachSaga extends DistributedSagaOrchestrator<SecurityPolicyBreachEvent> {
  protected sagaType = 'SecurityPolicyBreachSaga';

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationClient: NotificationServiceClient
  ) {
    super(sagaLogRepository, 'user-service');
  }

  protected async onStart(sagaId: string, payload: SecurityPolicyBreachEvent, correlationId?: string): Promise<void> {
    logger.info(`Starting SecurityPolicyBreachSaga for user ${payload.userId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating SecurityPolicyBreachSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<SecurityPolicyBreachEvent>[] {
    return [
      {
        name: 'AlertSecurityTeam',
        execute: async (payload, sagaId) => {
          logger.info('Alerting security team', { userId: payload.userId, severity: payload.severity, sagaId });
          await auditClient.recordEvent('security_team', 'breach_alert', {
            userId: payload.userId,
            breachType: payload.breachType,
            severity: payload.severity,
            details: payload.details
          });
        },
        compensate: async (payload, sagaId) => {
          logger.info('Clearing security alert', { userId: payload.userId, sagaId });
          // Log alert clearance
        }
      },
      {
        name: 'ReviewActiveSessions',
        execute: async (payload, sagaId) => {
          logger.info('Reviewing active sessions', { userId: payload.userId, sagaId });
          // Fetch and review all active sessions
          if (payload.severity === 'critical') {
            await sessionClient.invalidateUserSessions(payload.userId, `Security breach: ${payload.breachType}`);
          }
        },
        compensate: async (payload, sagaId) => {
          logger.info('Session review compensation', { userId: payload.userId, sagaId });
          // Cannot restore sessions if terminated
        }
      },
      {
        name: 'RecordSecurityEvent',
        execute: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, 'security_breach_detected', {
            breachType: payload.breachType,
            severity: payload.severity,
            details: payload.details
          });
        },
        compensate: async (payload, sagaId) => {
          await auditClient.recordEvent(payload.userId, 'security_breach_compensated', {
            originalEventId: payload.eventId
          });
        }
      },
      {
        name: 'NotifyUser',
        execute: async (payload, sagaId) => {
          const template = payload.severity === 'critical' ? 'security_alert_critical' : 'security_alert';
          await this.notificationClient.sendEmail(payload.userId, template, {
            breachType: payload.breachType,
            severity: payload.severity,
            actionRequired: payload.severity === 'critical',
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

export async function executeSecurityPolicyBreachSaga(
  event: SecurityPolicyBreachEvent,
  emailService: EmailService,
  notificationClient: NotificationServiceClient
): Promise<void> {
  const saga = new SecurityPolicyBreachSaga(emailService, notificationClient);
  const correlationId = event.metadata?.correlationId || uuidv4();

  try {
    await saga.start(event, correlationId);
  } catch (error) {
    logger.error('Security policy breach saga failed to start', {
      error: error instanceof Error ? error.message : String(error),
      userId: event.userId,
      correlationId
    });
    throw error;
  }
}
