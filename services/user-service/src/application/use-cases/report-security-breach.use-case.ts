import { IUserRepository } from '../../domain/repositories';
import { SecurityPolicyBreachEvent } from '../sagas/security-policy-breach.saga';
import { sagaEventHandler } from '../sagas/saga-event-handler';
import { logger } from '../../infrastructure/services/logger.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from '../sagas/service-clients';

export interface ReportSecurityBreachInput {
  userId: string;
  breachType: 'suspicious_login' | 'multiple_failed_attempts' | 'unusual_activity' | 'location_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  reportedBy?: string | undefined;
}

export interface ReportSecurityBreachOutput {
  success: boolean;
  message: string;
  alertId?: string;
}

export class ReportSecurityBreachUseCase {
  constructor(
    private userRepository: IUserRepository,
    private emailService: EmailService,
    private notificationClient: NotificationServiceClient
  ) { }

  async execute(input: ReportSecurityBreachInput): Promise<ReportSecurityBreachOutput> {
    try {
      logger.info('Reporting security breach', {
        userId: input.userId,
        breachType: input.breachType,
        severity: input.severity,
        reportedBy: input.reportedBy || 'system'
      });

      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Validate breach type and severity
      const validBreachTypes = ['suspicious_login', 'multiple_failed_attempts', 'unusual_activity', 'location_anomaly'];
      const validSeverities = ['low', 'medium', 'high', 'critical'];

      if (!validBreachTypes.includes(input.breachType)) {
        return { success: false, message: 'Invalid breach type' };
      }

      if (!validSeverities.includes(input.severity)) {
        return { success: false, message: 'Invalid severity level' };
      }

      // Record security event
      const alertId = `security-alert-${input.userId}-${Date.now()}`;
      await this.userRepository.recordSecurityEvent(input.userId, {
        action: 'security_breach_reported',
        success: true,
        metadata: {
          alertId,
          breachType: input.breachType,
          severity: input.severity,
          details: input.details,
          reportedBy: input.reportedBy || 'system'
        }
      });

      // Publish security breach event to trigger saga
      const event: SecurityPolicyBreachEvent = {
        eventId: alertId,
        aggregateId: input.userId,
        userId: input.userId,
        breachType: input.breachType,
        severity: input.severity,
        details: input.details,
        timestamp: new Date()
      };

      await sagaEventHandler.handleSecurityPolicyBreachEvent(event, this.emailService, this.notificationClient);

      logger.info('Security breach reported', {
        userId: input.userId,
        alertId,
        severity: input.severity,
        reportedBy: input.reportedBy || 'system'
      });

      return {
        success: true,
        message: 'Security breach reported. Security team has been alerted.',
        alertId
      };

    } catch (error) {
      logger.error('Failed to report security breach', { userId: input.userId, error });
      return { success: false, message: 'Failed to report security breach' };
    }
  }
}
