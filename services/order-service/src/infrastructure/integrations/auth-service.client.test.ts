import { AuthServiceClient } from './auth-service.client';

describe('AuthServiceClient integration stub', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a positive verification result and logs invocation', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const client = new AuthServiceClient();

    await expect(client.isUserVerified('user-1')).resolves.toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      '[AuthServiceClient] Bypassing verification for user user-1 (non-production).'
    );
  });
});
