export const PRODUCT_ROUTES_METADATA = {
  version: 'v1',
  prefix: '/api/v1',
  routes: [
    { method: 'POST', path: '/products', description: 'Create new structured product', auth: 'seller' },
    { method: 'GET', path: '/products/:id', description: 'Get product by ID', auth: 'public' },
    { method: 'PUT', path: '/products/:id', description: 'Update product', auth: 'seller' },
    { method: 'DELETE', path: '/products/:id', description: 'Delete product', auth: 'seller' },
    { method: 'GET', path: '/products/search', description: 'Search products', auth: 'public' },
    { method: 'GET', path: '/sellers/:sellerId/products', description: 'Get seller products', auth: 'public' },
    { method: 'GET', path: '/categories/:categoryId/attributes', description: 'Load category attribute schema', auth: 'public' },
    { method: 'POST', path: '/products/preview-description', description: 'Preview generated description', auth: 'seller' },
    { method: 'POST', path: '/products/:id/publish', description: 'Publish product', auth: 'seller' },
    { method: 'POST', path: '/products/:id/unpublish', description: 'Unpublish product', auth: 'seller' },
    { method: 'GET', path: '/products/:id/analytics', description: 'Get product analytics', auth: 'seller' },
    { method: 'GET', path: '/products/:id/metrics', description: 'Get product metrics', auth: 'seller' },
    { method: 'POST', path: '/products/bulk', description: 'Bulk create products', auth: 'admin' },
    { method: 'PUT', path: '/products/bulk', description: 'Bulk update products', auth: 'admin' },
    { method: 'DELETE', path: '/products/bulk', description: 'Bulk delete products', auth: 'admin' },
    { method: 'POST', path: '/products/:id/media', description: 'Upload product media', auth: 'seller' },
    { method: 'GET', path: '/products/:id/media', description: 'Get product media', auth: 'public' },
    { method: 'PUT', path: '/products/:id/category', description: 'Update product category', auth: 'seller' }
  ],
  middleware: ['authentication', 'authorization', 'rate-limiting', 'request-validation', 'caching', 'analytics']
};
