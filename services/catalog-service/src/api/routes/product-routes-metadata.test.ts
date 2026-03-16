import { PRODUCT_ROUTES_METADATA } from './product-routes-metadata';

describe('PRODUCT_ROUTES_METADATA', () => {
  it('defines API versioning and prefix metadata', () => {
    expect(PRODUCT_ROUTES_METADATA.version).toBe('v1');
    expect(PRODUCT_ROUTES_METADATA.prefix).toBe('/v1');
  });

  it('contains route definitions for product CRUD and operational endpoints', () => {
    const signatures = PRODUCT_ROUTES_METADATA.routes.map(route => `${route.method} ${route.path}`);
    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /products',
        'GET /products/:id',
        'PUT /products/:id',
        'DELETE /products/:id',
        'GET /products/search',
        'POST /products/:id/publish',
        'POST /products/:id/unpublish',
        'POST /products/bulk'
      ])
    );
  });

  it('declares global middleware stack for product routes', () => {
    expect(PRODUCT_ROUTES_METADATA.middleware).toEqual(
      expect.arrayContaining([
        'authentication',
        'authorization',
        'rate-limiting',
        'request-validation',
        'caching',
        'analytics'
      ])
    );
  });
});
