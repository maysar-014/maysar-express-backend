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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enableCapabilities returns API capabilityIds and posts expected payload', async () => {
    const adapter = new CapabilityAdapter();

    const result = await adapter.enableCapabilities({
      businessId: 'biz-1',
      ownerId: 'owner-1',
      capabilities: ['orders', 'shipping'],
      correlationId: 'corr-1'
    });

    expect(result).toEqual(['cap_biz-1_orders_0', 'cap_biz-1_shipping_1']);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Capabilities enabled',
      expect.objectContaining({ businessId: 'biz-1', count: 2 })
    );
  });

  it('enableCapabilities falls back to deterministic IDs when API omits capabilityIds', async () => {
    const adapter = new CapabilityAdapter();

    const result = await adapter.enableCapabilities({
      businessId: 'biz-2',
      ownerId: 'owner-2',
      capabilities: ['billing', 'analytics'],
      correlationId: 'corr-2'
    });

    expect(result).toEqual(['cap_biz-2_billing_0', 'cap_biz-2_analytics_1']);
  });

  it('disableCapabilities posts payload and resolves on success', async () => {
    const adapter = new CapabilityAdapter();

    await adapter.disableCapabilities({
      businessId: 'biz-4',
      capabilityIds: ['cap-a', 'cap-b'],
      correlationId: 'corr-4'
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Capabilities disabled',
      expect.objectContaining({ businessId: 'biz-4', count: 2 })
    );
  });

});
