import application from '../main';
import { Request, Response } from 'express';

function findRouteHandler(app: any, path: string, method: string) {
  const layer = app._router.stack.find((l: any) => l.route && l.route.path === path);
  if (!layer) throw new Error('route not found ' + path);
  const route = layer.route;
  const stackItem = route.stack.find((s: any) => s.method === method.toLowerCase());
  if (!stackItem) throw new Error('method not found ' + method);
  return stackItem.handle;
}

function findWildcardHandler(app: any) {
  // Find a non-route middleware that accepts (req, res) — that's our 404 handler
  const layer = app._router.stack.find((l: any) => !l.route && typeof l.handle === 'function' && l.handle.length === 2);
  return layer && layer.handle;
}


describe('main routes and middleware', () => {
  test('root endpoint returns service metadata', async () => {
    const app = application.getApp();
    const handler = findRouteHandler(app, '/', 'GET');

    const req = {} as Partial<Request>;
    const res: Partial<Response> = { json: jest.fn().mockReturnThis() };

    await handler(req as Request, res as Response, jest.fn());

    expect(res.json).toHaveBeenCalled();
    const arg = (res.json as jest.Mock).mock.calls[0][0];
    expect(arg).toHaveProperty('service');
    expect(arg).toHaveProperty('endpoints');
  });

  test('wildcard 404 middleware responds with not found', async () => {
    const app = application.getApp();
    const handler = findWildcardHandler(app);
    expect(handler).toBeDefined();

    const req: Partial<Request> = { method: 'GET', originalUrl: '/nope' };
    const res: Partial<Response> = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    await handler!(req as Request, res as Response, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalled();
  });
});
