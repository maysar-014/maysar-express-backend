jest.mock('@sentry/node', () => ({
  init: jest.fn()
}));

import * as Sentry from '@sentry/node';

describe('instrument bootstrap', () => {
  const previousEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('initializes sentry with environment values in payment and root bootstrap files', async () => {
    process.env.SENTRY_DSN = 'https://example@sentry.io/42';
    process.env.NODE_ENV = 'production';

    await import('./instrument');
    await import('../../../src/instrument');

    expect((Sentry.init as jest.Mock).mock.calls).toHaveLength(2);
    expect(Sentry.init).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        dsn: 'https://example@sentry.io/42',
        environment: 'production',
        tracesSampleRate: 1,
        sendDefaultPii: true
      })
    );
    expect(Sentry.init).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        dsn: 'https://example@sentry.io/42',
        environment: 'production',
        tracesSampleRate: 1,
        sendDefaultPii: true
      })
    );
  });
});
