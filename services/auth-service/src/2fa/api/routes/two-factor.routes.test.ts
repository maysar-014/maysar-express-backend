import type { Request, Response } from 'express';

import { createTwoFactorRouter } from './two-factor.routes';

describe('createTwoFactorRouter', () => {
  const controller = {
    setup: jest.fn(),
    verifySetup: jest.fn(),
    verifyLogin: jest.fn(),
    verifyBackupCode: jest.fn(),
    disable: jest.fn(),
    regenerateBackupCodes: jest.fn(),
    getStatus: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers all expected 2FA routes with correct HTTP methods', () => {
    const router = createTwoFactorRouter(controller as any);
    const routes = (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: '/setup', methods: ['post'] },
        { path: '/verify-setup', methods: ['post'] },
        { path: '/verify', methods: ['post'] },
        { path: '/backup', methods: ['post'] },
        { path: '/disable', methods: ['post'] },
        { path: '/backup-codes/regenerate', methods: ['post'] },
        { path: '/status', methods: ['get'] }
      ])
    );
  });

  it('forwards each route handler to corresponding controller method', () => {
    const router = createTwoFactorRouter(controller as any);
    const req = { body: {}, params: {}, query: {} } as unknown as Request;
    const res = {} as Response;

    const invokeRoute = (path: string) => {
      const layer = (router as any).stack.find((entry: any) => entry.route?.path === path);
      expect(layer).toBeDefined();
      layer.route.stack[0].handle(req, res);
    };

    invokeRoute('/setup');
    expect(controller.setup).toHaveBeenCalledWith(req, res);

    invokeRoute('/verify-setup');
    expect(controller.verifySetup).toHaveBeenCalledWith(req, res);

    invokeRoute('/verify');
    expect(controller.verifyLogin).toHaveBeenCalledWith(req, res);

    invokeRoute('/backup');
    expect(controller.verifyBackupCode).toHaveBeenCalledWith(req, res);

    invokeRoute('/disable');
    expect(controller.disable).toHaveBeenCalledWith(req, res);

    invokeRoute('/backup-codes/regenerate');
    expect(controller.regenerateBackupCodes).toHaveBeenCalledWith(req, res);

    invokeRoute('/status');
    expect(controller.getStatus).toHaveBeenCalledWith(req, res);
  });
});
