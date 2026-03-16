const mockWalletRepository = {
  findByUserId: jest.fn(),
  update: jest.fn()
};
const mockTransactionRepository = {
  save: jest.fn()
};
const mockFreezeUseCase = {
  execute: jest.fn()
};
const mockUnfreezeUseCase = {
  execute: jest.fn()
};
const mockCreditUseCase = {
  execute: jest.fn()
};

jest.mock('../../../../wallet-service/src/container', () => ({
  Container: {
    getInstance: () => ({
      walletRepository: mockWalletRepository,
      transactionRepository: mockTransactionRepository,
      freezeUseCase: mockFreezeUseCase,
      unfreezeUseCase: mockUnfreezeUseCase,
      creditUseCase: mockCreditUseCase
    })
  }
}));

import { WalletServiceClient as PaymentWalletServiceClient } from './wallet-service.client';

describe('wallet-service client contracts', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('calls payment wallet-service adapter in-process', async () => {
    const wallet = {
      id: 'w1',
      balance: 100,
      frozenAmount: 20,
      status: 'ACTIVE',
      currency: 'TZS',
      debitFrozen: jest.fn(function (amount: number) {
        this.frozenAmount -= amount;
        this.balance -= amount;
      })
    };
    mockWalletRepository.findByUserId.mockResolvedValue(wallet);
    mockFreezeUseCase.execute.mockResolvedValue({ success: true });
    mockUnfreezeUseCase.execute.mockResolvedValue({ success: true });
    mockCreditUseCase.execute.mockResolvedValue({ success: true });

    const client = new PaymentWalletServiceClient();

    await expect(client.getBalance('user-1')).resolves.toEqual({ balance: 100, availableBalance: 80 });
    await expect(client.checkEligibility('user-1', 25)).resolves.toEqual({ canPayout: true });
    await client.freezeFunds({ userId: 'user-1', amount: 10, description: 'freeze' });
    await client.unfreezeFunds({ userId: 'user-1', amount: 10, description: 'unfreeze' });
    await client.debitFrozenFunds({ userId: 'user-1', amount: 10, description: 'debit' });

    expect(mockFreezeUseCase.execute).toHaveBeenCalled();
    expect(mockUnfreezeUseCase.execute).toHaveBeenCalled();
    expect(mockTransactionRepository.save).toHaveBeenCalled();
  });

  it('loads order-service wallet client and executes hold lifecycle methods', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const orderModule = await import('../../../../order-service/src/infrastructure/integrations/wallet-service.client');
    const client = new orderModule.WalletServiceClient();

    const holdId = await client.placeHold('user-2', 50, 'TZS', 'cod');
    await client.releaseHold(holdId);
    await client.captureHold(holdId);

    expect(holdId).toMatch(/^hold_/);
    expect(logSpy).toHaveBeenCalledTimes(3);
  });
});
