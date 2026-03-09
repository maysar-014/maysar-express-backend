import { ExpireHoldUseCase } from './expire-hold.use-case';

describe('ExpireHoldUseCase', () => {
  it('returns early when hold is missing or not active', async () => {
    const holdRepository = {
      findById: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'h1', status: 'RELEASED' }),
      update: jest.fn()
    };
    const walletRepository = {
      findById: jest.fn(),
      update: jest.fn()
    };
    const eventPublisher = { publishHoldExpired: jest.fn() };
    const useCase = new ExpireHoldUseCase(walletRepository as never, holdRepository as never, eventPublisher as never);

    await useCase.execute('h1');
    await useCase.execute('h1');

    expect(walletRepository.findById).not.toHaveBeenCalled();
    expect(eventPublisher.publishHoldExpired).not.toHaveBeenCalled();
  });

  it('expires active hold and publishes event', async () => {
    const hold = { id: 'h1', walletId: 'w1', status: 'ACTIVE' };
    const wallet = { id: 'w1', expireHold: jest.fn() };
    const holdRepository = {
      findById: jest.fn().mockResolvedValue(hold),
      update: jest.fn().mockResolvedValue(undefined)
    };
    const walletRepository = {
      findById: jest.fn().mockResolvedValue(wallet),
      update: jest.fn().mockResolvedValue(undefined)
    };
    const eventPublisher = { publishHoldExpired: jest.fn().mockResolvedValue(undefined) };
    const useCase = new ExpireHoldUseCase(walletRepository as never, holdRepository as never, eventPublisher as never);

    await useCase.execute('h1');

    expect(wallet.expireHold).toHaveBeenCalledWith(hold);
    expect(walletRepository.update).toHaveBeenCalledWith(wallet);
    expect(holdRepository.update).toHaveBeenCalledWith(hold);
    expect(eventPublisher.publishHoldExpired).toHaveBeenCalledWith(
      expect.objectContaining({ holdId: 'h1', walletId: 'w1' })
    );
  });

  it('throws when wallet is missing for active hold', async () => {
    const holdRepository = { findById: jest.fn().mockResolvedValue({ id: 'h1', walletId: 'w1', status: 'ACTIVE' }), update: jest.fn() };
    const walletRepository = { findById: jest.fn().mockResolvedValue(null), update: jest.fn() };
    const useCase = new ExpireHoldUseCase(walletRepository as never, holdRepository as never, { publishHoldExpired: jest.fn() } as never);

    await expect(useCase.execute('h1')).rejects.toThrow('Wallet w1 not found for hold h1');
  });
});
