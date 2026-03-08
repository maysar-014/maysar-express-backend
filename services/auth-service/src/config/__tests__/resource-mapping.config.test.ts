import { resourceMappingManager } from '../resource-mapping.config';

describe('ResourceMappingManager', () => {
  it('resolves resource mappings and endpoint actions', () => {
    const products = resourceMappingManager.getResourceMapping('products');

    expect(products).toBeDefined();
    expect(products?.resource).toBe('products');

    const productCreateEndpoints = resourceMappingManager.getEndpointsForResource('products', 'create');
    expect(productCreateEndpoints.length).toBeGreaterThan(0);
    expect(productCreateEndpoints[0].method).toBe('POST');
  });

  it('validates resource permission scopes', () => {
    expect(resourceMappingManager.validatePermission('products', 'view', 'public')).toBe(true);
    expect(resourceMappingManager.validatePermission('products', 'delete', 'public')).toBe(false);
    expect(resourceMappingManager.validatePermission('unknown', 'view', 'public')).toBe(false);
  });

  it('maps endpoints to owning microservice', () => {
    expect(resourceMappingManager.getMicroserviceForEndpoint('/api/v1/products', 'GET')).toBe('catalog-service');
    expect(resourceMappingManager.getMicroserviceForEndpoint('/non-existent', 'GET')).toBeUndefined();
  });

  it('returns available actions and scopes for resources', () => {
    const actions = resourceMappingManager.getAvailableActionsForResource('orders');
    const scopes = resourceMappingManager.getAvailableScopesForResource('orders', 'view');

    expect(actions).toEqual(expect.arrayContaining(['list', 'view', 'create']));
    expect(scopes).toEqual(expect.arrayContaining(['own', 'supplier', 'organization']));
  });
});
