const mockLoggerDebug = jest.fn();
const mockLoggerWarn = jest.fn();

jest.mock('../services/logger.service', () => ({
  logger: {
    debug: (...args: unknown[]) => mockLoggerDebug(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    info: jest.fn(),
    error: jest.fn()
  }
}));

import { ComplianceAdapter } from './compliance.adapter';

describe('ComplianceAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('notifyNewBusiness posts to compliance monitor endpoint', async () => {
    (global as unknown as { fetch: jest.Mock }).fetch.mockResolvedValue({
      ok: true
    });
    const adapter = new ComplianceAdapter('http://compliance');

    await adapter.notifyNewBusiness({
      businessId: 'biz-1',
      ownerId: 'owner-1',
      businessType: 'SOLE_PROPRIETORSHIP',
      registrationNumber: 'TZ-DAR-12345',
      correlationId: 'corr-1'
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://compliance/api/compliance/monitor',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complianceType: 'kyc',
          entityId: 'biz-1',
          operation: 'business_registered',
          sagaId: 'corr-1',
          metadata: {
            ownerId: 'owner-1',
            businessType: 'SOLE_PROPRIETORSHIP',
            registrationNumber: 'TZ-DAR-12345'
          }
        })
      })
    );
    expect(mockLoggerDebug).toHaveBeenCalledWith('KYC compliance notified for new business', { businessId: 'biz-1' });
  });

  it('notifyNewBusiness throws and logs warning for non-OK responses', async () => {
    (global as unknown as { fetch: jest.Mock }).fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('internal error')
    });
    const adapter = new ComplianceAdapter('http://compliance');

    await expect(
      adapter.notifyNewBusiness({
        businessId: 'biz-2',
        ownerId: 'owner-2',
        businessType: 'CORPORATION',
        registrationNumber: 'TZ-DAR-99999',
        correlationId: 'corr-2'
      })
    ).rejects.toThrow('KYC compliance service error 500: internal error');

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'ComplianceAdapter: notifyNewBusiness failed',
      expect.objectContaining({
        businessId: 'biz-2',
        error: 'KYC compliance service error 500: internal error'
      })
    );
  });

  it('createKYCRecord returns API recordId and logs debug', async () => {
    (global as unknown as { fetch: jest.Mock }).fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ recordId: 'kyc-123' })
    });
    const adapter = new ComplianceAdapter('http://compliance');

    const recordId = await adapter.createKYCRecord({
      businessId: 'biz-3',
      status: 'pending',
      correlationId: 'corr-3'
    });

    expect(recordId).toBe('kyc-123');
    expect(mockLoggerDebug).toHaveBeenCalledWith('KYC record created', { businessId: 'biz-3', recordId: 'kyc-123' });
  });

  it('createKYCRecord falls back to generated ID when API omits recordId', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    (global as unknown as { fetch: jest.Mock }).fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    });
    const adapter = new ComplianceAdapter('http://compliance');

    const recordId = await adapter.createKYCRecord({
      businessId: 'biz-4',
      status: 'pending',
      correlationId: 'corr-4'
    });

    expect(recordId).toBe('kyc_biz-4_1234567890');
  });

  it('revokeKYCRecord posts revoke operation and handles failures', async () => {
    const adapter = new ComplianceAdapter('http://compliance');

    (global as unknown as { fetch: jest.Mock }).fetch.mockResolvedValueOnce({ ok: true });
    await adapter.revokeKYCRecord('kyc-1', 'corr-5');
    expect(mockLoggerDebug).toHaveBeenCalledWith('KYC record revoked', { recordId: 'kyc-1' });

    (global as unknown as { fetch: jest.Mock }).fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('bad request')
    });
    await expect(adapter.revokeKYCRecord('kyc-2', 'corr-6')).rejects.toThrow(
      'KYC compliance service error 400: bad request'
    );
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'ComplianceAdapter: revokeKYCRecord failed',
      expect.objectContaining({
        recordId: 'kyc-2',
        error: 'KYC compliance service error 400: bad request'
      })
    );
  });
});
