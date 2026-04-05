describe('sms infrastructure container', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      SMS_PROVIDER: 'mock'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('binds the mock provider when explicitly configured', async () => {
    const { container } = await import('./container');
    const { TYPES } = await import('./types');

    const provider = container.get(TYPES.SmsProvider) as { getName: () => string };

    expect(provider.getName()).toBe('mock');
  });
});
