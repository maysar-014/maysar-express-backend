import { GetCODReputationUseCase } from './get-cod-reputation.use-case';

describe('GetCODReputationUseCase', () => {
  it('returns normalized COD reputation fields with defaults', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        codEnabled: true,
        codReputationScore: 77
      })
    };
    const useCase = new GetCODReputationUseCase(repo);

    const result = await useCase.execute('user-1');

    expect(repo.findById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      userId: 'user-1',
      codEnabled: true,
      reputationScore: 77,
      successfulOrders: 0,
      failedOrders: 0,
      totalOrders: 0,
      lastOrderAt: undefined,
      suspendedUntil: undefined,
      permanentlyDisabled: false
    });
  });

  it('throws when user does not exist', async () => {
    const useCase = new GetCODReputationUseCase({
      findById: jest.fn().mockResolvedValue(null)
    });

    await expect(useCase.execute('missing')).rejects.toThrow('User missing not found');
  });
});

