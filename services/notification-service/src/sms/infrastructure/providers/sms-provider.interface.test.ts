import { ProviderResponse } from '../../domain/value-objects/provider-response.value-object';
import type { ISmsProvider } from './sms-provider.interface';

describe('ISmsProvider contract', () => {
  it('supports sending, status lookup, health checks, and config access', async () => {
    const provider: ISmsProvider = {
      send: jest.fn().mockResolvedValue(ProviderResponse.createSuccess('msg-1')),
      getStatus: jest.fn().mockResolvedValue(
        ProviderResponse.create({
          providerMessageId: 'msg-1',
          status: 'delivered',
          timestamp: new Date('2026-03-01T00:00:00.000Z')
        })
      ),
      getName: jest.fn().mockReturnValue('mock-provider'),
      isHealthy: jest.fn().mockResolvedValue(true),
      getConfig: jest.fn().mockReturnValue({
        name: 'mock-provider',
        maxMessageLength: 160,
        supportsDeliveryReports: true,
        supportsBatch: false
      })
    };

    const sendResult = await provider.send('+255712345678', 'Hello');
    const statusResult = await provider.getStatus('msg-1');

    expect(provider.getName()).toBe('mock-provider');
    await expect(provider.isHealthy()).resolves.toBe(true);
    expect(provider.getConfig().maxMessageLength).toBe(160);
    expect(sendResult.getProviderMessageId()).toBe('msg-1');
    expect(statusResult.getStatus()).toBe('delivered');
  });
});
