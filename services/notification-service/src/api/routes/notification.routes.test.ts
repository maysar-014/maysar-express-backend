import type { Router } from 'express';
import { createNotificationRoutes } from './notification.routes';

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

describe('createNotificationRoutes', () => {
  it('registers notification management endpoints', () => {
    const controller = {
      createNotification: jest.fn(),
      listNotifications: jest.fn(),
      bulkSend: jest.fn(),
      getNotification: jest.fn(),
      updateStatus: jest.fn(),
      cancelScheduled: jest.fn(),
      retryFailed: jest.fn()
    };

    const signatures = getRouteSignatures(createNotificationRoutes(controller as never));

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /',
        'GET /',
        'POST /bulk',
        'GET /:id',
        'PATCH /:id/status',
        'DELETE /:id',
        'POST /:id/retry'
      ])
    );
  });
});
