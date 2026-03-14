jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    info: jest.fn()
  }
}));

import { logger } from '../../infrastructure/services/logger.service';
import {
  auditClient,
  MockAuditServiceClient,
  MockNotificationServiceClient,
  MockSessionServiceClient,
  notificationClient,
  sessionClient
} from './service-clients';

describe('service clients mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs notification actions', async () => {
    const client = new MockNotificationServiceClient();

    await client.sendEmail('user-1', 'welcome', { name: 'Abdal' });
    await client.sendSMS('user-1', 'hello');
    await client.sendPushNotification('user-1', 'title', 'body');

    expect(logger.info).toHaveBeenNthCalledWith(1, '[NOTIFICATION] Email sent', {
      userId: 'user-1',
      template: 'welcome',
      data: { name: 'Abdal' }
    });
    expect(logger.info).toHaveBeenNthCalledWith(2, '[NOTIFICATION] SMS sent', {
      userId: 'user-1',
      message: 'hello'
    });
    expect(logger.info).toHaveBeenNthCalledWith(3, '[NOTIFICATION] Push notification sent', {
      userId: 'user-1',
      title: 'title',
      body: 'body'
    });
  });

  it('logs audit and session actions', async () => {
    const audit = new MockAuditServiceClient();
    const session = new MockSessionServiceClient();

    await audit.recordEvent('user-1', 'LOGIN', { source: 'mobile' });
    await session.invalidateUserSessions('user-1', 'security');
    await session.invalidateSession('session-1');

    expect(logger.info).toHaveBeenNthCalledWith(1, '[AUDIT] Event recorded', {
      userId: 'user-1',
      action: 'LOGIN',
      metadata: { source: 'mobile' }
    });
    expect(logger.info).toHaveBeenNthCalledWith(2, '[SESSION] User sessions invalidated', {
      userId: 'user-1',
      reason: 'security'
    });
    expect(logger.info).toHaveBeenNthCalledWith(3, '[SESSION] Session invalidated', {
      sessionId: 'session-1'
    });
  });

  it('exports singleton clients with expected classes', () => {
    expect(notificationClient).toBeInstanceOf(MockNotificationServiceClient);
    expect(auditClient).toBeInstanceOf(MockAuditServiceClient);
    expect(sessionClient).toBeInstanceOf(MockSessionServiceClient);
  });
});
