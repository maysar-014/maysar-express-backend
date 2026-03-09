const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock('../services/logger.service', () => ({
  logger: mockLogger
}));

import { MailerAdapter } from './mailer.adapter';

describe('MailerAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sendVerificationEmail uses notification adapter when provided', async () => {
    const notificationAdapter = {
      sendNotification: jest.fn().mockResolvedValue(undefined)
    };
    const adapter = new MailerAdapter(notificationAdapter as any);

    await adapter.sendVerificationEmail({
      to: 'owner@example.com',
      businessName: 'Acme Ltd',
      businessId: 'biz-1',
      verificationLink: 'https://verify.test/biz-1'
    });

    expect(notificationAdapter.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'biz-1',
        channel: 'email',
        subject: 'Verify your business registration - Maysar',
        deliveryAddress: 'owner@example.com',
        metadata: { businessId: 'biz-1', type: 'business_verification' },
        content: expect.stringContaining('Acme Ltd'),
        contentHtml: expect.stringContaining('https://verify.test/biz-1')
      })
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('sendVerificationEmail logs fallback when notification adapter is absent', async () => {
    const adapter = new MailerAdapter();

    await adapter.sendVerificationEmail({
      to: 'owner@example.com',
      businessName: 'Acme Ltd',
      businessId: 'biz-2'
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'MailerAdapter: sendVerificationEmail (no notification adapter)',
      expect.objectContaining({
        businessId: 'biz-2',
        businessName: 'Acme Ltd'
      })
    );
  });

  it('sendBusinessVerifiedEmail uses notification adapter when provided', async () => {
    const notificationAdapter = {
      sendNotification: jest.fn().mockResolvedValue(undefined)
    };
    const adapter = new MailerAdapter(notificationAdapter as any);

    await adapter.sendBusinessVerifiedEmail({
      to: 'owner@example.com',
      businessName: 'Acme Ltd',
      businessId: 'biz-3'
    });

    expect(notificationAdapter.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'biz-3',
        channel: 'email',
        subject: 'Your business has been verified - Maysar',
        deliveryAddress: 'owner@example.com',
        metadata: { businessId: 'biz-3', type: 'business_verified' },
        content: expect.stringContaining('has been verified'),
        contentHtml: expect.stringContaining('<strong>Acme Ltd</strong>')
      })
    );
  });

  it('sendBusinessVerifiedEmail logs fallback when adapter is absent', async () => {
    const adapter = new MailerAdapter();

    await adapter.sendBusinessVerifiedEmail({
      to: 'verified-owner@example.com',
      businessName: 'Acme Ltd',
      businessId: 'biz-4'
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'MailerAdapter: sendBusinessVerifiedEmail (no notification adapter)',
      expect.objectContaining({
        businessId: 'biz-4'
      })
    );
  });
});
