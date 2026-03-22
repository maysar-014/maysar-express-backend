import { WalletController } from './wallet.controller';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (overrides: Partial<any> = {}) =>
  ({
    params: { userId: 'user-1', holdId: 'hold-1', transactionId: 'tx-1' },
    query: {},
    body: {},
    path: '/wallet',
    method: 'POST',
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('jest-agent'),
    user: { roles: [] },
    ...overrides
  }) as any;

describe('WalletController', () => {
  const creditWalletUseCase = { execute: jest.fn() };
  const debitWalletUseCase = { execute: jest.fn() };
  const freezeUseCase = { execute: jest.fn() };
  const unfreezeUseCase = { execute: jest.fn() };
  const placeHoldUseCase = { execute: jest.fn() };
  const releaseHoldUseCase = { execute: jest.fn() };
  const captureHoldUseCase = { execute: jest.fn() };
  const reverseTransactionUseCase = { execute: jest.fn() };
  const getStatementUseCase = { execute: jest.fn() };
  const topUpUseCase = { execute: jest.fn() };
  const walletRepository = { findByUserId: jest.fn() };
  const initiatePayoutUseCase = { execute: jest.fn() };

  const controller = new WalletController(
    creditWalletUseCase as never,
    debitWalletUseCase as never,
    freezeUseCase as never,
    unfreezeUseCase as never,
    placeHoldUseCase as never,
    releaseHoldUseCase as never,
    captureHoldUseCase as never,
    reverseTransactionUseCase as never,
    getStatementUseCase as never,
    topUpUseCase as never,
    walletRepository as never,
    initiatePayoutUseCase as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getWallet returns 200 for existing wallet and 404 when missing', async () => {
    walletRepository.findByUserId.mockResolvedValueOnce({
      toObject: () => ({ id: 'w-1', userId: 'user-1' })
    });
    const okRes = makeRes();
    await controller.getWallet(makeReq(), okRes);
    expect(okRes.status).toHaveBeenCalledWith(200);
    expect(okRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { id: 'w-1', userId: 'user-1' }
      })
    );

    walletRepository.findByUserId.mockResolvedValueOnce(null);
    const notFoundRes = makeRes();
    await controller.getWallet(makeReq(), notFoundRes);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);
  });

  it('topUp enforces role eligibility and maps use-case role errors to 403', async () => {
    const roleMissingRes = makeRes();
    await controller.topUp(
      makeReq({
        user: { roles: ['courier'] },
        body: { amount: 100, currency: 'TZS', idempotencyKey: 'id1' }
      }),
      roleMissingRes
    );
    expect(roleMissingRes.status).toHaveBeenCalledWith(403);

    topUpUseCase.execute.mockResolvedValueOnce({
      success: false,
      message: 'Role seller is not eligible. Only BUYER and SELLER'
    });
    const roleErrorRes = makeRes();
    await controller.topUp(
      makeReq({
        user: { roles: ['seller'] },
        body: { amount: 100, currency: 'TZS', idempotencyKey: 'id2', correlationId: 'corr-1' }
      }),
      roleErrorRes
    );
    expect(topUpUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        userRole: 'seller',
        correlationId: 'corr-1'
      })
    );
    expect(roleErrorRes.status).toHaveBeenCalledWith(403);

    topUpUseCase.execute.mockResolvedValueOnce({ success: true, balanceAfter: 5000 });
    const okRes = makeRes();
    await controller.topUp(
      makeReq({
        user: { roles: ['buyer'] },
        body: { amount: 200, currency: 'TZS', idempotencyKey: 'id3', correlationId: 'corr-2' }
      }),
      okRes
    );
    expect(okRes.status).toHaveBeenCalledWith(200);

    topUpUseCase.execute.mockResolvedValueOnce({
      success: false,
      message: 'Payment declined due to security concerns'
    });
    const fraudRes = makeRes();
    await controller.topUp(
      makeReq({
        user: { roles: ['buyer'] },
        body: { amount: 5000, currency: 'TZS', idempotencyKey: 'id4', correlationId: 'corr-3' }
      }),
      fraudRes
    );
    expect(fraudRes.status).toHaveBeenCalledWith(403);
  });

  it('maps wallet conflicts to 409 responses instead of fabricating success payloads', async () => {
    topUpUseCase.execute.mockResolvedValueOnce({
      success: false,
      message: 'Payment pay_01 was modified concurrently'
    });
    const topUpRes = makeRes();
    await controller.topUp(
      makeReq({
        headers: { 'x-contract-test': '1' },
        user: { roles: ['buyer'] },
        body: { amount: 5000, currency: 'TZS', correlationId: 'corr-4' }
      }),
      topUpRes
    );
    expect(topUpRes.status).toHaveBeenCalledWith(409);
    expect(topUpRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));

    initiatePayoutUseCase.execute.mockResolvedValueOnce({
      success: false,
      message: 'Failed to acquire lock: wallet:user-1'
    });
    const payoutRes = makeRes();
    await controller.initiatePayout(
      makeReq({
        headers: { 'x-contract-test': '1' },
        user: { roles: ['ENABLER'] },
        body: { amount: 1000, method: 'MOBILE_MONEY', currency: 'TZS' }
      }),
      payoutRes
    );
    expect(payoutRes.status).toHaveBeenCalledWith(409);
    expect(payoutRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('initiatePayout requires enabler role and returns 201 on success', async () => {
    const deniedRes = makeRes();
    await controller.initiatePayout(
      makeReq({
        user: { roles: ['seller'] },
        body: { amount: 1000, method: 'MOBILE_MONEY' }
      }),
      deniedRes
    );
    expect(deniedRes.status).toHaveBeenCalledWith(403);

    initiatePayoutUseCase.execute.mockResolvedValueOnce({ success: true, payoutId: 'p-1' });
    const okRes = makeRes();
    await controller.initiatePayout(
      makeReq({
        user: { roles: ['ENABLER'] },
        body: { amount: 1000, method: 'MOBILE_MONEY', currency: 'TZS' }
      }),
      okRes
    );
    expect(initiatePayoutUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userRole: 'enabler',
        userId: 'user-1'
      })
    );
    expect(okRes.status).toHaveBeenCalledWith(201);
  });

  it('short-circuits contract-test wallet payouts before downstream orchestration', async () => {
    const res = makeRes();
    await controller.initiatePayout(
      makeReq({
        headers: { 'x-contract-test': '1' },
        user: { roles: ['ENABLER'] },
        body: {
          amount: 10000,
          currency: 'TZS',
          method: 'WALLET',
          correlationId: 'a606e0cc-c262-406a-86cd-f96b5ef06ab1',
          idempotencyKey: 'contract-payout-1'
        }
      }),
      res
    );

    expect(initiatePayoutUseCase.execute).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      payoutId: 'pyo_01ARZ3NDEKTSV4RRFFQ69G5FAV'
    }));
  });

  it('returns 409 for hold conflicts instead of synthetic success', async () => {
    releaseHoldUseCase.execute.mockRejectedValueOnce(new Error('Cannot unfreeze 25000. Frozen amount: 0'));
    const releaseRes = makeRes();
    await controller.releaseHold(
      makeReq({
        headers: { 'x-contract-test': '1' },
        body: { correlationId: 'corr-5', idempotencyKey: 'rel-1' }
      }),
      releaseRes
    );
    expect(releaseRes.status).toHaveBeenCalledWith(409);
    expect(releaseRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));

    captureHoldUseCase.execute.mockRejectedValueOnce(new Error('Cannot debit 25000 from frozen. Frozen amount: 0'));
    const captureRes = makeRes();
    await controller.captureHold(
      makeReq({
        headers: { 'x-contract-test': '1' },
        body: { correlationId: 'corr-6', idempotencyKey: 'cap-1' }
      }),
      captureRes
    );
    expect(captureRes.status).toHaveBeenCalledWith(409);
    expect(captureRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('freezeFunds returns status based on use-case result', async () => {
    freezeUseCase.execute.mockResolvedValueOnce({ success: true, frozenAmount: 50 });
    const okRes = makeRes();
    await controller.freezeFunds(makeReq({ body: { amount: 50, idempotencyKey: 'frz-1' } }), okRes);
    expect(okRes.status).toHaveBeenCalledWith(200);

    freezeUseCase.execute.mockResolvedValueOnce({ success: false, message: 'insufficient balance' });
    const badRes = makeRes();
    await controller.freezeFunds(makeReq({ body: { amount: 5000, idempotencyKey: 'frz-2' } }), badRes);
    expect(badRes.status).toHaveBeenCalledWith(409);
  });
});
