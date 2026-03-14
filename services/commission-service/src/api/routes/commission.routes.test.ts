import type { Router } from 'express';
import router from './commission.routes';

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

describe('commission.routes', () => {
  it('registers commission API endpoints', () => {
    const signatures = getRouteSignatures(router);

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /calculate',
        'PUT /:id/approve',
        'GET /:id',
        'GET /sellers/:sellerId',
        'GET /sellers/:sellerId/summary'
      ])
    );
  });
});
