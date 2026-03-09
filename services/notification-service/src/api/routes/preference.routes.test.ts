import type { Router } from 'express';
import { createPreferenceRoutes } from './preference.routes';

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

describe('createPreferenceRoutes', () => {
  it('registers preference endpoints', () => {
    const controller = {
      getPreferences: jest.fn(),
      updatePreferences: jest.fn(),
      optOut: jest.fn()
    };

    const signatures = getRouteSignatures(createPreferenceRoutes(controller as never));

    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /:userId',
        'PUT /:userId',
        'POST /:userId/opt-out'
      ])
    );
  });
});
