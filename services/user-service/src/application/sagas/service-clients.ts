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

class UnconfiguredServiceClientError extends Error {
  constructor(serviceName: string) {
    super(`${serviceName} is not configured. Provide a real service client implementation.`);
  }
}

export class NotificationServiceClientUnavailable implements NotificationServiceClient {
  async sendEmail(): Promise<void> {
    throw new UnconfiguredServiceClientError('NotificationServiceClient');
  }

  async sendSMS(): Promise<void> {
    throw new UnconfiguredServiceClientError('NotificationServiceClient');
  }

  async sendPushNotification(): Promise<void> {
    throw new UnconfiguredServiceClientError('NotificationServiceClient');
  }
}

export class AuditServiceClientUnavailable implements AuditServiceClient {
  async recordEvent(): Promise<void> {
    throw new UnconfiguredServiceClientError('AuditServiceClient');
  }
}

export class SessionServiceClientUnavailable implements SessionServiceClient {
  async invalidateUserSessions(): Promise<void> {
    throw new UnconfiguredServiceClientError('SessionServiceClient');
  }

  async invalidateSession(): Promise<void> {
    throw new UnconfiguredServiceClientError('SessionServiceClient');
  }
}

export const notificationClient = new NotificationServiceClientUnavailable();
export const auditClient = new AuditServiceClientUnavailable();
export const sessionClient = new SessionServiceClientUnavailable();
