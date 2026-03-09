const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock('../services/logger.service', () => ({
  logger: mockLogger
}));

import { UserServiceAdapter } from './user-service.adapter';

describe('UserServiceAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifyBusinessRegistered uses notification adapter when available', async () => {
    const notificationAdapter = {
      sendNotification: jest.fn().mockResolvedValue(undefined)
    };
    const adapter = new UserServiceAdapter(notificationAdapter as any);

    await adapter.notifyBusinessRegistered({
      ownerId: 'owner-1',
      businessId: 'biz-1',
      businessName: 'Acme',
      correlationId: 'corr-1'
    });

    expect(notificationAdapter.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-1',
        channel: 'in-app',
        subject: 'Business Registered',
        content: expect.stringContaining('Acme'),
        metadata: {
          businessId: 'biz-1',
          type: 'business_registered',
          correlationId: 'corr-1'
        }
      })
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('notifyBusinessRegistered logs fallback when no adapter is provided', async () => {
    const adapter = new UserServiceAdapter();

    await adapter.notifyBusinessRegistered({
      ownerId: 'owner-2',
      businessId: 'biz-2',
      businessName: 'Fallback Biz',
      correlationId: 'corr-2'
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'UserServiceAdapter: notifyBusinessRegistered (no notification adapter)',
      {
        ownerId: 'owner-2',
        businessId: 'biz-2'
      }
    );
  });
});
