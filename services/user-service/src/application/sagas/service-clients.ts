import { logger } from '../../infrastructure/services/logger.service';

export interface NotificationServiceClient {
  sendEmail(userId: string, template: string, data: Record<string, unknown>): Promise<void>;
  sendSMS(userId: string, message: string): Promise<void>;
  sendPushNotification(userId: string, title: string, body: string): Promise<void>;
}

export interface AuditServiceClient {
  recordEvent(userId: string, action: string, metadata: Record<string, unknown>): Promise<void>;
}

export interface SessionServiceClient {
  invalidateUserSessions(userId: string, reason: string): Promise<void>;
  invalidateSession(sessionId: string): Promise<void>;
}

// Mock implementations for development
export class MockNotificationServiceClient implements NotificationServiceClient {
  async sendEmail(userId: string, template: string, data: Record<string, unknown>): Promise<void> {
    logger.info(`[NOTIFICATION] Email sent`, { userId, template, data });
  }

  async sendSMS(userId: string, message: string): Promise<void> {
    logger.info(`[NOTIFICATION] SMS sent`, { userId, message });
  }

  async sendPushNotification(userId: string, title: string, body: string): Promise<void> {
    logger.info(`[NOTIFICATION] Push notification sent`, { userId, title, body });
  }
}

export class MockAuditServiceClient implements AuditServiceClient {
  async recordEvent(userId: string, action: string, metadata: Record<string, unknown>): Promise<void> {
    logger.info(`[AUDIT] Event recorded`, { userId, action, metadata });
  }
}

export class MockSessionServiceClient implements SessionServiceClient {
  async invalidateUserSessions(userId: string, reason: string): Promise<void> {
    logger.info(`[SESSION] User sessions invalidated`, { userId, reason });
  }

  async invalidateSession(sessionId: string): Promise<void> {
    logger.info(`[SESSION] Session invalidated`, { sessionId });
  }
}

export const notificationClient = new MockNotificationServiceClient();
export const auditClient = new MockAuditServiceClient();
export const sessionClient = new MockSessionServiceClient();
