import type { Router } from 'express';
import router from './enabler.routes';

interface Layer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
}

const getRouteSignatures = (expressRouter: Router): string[] => {
  const layers = (expressRouter as unknown as { stack: Layer[] }).stack;
  return layers
    .filter(layer => layer.route)
    .map(layer => {
      const route = layer.route as NonNullable<Layer['route']>;
      const method = Object.keys(route.methods)[0].toUpperCase();
      return `${method} ${route.path}`;
    });
};

describe('enabler.routes', () => {
  it('registers core enabler, listing and order endpoints', () => {
    const signatures = getRouteSignatures(router);

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /register',
        'POST /:id/approve',
        'GET /:id',
        'POST /:enablerId/listings',
        'GET /:enablerId/listings',
        'POST /:enablerId/orders',
        'GET /:enablerId/earnings/summary',
        'GET /:enablerId/earnings',
        'GET /:enablerId/promotion-jobs',
        'POST /:enablerId/promotion-jobs/:jobId/accept',
        'GET /:enablerId/referral-link',
        'POST /:enablerId/referral-link',
        'POST /:enablerId/referral-link/events',
        'GET /:enablerId/orders/:orderId/commission',
        'GET /:enablerId/orders'
      ])
    );
  });
});
