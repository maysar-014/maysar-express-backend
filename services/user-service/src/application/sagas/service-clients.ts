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
  async sendEmail(_userId: string, _template: string, _data: Record<string, unknown>): Promise<void> {
    throw new UnconfiguredServiceClientError('NotificationServiceClient');
  }

  async sendSMS(_userId: string, _message: string): Promise<void> {
    throw new UnconfiguredServiceClientError('NotificationServiceClient');
  }

  async sendPushNotification(_userId: string, _title: string, _body: string): Promise<void> {
    throw new UnconfiguredServiceClientError('NotificationServiceClient');
  }
}

export class AuditServiceClientUnavailable implements AuditServiceClient {
  async recordEvent(_userId: string, _action: string, _metadata: Record<string, unknown>): Promise<void> {
    throw new UnconfiguredServiceClientError('AuditServiceClient');
  }
}

export class SessionServiceClientUnavailable implements SessionServiceClient {
  async invalidateUserSessions(_userId: string, _reason: string): Promise<void> {
    throw new UnconfiguredServiceClientError('SessionServiceClient');
  }

  async invalidateSession(_sessionId: string): Promise<void> {
    throw new UnconfiguredServiceClientError('SessionServiceClient');
  }
}

export const notificationClient: NotificationServiceClient = new NotificationServiceClientUnavailable();
export const auditClient: AuditServiceClient = new AuditServiceClientUnavailable();
export const sessionClient: SessionServiceClient = new SessionServiceClientUnavailable();
