import { createUserRoutes } from '../user.routes';

describe('user.routes', () => {
  test('createUserRoutes registers expected endpoints', () => {
    const router = createUserRoutes();
    expect(router).toBeDefined();

    // extract route paths from internal stack
    // @ts-ignore access private stack
    const routes = (router as any).stack
      .filter((s: any) => s.route)
      .map((s: any) => ({ path: s.route.path, methods: Object.keys(s.route.methods) }));

    const paths = routes.map((r: any) => r.path);
    expect(paths).toEqual(expect.arrayContaining(['/', '/:id', '/verify-email/:token', '/request-password-reset', '/reset-password/:token', '/profile']));
  });
});
