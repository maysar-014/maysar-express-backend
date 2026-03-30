import {
  auditClient,
  AuditServiceClientUnavailable,
  NotificationServiceClientUnavailable,
  SessionServiceClientUnavailable,
  notificationClient,
  sessionClient
} from './service-clients';

describe('service clients', () => {
  it('throws when notification client methods are used', async () => {
    const client = new NotificationServiceClientUnavailable();

    await expect(client.sendEmail('user-1', 'welcome', { name: 'Abdal' })).rejects.toThrow(
      'NotificationServiceClient is not configured. Provide a real service client implementation.'
    );
    await expect(client.sendSMS('user-1', 'hello')).rejects.toThrow(
      'NotificationServiceClient is not configured. Provide a real service client implementation.'
    );
    await expect(client.sendPushNotification('user-1', 'title', 'body')).rejects.toThrow(
      'NotificationServiceClient is not configured. Provide a real service client implementation.'
    );
  });

  it('throws when audit and session client methods are used', async () => {
    const audit = new AuditServiceClientUnavailable();
    const session = new SessionServiceClientUnavailable();

    await expect(audit.recordEvent('user-1', 'LOGIN', { source: 'mobile' })).rejects.toThrow(
      'AuditServiceClient is not configured. Provide a real service client implementation.'
    );
    await expect(session.invalidateUserSessions('user-1', 'security')).rejects.toThrow(
      'SessionServiceClient is not configured. Provide a real service client implementation.'
    );
    await expect(session.invalidateSession('session-1')).rejects.toThrow(
      'SessionServiceClient is not configured. Provide a real service client implementation.'
    );
  });

  it('exports singleton clients with expected classes', () => {
    expect(notificationClient).toBeInstanceOf(NotificationServiceClientUnavailable);
    expect(auditClient).toBeInstanceOf(AuditServiceClientUnavailable);
    expect(sessionClient).toBeInstanceOf(SessionServiceClientUnavailable);
  });
});
