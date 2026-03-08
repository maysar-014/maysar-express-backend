jest.mock('@shared/middleware/idempotency', () => ({
  IdempotencyMiddleware: jest.fn().mockImplementation(() => ({
    middleware: () => (_req: unknown, _res: unknown, next: () => void) => next()
  }))
}));

import type { Router } from 'express';
import type { PayoutController } from '../../../../payout-service/src/api/controllers/payout.controller';
import { createPayoutRoutes as createPaymentPayoutRoutes } from './payout.routes';
import { createPayoutRoutes as createPayoutServiceRoutes } from '../../../../payout-service/src/api/routes/payout.routes';

interface Layer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
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

describe('payout routes', () => {
  it('builds payment-service payout router with expected endpoints', () => {
    const paymentController = {
      createPayout: jest.fn(),
      getPayout: jest.fn(),
      getSellerPayouts: jest.fn()
    };

    const router = createPaymentPayoutRoutes(paymentController);
    const signatures = getRouteSignatures(router);

    expect(signatures).toEqual(
      expect.arrayContaining(['POST /', 'GET /:id', 'GET /seller/:sellerId'])
    );
  });

  it('builds payout-service router with expected endpoints', () => {
    const payoutController = {
      initiate: jest.fn(),
      getPayout: jest.fn(),
      cancel: jest.fn()
    } as unknown as PayoutController;

    const router = createPayoutServiceRoutes(payoutController);
    const signatures = getRouteSignatures(router);

    expect(signatures).toEqual(
      expect.arrayContaining(['POST /', 'GET /:id', 'POST /:id/cancel'])
    );
  });
});
