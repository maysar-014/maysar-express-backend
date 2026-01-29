import { createUserRoutes } from '../user.routes';

describe('user.routes', () => {
  test('createUserRoutes returns a router', () => {
    const router = createUserRoutes();
    expect(router).toBeDefined();
    expect((router as any).stack).toBeDefined();
  });

  test('router has all expected routes', () => {
    const router = createUserRoutes();
    const stack = (router as any).stack;
    const paths = stack.filter((s: any) => s.route).map((s: any) => s.route.path);
    
    expect(paths).toContain('/');
    expect(paths).toContain('/:id');
    expect(paths).toContain('/verify-email/:token');
    expect(paths).toContain('/request-password-reset');
    expect(paths).toContain('/reset-password/:token');
    expect(paths).toContain('/profile');
    expect(paths).toContain('/:id/password');
    expect(paths).toContain('/:id/suspend');
    expect(paths).toContain('/:id/role');
    expect(paths).toContain('/:id/phone/verify');
    expect(paths).toContain('/:id/2fa/setup');
    expect(paths).toContain('/security/breaches/report');
  });
});
