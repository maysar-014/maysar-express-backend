jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

import axios from 'axios';
import { WalletServiceClient as PaymentWalletServiceClient } from './wallet-service.client';

describe('wallet-service client contracts', () => {
  const previousEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...previousEnv };
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('calls payment wallet-service endpoints through axios', async () => {
    process.env.WALLET_SERVICE_URL = 'http://wallet.local';
    (axios.get as jest.Mock)
      .mockResolvedValueOnce({ data: { balance: 100, availableBalance: 80 } })
      .mockResolvedValueOnce({ data: { canPayout: true } });
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });

    const client = new PaymentWalletServiceClient('');

    await expect(client.getBalance('user-1')).resolves.toEqual({ balance: 100, availableBalance: 80 });
    await expect(client.checkEligibility('user-1', 25)).resolves.toEqual({ canPayout: true });
    await client.freezeFunds({ userId: 'user-1', amount: 10, description: 'freeze' });
    await client.unfreezeFunds({ userId: 'user-1', amount: 10, description: 'unfreeze' });
    await client.debitFrozenFunds({ userId: 'user-1', amount: 10, description: 'debit' });

    expect(axios.get).toHaveBeenNthCalledWith(1, 'http://wallet.local/api/wallets/user-1/balance');
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      'http://wallet.local/api/wallets/user-1/eligibility',
      { params: { amount: 25 } }
    );
    expect(axios.post).toHaveBeenCalledTimes(3);
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
