import { BaseSaga } from './saga-base';
import { notificationClient, auditClient, sessionClient } from './service-clients';
import { logger } from '../../infrastructure/services/logger.service';

export interface SecurityPolicyBreachEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  breachType: 'suspicious_login' | 'multiple_failed_attempts' | 'unusual_activity' | 'location_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: Date;
}

export async function executeSecurityPolicyBreachSaga(event: SecurityPolicyBreachEvent): Promise<void> {
  const saga = new BaseSaga(event.eventId, event);

  saga.addStep({
    name: 'AlertSecurityTeam',
    execute: async () => {
      logger.info('Alerting security team', { userId: event.userId, severity: event.severity });
      await auditClient.recordEvent('security_team', 'breach_alert', {
        userId: event.userId,
        breachType: event.breachType,
        severity: event.severity,
        details: event.details
      });
    },
    compensate: async () => {
      logger.info('Clearing security alert', { userId: event.userId });
      // Log alert clearance
    }
  });

  saga.addStep({
    name: 'ReviewActiveSessions',
    execute: async () => {
      logger.info('Reviewing active sessions', { userId: event.userId });
      // Fetch and review all active sessions
      if (event.severity === 'critical') {
        await sessionClient.invalidateUserSessions(event.userId, `Security breach: ${event.breachType}`);
      }
    },
    compensate: async () => {
      logger.info('Session review compensation', { userId: event.userId });
      // Cannot restore sessions if terminated
    }
  });

  saga.addStep({
    name: 'RecordSecurityEvent',
    execute: async () => {
      await auditClient.recordEvent(event.userId, 'security_breach_detected', {
        breachType: event.breachType,
        severity: event.severity,
        details: event.details
      });
    },
    compensate: async () => {
      await auditClient.recordEvent(event.userId, 'security_breach_compensated', {
        originalEventId: event.eventId
      });
    }
  });

  saga.addStep({
    name: 'NotifyUser',
    execute: async () => {
      const template = event.severity === 'critical' ? 'security_alert_critical' : 'security_alert';
      await notificationClient.sendEmail(event.userId, template, {
        breachType: event.breachType,
        severity: event.severity,
        actionRequired: event.severity === 'critical',
        timestamp: new Date().toISOString()
      });
    },
    compensate: async () => {
      // Cannot unsend notification
    }
  });

  await saga.execute();
}
