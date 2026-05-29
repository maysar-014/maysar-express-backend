import { UserServiceClient } from './user-service.client';

describe('UserServiceClient integration stub', () => {
  const originalBypass = process.env.ORDER_BYPASS_USER_VERIFICATION;

  beforeEach(() => {
    process.env.ORDER_BYPASS_USER_VERIFICATION = 'true';
  });

  afterEach(() => {
    process.env.ORDER_BYPASS_USER_VERIFICATION = originalBypass;
    jest.restoreAllMocks();
  });

  it('returns default COD reputation payload and logs invocation', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const client = new UserServiceClient();

    const result = await client.getCODReputation('user-2');

    expect(result).toEqual({
      score: 100,
      successfulOrders: 0
    });
    expect(logSpy).toHaveBeenCalledWith(
      '[UserServiceClient] Bypassing COD reputation for user user-2 (explicit override).'
    );
  });
});
