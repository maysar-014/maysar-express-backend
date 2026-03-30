import { UserServiceClient } from './user-service.client';

describe('UserServiceClient integration stub', () => {
  afterEach(() => {
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
      '[UserServiceClient] Bypassing COD reputation for user user-2 (non-production).'
    );
  });
});
