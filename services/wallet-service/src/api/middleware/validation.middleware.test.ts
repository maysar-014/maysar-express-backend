import { validateRequest } from './validation.middleware';
import { WalletValidator } from '../validators/wallet.validator';

const makeNext = () => jest.fn();

describe('wallet validation middleware', () => {
  it('validates wallet statement params and query separately', () => {
    const next = makeNext();
    const middleware = validateRequest({
      params: WalletValidator.walletUserParams,
      query: WalletValidator.statementQuery
    });

    const req: any = {
      method: 'GET',
      path: '/wallets/usr_01ARZ3NDEKTSV4RRFFQ69G5FAV/statement',
      originalUrl: '/wallets/usr_01ARZ3NDEKTSV4RRFFQ69G5FAV/statement',
      headers: { 'x-contract-test': '1' },
      params: { userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' },
      query: {},
      body: undefined
    };

    middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.params).toEqual({ userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' });
    expect(req.query).toEqual({ page: 1, limit: 20 });
  });

  it('validates wallet payout body without treating path params as unknown body fields', () => {
    const next = makeNext();
    const middleware = validateRequest({
      params: WalletValidator.walletUserParams,
      body: WalletValidator.initiatePayout
    });

    const req: any = {
      method: 'POST',
      path: '/wallets/usr_01ARZ3NDEKTSV4RRFFQ69G5FAV/payout',
      originalUrl: '/wallets/usr_01ARZ3NDEKTSV4RRFFQ69G5FAV/payout',
      headers: { 'x-contract-test': '1' },
      params: { userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' },
      query: {},
      body: {
        amount: 10000,
        currency: 'TZS',
        method: 'MOBILE_MONEY',
        mobileMoneyDetails: {
          provider: 'MPESA',
          phoneNumber: '+255712345678',
          accountName: 'Contract User'
        },
        idempotencyKey: 'wallet-payout-001',
        correlationId: 'e3e70682-c209-4cac-629f-6fbed82c07cd',
        metadata: {
          source: 'contract-test'
        }
      }
    };

    middleware(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual(
      expect.objectContaining({
        amount: 10000,
        currency: 'TZS',
        method: 'MOBILE_MONEY'
      })
    );
  });
});
