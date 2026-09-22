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
  const holdRepository = { findActiveByWalletId: jest.fn() };

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
    initiatePayoutUseCase as never,
    holdRepository as never
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

  it('getBalance returns top-level fields and data envelope', async () => {
    walletRepository.findByUserId.mockResolvedValueOnce({
      id: 'wallet-1',
      userId: 'user-1',
      balance: 12500,
      frozenAmount: 2500,
      currency: 'TZS',
      getAvailableBalance: () => 10000
    });

    const res = makeRes();
    await controller.getBalance(makeReq({ method: 'GET' }), res);

    const expectedBalance = {
      userId: 'user-1',
      walletId: 'wallet-1',
      balance: 12500,
      availableBalance: 10000,
      frozenAmount: 2500,
      currency: 'TZS'
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ...expectedBalance,
      success: true,
      data: expectedBalance
    });
  });
  it('getStatement returns plain transaction objects', async () => {
    getStatementUseCase.execute.mockResolvedValueOnce({
      transactions: [
        {
          toObject: () => ({
            id: 'wal_tra_1',
            amount: 5000,
            type: 'CREDIT'
          })
        }
      ],
      totalCount: 1
    });

    const res = makeRes();
    await controller.getStatement(
      makeReq({
        method: 'GET',
        query: { limit: '10', page: '1' }
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        transactions: [
          expect.objectContaining({
            id: 'wal_tra_1',
            amount: 5000,
            type: 'CREDIT'
          })
        ],
        totalCount: 1
      })
    );
  });

  it('listHolds returns an empty collection when the wallet does not exist', async () => {
    walletRepository.findByUserId.mockResolvedValueOnce(null);

    const res = makeRes();
    await controller.listHolds(makeReq({ method: 'GET' }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { holds: [], total: 0 } });
    expect(holdRepository.findActiveByWalletId).not.toHaveBeenCalled();
  });

  it('listHolds serializes active holds with a flat numeric amount', async () => {
    walletRepository.findByUserId.mockResolvedValueOnce({ id: 'wallet-1', userId: 'user-1' });
    holdRepository.findActiveByWalletId.mockResolvedValueOnce([
      {
        amount: { amount: 2500, currency: 'TZS' },
        toObject: () => ({
          id: 'hold-1',
          walletId: 'wallet-1',
          userId: 'user-1',
          reason: 'ORDER_COMMITMENT',
          status: 'ACTIVE',
          isCaptured: false,
          isReleased: false,
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
          createdAt: new Date('2029-01-01T00:00:00.000Z'),
          updatedAt: new Date('2029-01-01T00:00:00.000Z')
        })
      }
    ]);

    const res = makeRes();
    await controller.listHolds(makeReq({ method: 'GET' }), res);

    expect(holdRepository.findActiveByWalletId).toHaveBeenCalledWith('wallet-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          total: 1,
          holds: [
            expect.objectContaining({
              holdId: 'hold-1',
              amount: 2500,
              currency: 'TZS',
              status: 'ACTIVE'
            })
          ]
        })
      })
    );
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
