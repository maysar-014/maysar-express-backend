import { IUserRepository } from '../../domain/repositories';
import { GetCODReputationUseCase } from './get-cod-reputation.use-case';

describe('GetCODReputationUseCase', () => {
  it('returns normalized COD reputation fields with defaults', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        codEnabled: true,
        codReputationScore: 77
      })
    } as unknown as IUserRepository;
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
      permanentlyDisabled: false,
      eligible: false,
      eligibilityReason: 'Buyer must have at least 3 successful orders to unlock COD privilege'
    });
  });

  it('marks reputation as eligible when score and successful order thresholds are met', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-2',
        codEnabled: true,
        codReputationScore: 80,
        codSuccessfulOrders: 3,
        codFailedOrders: 1,
        codTotalOrders: 4
      })
    } as unknown as IUserRepository;
    const useCase = new GetCODReputationUseCase(repo);

    const result = await useCase.execute('user-2');

    expect(result).toEqual({
      userId: 'user-2',
      codEnabled: true,
      reputationScore: 80,
      successfulOrders: 3,
      failedOrders: 1,
      totalOrders: 4,
      lastOrderAt: undefined,
      suspendedUntil: undefined,
      permanentlyDisabled: false,
      eligible: true,
      eligibilityReason: undefined
    });
  });

  it('throws when user does not exist', async () => {
    const useCase = new GetCODReputationUseCase({
      findById: jest.fn().mockResolvedValue(null)
    } as unknown as IUserRepository);

    await expect(useCase.execute('missing')).rejects.toThrow('User missing not found');
  });
});

