const mockLoggerDebug = jest.fn();
const mockLoggerWarn = jest.fn();
const mockPublish = jest.fn();

jest.mock('../services/logger.service', () => ({
  logger: {
    debug: (...args: unknown[]) => mockLoggerDebug(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    info: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@shared/events/eventBus', () => ({
  eventBus: {
    publish: (...args: unknown[]) => mockPublish(...args)
  }
}));

import { ComplianceAdapter } from './compliance.adapter';

describe('ComplianceAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('notifyNewBusiness publishes compliance events', async () => {
    const adapter = new ComplianceAdapter();

    await adapter.notifyNewBusiness({
      businessId: 'biz-1',
      ownerId: 'owner-1',
      businessType: 'SOLE_PROPRIETORSHIP',
      registrationNumber: 'TZ-DAR-12345',
      correlationId: 'corr-1'
    });

    expect(mockPublish).toHaveBeenCalledWith(
      'ComplianceCheckCompleted.v1',
      expect.objectContaining({
        complianceType: 'kyc',
        entityId: 'biz-1',
        sagaId: 'corr-1'
      })
    );
    expect(mockPublish).toHaveBeenCalledWith(
      'ComplianceRecorded.v1',
      expect.objectContaining({
        complianceType: 'kyc',
        entityId: 'biz-1',
        operation: 'business_registered',
        sagaId: 'corr-1'
      })
    );
    expect(mockLoggerDebug).toHaveBeenCalledWith('KYC compliance notified for new business', { businessId: 'biz-1' });
  });

  it('notifyNewBusiness throws and logs warning when publish fails', async () => {
    mockPublish.mockRejectedValueOnce(new Error('bus down'));
    const adapter = new ComplianceAdapter();

    await expect(
      adapter.notifyNewBusiness({
        businessId: 'biz-2',
        ownerId: 'owner-2',
        businessType: 'CORPORATION',
        registrationNumber: 'TZ-DAR-99999',
        correlationId: 'corr-2'
      })
    ).rejects.toThrow('bus down');

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'ComplianceAdapter: notifyNewBusiness failed',
      expect.objectContaining({
        businessId: 'biz-2',
        error: 'bus down'
      })
    );
  });

  it('createKYCRecord returns generated recordId and logs debug', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    const adapter = new ComplianceAdapter();

    const recordId = await adapter.createKYCRecord({
      businessId: 'biz-3',
      status: 'pending',
      correlationId: 'corr-3'
    });

    expect(recordId).toBe('kyc_biz-3_1234567890');
    expect(mockLoggerDebug).toHaveBeenCalledWith('KYC record created', { businessId: 'biz-3', recordId: 'kyc_biz-3_1234567890' });
  });

  it('revokeKYCRecord publishes revoke operation and handles failures', async () => {
    const adapter = new ComplianceAdapter();

    await adapter.revokeKYCRecord('kyc-1', 'corr-5');
    expect(mockLoggerDebug).toHaveBeenCalledWith('KYC record revoked', { recordId: 'kyc-1' });

    mockPublish.mockRejectedValueOnce(new Error('publish failed'));
    await expect(adapter.revokeKYCRecord('kyc-2', 'corr-6')).rejects.toThrow('publish failed');
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'ComplianceAdapter: revokeKYCRecord failed',
      expect.objectContaining({
        recordId: 'kyc-2',
        error: 'publish failed'
      })
    );
  });
});
