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
    const res = {} as Response;
    const defaultReq = { body: {}, params: {}, query: {} } as unknown as Request;

    const buildReqForPath = (path: string): Request => {
      switch (path) {
        case '/verify-setup':
          return { body: { code: '123456' }, params: {}, query: {} } as unknown as Request;
        case '/verify':
          return { body: { userId: 'usr_test_0001', code: '123456' }, params: {}, query: {} } as unknown as Request;
        case '/backup':
          return { body: { userId: 'usr_test_0001', code: 'backup-code' }, params: {}, query: {} } as unknown as Request;
        case '/disable':
          return { body: { code: '123456' }, params: {}, query: {} } as unknown as Request;
        case '/backup-codes/regenerate':
          return { body: {}, params: {}, query: {} } as unknown as Request;
        default:
          return defaultReq;
      }
    };

    const invokeRoute = (path: string): Request => {
      const req = buildReqForPath(path);
      const layer = (router as any).stack.find((entry: any) => entry.route?.path === path);
      expect(layer).toBeDefined();
      layer.route.stack[layer.route.stack.length - 1].handle(req, res);
      return req;
    };

    const setupReq = invokeRoute('/setup');
    expect(controller.setup).toHaveBeenCalledWith(setupReq, res);

    const verifySetupReq = invokeRoute('/verify-setup');
    expect(controller.verifySetup).toHaveBeenCalledWith(verifySetupReq, res);

    const verifyReq = invokeRoute('/verify');
    expect(controller.verifyLogin).toHaveBeenCalledWith(verifyReq, res);

    const backupReq = invokeRoute('/backup');
    expect(controller.verifyBackupCode).toHaveBeenCalledWith(backupReq, res);

    const disableReq = invokeRoute('/disable');
    expect(controller.disable).toHaveBeenCalledWith(disableReq, res);

    const regenerateReq = invokeRoute('/backup-codes/regenerate');
    expect(controller.regenerateBackupCodes).toHaveBeenCalledWith(regenerateReq, res);

    const statusReq = invokeRoute('/status');
    expect(controller.getStatus).toHaveBeenCalledWith(statusReq, res);
  });
});
