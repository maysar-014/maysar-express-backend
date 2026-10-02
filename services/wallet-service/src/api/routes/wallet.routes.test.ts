import type { Router } from 'express';

process.env.REDIS_URL = 'redis://test-redis:6379';

const redisCtor = jest.fn(() => ({}));
const sharedRedisClient = { on: jest.fn() };
const getSharedRedisClient = jest.fn((_url?: string) => sharedRedisClient);
const resolveRedisUrl = jest.fn((url?: string) => url);
const redisRateStoreCtor = jest.fn(() => ({}));
const rateLimitFactory = jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next());
const authenticate = jest.fn((_req: unknown, _res: unknown, next: () => void) => next());
const authorizeWalletAccess = jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next());
const authorizeRole = jest.fn((_roles: string[]) => (_req: unknown, _res: unknown, next: () => void) => next());
const correlationMiddleware = jest.fn((_req: unknown, _res: unknown, next: () => void) => next());
const idempotencyWrapper = jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next());
const idempotencyCtor = jest.fn((_redisUrl?: string) => undefined);
const validateRequest = jest.fn((_schema?: unknown) => (_req: unknown, _res: unknown, next: () => void) => next());

jest.mock('ioredis', () => ({
  __esModule: true,
  default: redisCtor
}));

jest.mock('../../../../../shared/redis/ioredis-client', () => ({
  getSharedRedisClient: (url: string) => getSharedRedisClient(url),
  resolveRedisUrl: (url?: string) => resolveRedisUrl(url)
}));

jest.mock('../../../../../shared/middleware/redis-rate-limit.store', () => ({
  RedisRateLimitStore: redisRateStoreCtor
}));

jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: rateLimitFactory
}));

jest.mock('../middleware/authentication.middleware', () => ({
  authenticate: (...args: unknown[]) => authenticate(...args as [unknown, unknown, () => void])
}));

jest.mock('../middleware/authorization.middleware', () => ({
  AuthorizationMiddleware: {
    authorizeWalletAccess: () => authorizeWalletAccess(),
    authorizeRole: (roles: string[]) => authorizeRole(roles)
  }
}));

jest.mock('../middleware/correlation.middleware', () => ({
  correlationMiddleware: (...args: unknown[]) => correlationMiddleware(...args as [unknown, unknown, () => void])
}));

jest.mock('@shared/middleware/idempotency', () => ({
  IdempotencyMiddleware: function IdempotencyMiddleware(redisUrl: string) {
    idempotencyCtor(redisUrl);
    return { middleware: idempotencyWrapper };
  }
}));

jest.mock('../middleware/validation.middleware', () => ({
  validateRequest: (schema: unknown) => validateRequest(schema)
}));

jest.mock('../validators/wallet.validator', () => ({
  WalletValidator: {
    walletUserParams: 'wallet-user-params-validator',
    creditWallet: 'credit-validator',
    debitWallet: 'debit-validator',
    placeHold: 'hold-validator',
    releaseHold: 'release-validator',
    captureHold: 'capture-validator',
    reverseTransaction: 'reverse-validator',
    statementQuery: 'statement-query-validator',
    getStatement: 'statement-validator',
    topUp: 'topup-validator',
    initiatePayout: 'payout-validator'
  }
}));

import { createWalletRoutes } from './wallet.routes';

interface Layer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: (...args: unknown[]) => unknown }>;
  };
}

const getRouteSignatures = (router: Router): string[] => {
  const layers = (router as unknown as { stack: Layer[] }).stack;
  return layers
    .filter(layer => layer.route)
    .map(layer => {
      const route = layer.route as NonNullable<Layer['route']>;
      const method = Object.keys(route.methods)[0].toUpperCase();
      return `${method} ${route.path}`;
    });
};

const getRouteFinalHandler = (router: Router, path: string, method: keyof Record<string, boolean>) => {
  const layers = (router as unknown as { stack: Layer[] }).stack;
  const routeLayer = layers.find(
    layer => layer.route?.path === path && layer.route.methods[method]
  );
  const stack = routeLayer?.route?.stack ?? [];
  return stack[stack.length - 1]?.handle;
};

describe('wallet.routes', () => {
  const controller = {
    getWallet: jest.fn(),
    getBalance: jest.fn(),
    listHolds: jest.fn(),
    creditWallet: jest.fn(),
    debitWallet: jest.fn(),
    placeHold: jest.fn(),
    releaseHold: jest.fn(),
    captureHold: jest.fn(),
    reverseTransaction: jest.fn(),
    getStatement: jest.fn(),
    freezeFunds: jest.fn(),
    unfreezeFunds: jest.fn(),
    topUp: jest.fn(),
    initiatePayout: jest.fn(),
    getPayoutHistory: jest.fn()
  };

  it('configures redis, rate-limit store, and idempotency middleware', () => {
    createWalletRoutes(controller as never);

    expect(resolveRedisUrl).toHaveBeenCalledWith('redis://test-redis:6379');
    expect(getSharedRedisClient).toHaveBeenCalledWith('redis://test-redis:6379');
    expect(redisRateStoreCtor).toHaveBeenCalled();
    expect(rateLimitFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        windowMs: 15 * 60 * 1000,
        max: 60,
        store: expect.any(Object)
      })
    );
    expect(idempotencyCtor).toHaveBeenCalledWith('redis://test-redis:6379');
    // The topup route builds a custom IdempotencyMiddleware, so the shared wrapper is applied twice
    expect(idempotencyWrapper).toHaveBeenCalledTimes(2);
  });

  it('registers expected wallet route signatures', () => {
    const router = createWalletRoutes(controller as never);
    const signatures = getRouteSignatures(router);

    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /:userId',
        'GET /:userId/balance',
        'GET /:userId/holds',
        'POST /:userId/credit',
        'POST /:userId/debit',
        'POST /:userId/hold',
        'POST /:userId/hold/:holdId/release',
        'POST /:userId/hold/:holdId/capture',
        'POST /:userId/transaction/:transactionId/reverse',
        'GET /:userId/statement',
        'POST /:userId/freeze',
        'POST /:userId/unfreeze',
        'POST /:userId/topup',
        'POST /:userId/payout',
        'GET /:userId/payout'
      ])
    );
  });

  it('applies authentication, correlation, and authorization middleware factories', () => {
    createWalletRoutes(controller as never);

    expect(authenticate).toHaveBeenCalledTimes(0);
    expect(correlationMiddleware).toHaveBeenCalledTimes(0);
    expect(authorizeWalletAccess).toHaveBeenCalled();
  });

  it('applies role authorization for topup and payout routes', () => {
    createWalletRoutes(controller as never);

    expect(authorizeRole).toHaveBeenCalledWith(['buyer', 'seller', 'admin', 'system']);
    expect(authorizeRole).toHaveBeenCalledWith(['enabler']);
  });

  it('applies request validators for write and statement operations', () => {
    createWalletRoutes(controller as never);

    expect(validateRequest).toHaveBeenCalledWith('credit-validator');
    expect(validateRequest).toHaveBeenCalledWith('debit-validator');
    expect(validateRequest).toHaveBeenCalledWith('hold-validator');
    expect(validateRequest).toHaveBeenCalledWith('release-validator');
    expect(validateRequest).toHaveBeenCalledWith('capture-validator');
    expect(validateRequest).toHaveBeenCalledWith('reverse-validator');
    expect(validateRequest).toHaveBeenCalledWith({
      params: 'wallet-user-params-validator',
      query: 'statement-query-validator'
    });
    expect(validateRequest).toHaveBeenCalledWith('topup-validator');
    expect(validateRequest).toHaveBeenCalledWith({
      params: 'wallet-user-params-validator',
      body: 'payout-validator'
    });
  });

  it('binds controller handlers to their routes', async () => {
    controller.getBalance.mockResolvedValue(undefined);
    const router = createWalletRoutes(controller as never);
    const finalHandler = getRouteFinalHandler(router, '/:userId/balance', 'get');

    await finalHandler?.({}, {}, () => undefined);

    expect(controller.getBalance).toHaveBeenCalledTimes(1);
  });

  it('binds the payout history read handler to GET /:userId/payout', async () => {
    controller.getPayoutHistory.mockResolvedValue(undefined);
    const router = createWalletRoutes(controller as never);
    const finalHandler = getRouteFinalHandler(router, '/:userId/payout', 'get');

    await finalHandler?.({ params: { userId: 'usr_1' } }, {}, () => undefined);

    expect(controller.getPayoutHistory).toHaveBeenCalledTimes(1);
  });

  it('applies the shared wallet-user validator to the payout history route', () => {
    createWalletRoutes(controller as never);

    expect(validateRequest).toHaveBeenCalledWith({ params: 'wallet-user-params-validator' });
  });
});
