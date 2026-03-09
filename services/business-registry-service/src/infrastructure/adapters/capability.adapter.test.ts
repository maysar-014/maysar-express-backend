jest.mock('../services/logger.service', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}));

import { logger } from '../services/logger.service';
import { CapabilityAdapter } from './capability.adapter';

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('CapabilityAdapter', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = fetchMock;
  });

  it('enableCapabilities returns API capabilityIds and posts expected payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ capabilityIds: ['cap-1', 'cap-2'] })
    });
    const adapter = new CapabilityAdapter('http://capability.test');

    const result = await adapter.enableCapabilities({
      businessId: 'biz-1',
      ownerId: 'owner-1',
      capabilities: ['orders', 'shipping'],
      correlationId: 'corr-1'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://capability.test/api/capabilities/enable',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
    expect(result).toEqual(['cap-1', 'cap-2']);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Capabilities enabled',
      expect.objectContaining({ businessId: 'biz-1', count: 2 })
    );
  });

  it('enableCapabilities falls back to deterministic IDs when API omits capabilityIds', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    });
    const adapter = new CapabilityAdapter('http://capability.test');

    const result = await adapter.enableCapabilities({
      businessId: 'biz-2',
      ownerId: 'owner-2',
      capabilities: ['billing', 'analytics'],
      correlationId: 'corr-2'
    });

    expect(result).toEqual(['cap_biz-2_billing_0', 'cap_biz-2_analytics_1']);
  });

  it('enableCapabilities throws when service returns non-OK response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('internal error')
    });
    const adapter = new CapabilityAdapter('http://capability.test');

    await expect(
      adapter.enableCapabilities({
        businessId: 'biz-3',
        ownerId: 'owner-3',
        capabilities: ['reports'],
        correlationId: 'corr-3'
      })
    ).rejects.toThrow('Capability service error 500: internal error');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'CapabilityAdapter: enableCapabilities failed',
      expect.objectContaining({ businessId: 'biz-3' })
    );
  });

  it('disableCapabilities posts payload and resolves on success', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const adapter = new CapabilityAdapter('http://capability.test');

    await adapter.disableCapabilities({
      businessId: 'biz-4',
      capabilityIds: ['cap-a', 'cap-b'],
      correlationId: 'corr-4'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://capability.test/api/capabilities/disable',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          businessId: 'biz-4',
          capabilityIds: ['cap-a', 'cap-b'],
          correlationId: 'corr-4'
        })
      })
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Capabilities disabled',
      expect.objectContaining({ businessId: 'biz-4', count: 2 })
    );
  });

  it('disableCapabilities throws and warns when service returns non-OK', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('bad request')
    });
    const adapter = new CapabilityAdapter('http://capability.test');

    await expect(
      adapter.disableCapabilities({
        businessId: 'biz-5',
        capabilityIds: ['cap-x'],
        correlationId: 'corr-5'
      })
    ).rejects.toThrow('Capability service error 400: bad request');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'CapabilityAdapter: disableCapabilities failed',
      expect.objectContaining({ businessId: 'biz-5' })
    );
  });
});
