import type { Router } from 'express';
import hubRoutes from './hub.routes';

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

describe('hub.routes', () => {
  it('registers the enabler hub products endpoint', () => {
    const signatures = getRouteSignatures(hubRoutes);
    expect(signatures).toEqual(expect.arrayContaining(['GET /products']));
  });
});
