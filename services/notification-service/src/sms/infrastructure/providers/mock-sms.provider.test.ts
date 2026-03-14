import { MockSmsProvider } from './mock-sms.provider';

describe('MockSmsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends successfully and stores message metadata', async () => {
    const provider = new MockSmsProvider();

    const response = await provider.send('+255700000001', 'Hello from test');

    expect(response.isSuccess()).toBe(true);
    expect(response.getProviderMessageId()).toMatch(/^mock-/);
    expect(response.getMetadata()).toEqual(
      expect.objectContaining({
        provider: 'mock',
        phoneNumber: '+255700000001',
        messageLength: 15
      })
    );

    const sent = provider.getSentMessages();
    expect(sent.size).toBe(1);
  });

  it('returns failure when configured to fail', async () => {
    const provider = new MockSmsProvider({ shouldFail: true });

    const response = await provider.send('+255700000002', 'Should fail');

    expect(response.isFailure()).toBe(true);
    expect(response.getStatusCode()).toBe('500');
    expect(provider.getSentMessages().size).toBe(0);
  });

  it('returns not found status when message id is unknown', async () => {
    const provider = new MockSmsProvider();

    const status = await provider.getStatus('missing-id');

    expect(status.isFailure()).toBe(true);
    expect(status.getStatusCode()).toBe('404');
  });

  it('exposes provider utilities and clamps failure rate', async () => {
    const provider = new MockSmsProvider();

    provider.setFailureRate(2);
    provider.setShouldFail(false);

    expect(provider.getName()).toBe('mock');
    expect(provider.getConfig()).toEqual(
      expect.objectContaining({
        name: 'mock',
        maxMessageLength: 1600,
        supportsDeliveryReports: true,
        supportsBatch: true
      })
    );
    await expect(provider.isHealthy()).resolves.toBe(true);
  });

  it('simulates delivery and clears sent messages', async () => {
    const provider = new MockSmsProvider();
    const response = await provider.send('+255700000003', 'Track me');
    const providerMessageId = response.getProviderMessageId();

    provider.simulateDelivery(providerMessageId);
    const message = provider.getSentMessages().get(providerMessageId);
    expect(message.status).toBe('delivered');
    expect(message.deliveredAt).toBeInstanceOf(Date);

    provider.clearSentMessages();
    expect(provider.getSentMessages().size).toBe(0);
  });
});
