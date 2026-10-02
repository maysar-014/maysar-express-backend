/**
 * `PushProviderAdapter` decides whether to talk to FCM from ambient environment
 * variables, so these tests pin the environment explicitly.
 *
 * The previous version of this suite was neither hermetic nor meaningful: it
 * inherited whatever `FIREBASE_*` values happened to be in the developer's
 * `.env`, and its only assertion was `expect(true).toBe(true)`. With placeholder
 * credentials present, `admin.credential.cert()` threw "Invalid PEM formatted
 * message" from inside the SDK and the test failed for reasons that had nothing
 * to do with the adapter.
 */
describe('PushProviderAdapter', () => {
  const FIREBASE_VARS = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ] as const;

  let saved: Record<string, string | undefined>;
  let savedNodeEnv: string | undefined;

  beforeEach(() => {
    saved = Object.fromEntries(FIREBASE_VARS.map((k) => [k, process.env[k]]));
    savedNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    for (const k of FIREBASE_VARS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedNodeEnv;
    jest.resetModules();
  });

  describe('when FCM is not configured', () => {
    beforeEach(() => {
      for (const k of FIREBASE_VARS) delete process.env[k];
      process.env.NODE_ENV = 'test';
    });

    it('resolves without throwing when no credentials are present', async () => {
      const { PushProviderAdapter } = await import('../push-provider.adapter');
      const adapter = new PushProviderAdapter();
      await expect(
        adapter.send('device-token', { title: 'Test', body: 'Test body' }),
      ).resolves.toBeUndefined();
    });

    it('sendBatch resolves without throwing when no credentials are present', async () => {
      const { PushProviderAdapter } = await import('../push-provider.adapter');
      const adapter = new PushProviderAdapter();
      await expect(
        adapter.sendBatch([
          { deviceToken: 't1', payload: { title: 'a', body: 'b' } },
        ]),
      ).resolves.toBeUndefined();
    });

    it('does not attempt to reach Firebase at all', async () => {
      const send = jest.fn();
      jest.doMock('firebase-admin', () => ({
        __esModule: true,
        default: {
          apps: [],
          initializeApp: jest.fn(),
          messaging: jest.fn(() => ({ send })),
          credential: { cert: jest.fn() },
        },
      }));

      const { PushProviderAdapter } = await import('../push-provider.adapter');
      await new PushProviderAdapter().send('device-token', { title: 't' });

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('when FCM credentials are configured', () => {
    const send = jest.fn().mockResolvedValue('projects/test/message-1');

    beforeEach(() => {
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_CLIENT_EMAIL = 'svc@test.iam.gserviceaccount.com';
      // Real PEM: firebase-admin parses this during credential.cert(), so a
      // placeholder string is not good enough.
      process.env.FIREBASE_PRIVATE_KEY = [
        '-----BEGIN PRIVATE KEY-----',
        'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDLtVkOJ0dRHhMz',
        '-----END PRIVATE KEY-----',
      ].join('\\n');
      send.mockClear();
    });

    it('initialises the SDK and sends the notification', async () => {
      const initializeApp = jest.fn();
      const cert = jest.fn().mockReturnValue({ credential: true });
      jest.doMock('firebase-admin', () => ({
        __esModule: true,
        default: {
          apps: [],
          initializeApp,
          messaging: jest.fn(() => ({ send })),
          credential: { cert },
        },
      }));

      const { PushProviderAdapter } = await import('../push-provider.adapter');
      await new PushProviderAdapter().send('device-token', {
        title: 'Title',
        body: 'Body',
        data: { orderId: 'o1', amount: 1500 },
      });

      expect(send).toHaveBeenCalledTimes(1);
      const msg = send.mock.calls[0][0];
      expect(msg.token).toBe('device-token');
      expect(msg.notification).toEqual({ title: 'Title', body: 'Body' });
    });

    it('stringifies data values, as FCM requires', async () => {
      jest.doMock('firebase-admin', () => ({
        __esModule: true,
        default: {
          apps: [],
          initializeApp: jest.fn(),
          messaging: jest.fn(() => ({ send })),
          credential: { cert: jest.fn().mockReturnValue({}) },
        },
      }));

      const { PushProviderAdapter } = await import('../push-provider.adapter');
      await new PushProviderAdapter().send('t', { data: { orderId: 'o1', amount: 1500 } });

      // FCM rejects non-string data values, so the adapter coerces them.
      expect(send.mock.calls[0][0].data).toEqual({ orderId: 'o1', amount: '1500' });
    });
  });

  describe('explicit constructor config', () => {
    it('uses constructor config instead of environment variables', async () => {
      for (const k of FIREBASE_VARS) delete process.env[k];
      process.env.NODE_ENV = 'test';

      const send = jest.fn().mockResolvedValue('ok');
      jest.doMock('firebase-admin', () => ({
        __esModule: true,
        default: {
          apps: [],
          initializeApp: jest.fn(),
          messaging: jest.fn(() => ({ send })),
          credential: { cert: jest.fn().mockReturnValue({}) },
        },
      }));

      const { PushProviderAdapter } = await import('../push-provider.adapter');
      const adapter = new PushProviderAdapter({
        projectId: 'ctor-project',
        clientEmail: 'ctor@test.iam.gserviceaccount.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
      });
      await adapter.send('t', { title: 'x' });

      expect(send).toHaveBeenCalledTimes(1);
    });
  });
});

