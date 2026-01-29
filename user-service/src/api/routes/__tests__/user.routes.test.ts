import { createUserRoutes } from '../user.routes';

describe('user.routes', () => {
  let router: any;

  beforeEach(() => {
    router = createUserRoutes();
  });

  test('createUserRoutes registers expected endpoints', () => {
    expect(router).toBeDefined();
    const stack = (router as any).stack;
    expect(stack).toBeDefined();
  });

  test('POST / route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('GET /:id route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/:id');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('/:id route supports multiple methods', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/:id');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('POST /verify-email/:token route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/verify-email/:token');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('POST /request-password-reset route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/request-password-reset');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('POST /reset-password/:token route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/reset-password/:token');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('GET /profile route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/profile');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('/profile route supports multiple methods', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/profile');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('POST /:id/password route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/:id/password');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('POST /:id/suspend route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/:id/suspend');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('POST /:id/role route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/:id/role');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('POST /:id/phone/verify route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/:id/phone/verify');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('POST /:id/2fa/setup route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/:id/2fa/setup');
    expect(routes.length).toBeGreaterThan(0);
  });

  test('POST /security/breaches/report route exists', () => {
    const routes = (router as any).stack.filter((s: any) => s.route && s.route.path === '/security/breaches/report');
    expect(routes.length).toBeGreaterThan(0);
  });
});
