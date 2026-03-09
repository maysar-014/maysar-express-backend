import { CODAction } from '../../domain/engines/cod-reputation.engine';
import { UpdateCODReputationUseCase } from './update-cod-reputation.use-case';

describe('UpdateCODReputationUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws when user does not exist', async () => {
    const useCase = new UpdateCODReputationUseCase(
      { findById: jest.fn().mockResolvedValue(null), update: jest.fn(), saveCODHistory: jest.fn() },
      { calculateNewScore: jest.fn() } as never
    );

    await expect(
      useCase.execute({ userId: 'missing', orderId: 'order-1', action: CODAction.ORDER_PLACED })
    ).rejects.toThrow('User missing not found');
  });

  it('applies first success bonus flow on delivery confirmed', async () => {
    const userRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        codReputationScore: 10,
        codSuccessfulOrders: 0,
        codTotalOrders: 3
      }),
      update: jest.fn().mockResolvedValue(undefined),
      saveCODHistory: jest.fn().mockResolvedValue(undefined)
    };
    const reputationEngine = {
      calculateNewScore: jest.fn().mockReturnValue({
        newScore: 35,
        change: 25,
        suspendedUntil: undefined,
        permanentlyDisabled: false,
        reason: 'First successful COD order - unlock bonus applied'
      })
    };
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const useCase = new UpdateCODReputationUseCase(userRepository, reputationEngine as never);

    await useCase.execute({
      userId: 'user-1',
      orderId: 'order-1',
      action: CODAction.DELIVERY_CONFIRMED
    });

    expect(reputationEngine.calculateNewScore).toHaveBeenCalledWith(
      10,
      CODAction.DELIVERY_CONFIRMED,
      true
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        codReputationScore: 35,
        codPermanentlyDisabled: false,
        codTotalOrders: 4,
        codSuccessfulOrders: 1,
        codEnabled: true,
        codLastOrderAt: expect.any(Date)
      })
    );
    expect(userRepository.saveCODHistory).toHaveBeenCalledWith({
      userId: 'user-1',
      orderId: 'order-1',
      action: CODAction.DELIVERY_CONFIRMED,
      reputationChange: 25,
      reputationAfter: 35,
      reason: 'First successful COD order - unlock bonus applied'
    });
    expect(logSpy).toHaveBeenCalledWith('[Reputation] Updated user user-1: +25 (35)');
  });

  it('increments failed orders on delivery refusal', async () => {
    const userRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-2',
        codReputationScore: 55,
        codSuccessfulOrders: 2,
        codFailedOrders: 1,
        codTotalOrders: 6
      }),
      update: jest.fn().mockResolvedValue(undefined),
      saveCODHistory: jest.fn().mockResolvedValue(undefined)
    };
    const reputationEngine = {
      calculateNewScore: jest.fn().mockReturnValue({
        newScore: 45,
        change: -10,
        suspendedUntil: undefined,
        permanentlyDisabled: false,
        reason: 'Delivery refused by buyer'
      })
    };
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const useCase = new UpdateCODReputationUseCase(userRepository, reputationEngine as never);

    await useCase.execute({
      userId: 'user-2',
      orderId: 'order-2',
      action: CODAction.DELIVERY_REFUSED
    });

    expect(reputationEngine.calculateNewScore).toHaveBeenCalledWith(
      55,
      CODAction.DELIVERY_REFUSED,
      false
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({
        codReputationScore: 45,
        codFailedOrders: 2,
        codTotalOrders: 7,
        codLastOrderAt: expect.any(Date)
      })
    );
    expect(userRepository.saveCODHistory).toHaveBeenCalledWith({
      userId: 'user-2',
      orderId: 'order-2',
      action: CODAction.DELIVERY_REFUSED,
      reputationChange: -10,
      reputationAfter: 45,
      reason: 'Delivery refused by buyer'
    });
  });
});
