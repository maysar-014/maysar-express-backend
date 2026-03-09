import { eventRegistry } from './base';
import {
  CategoryCreatedSchema,
  ProductCreatedSchema,
  ProductCreatedWithStructuredDataSchema,
  registerCatalogSchemas
} from './catalog.schemas';

describe('catalog schemas', () => {
  beforeEach(() => {
    ((eventRegistry as unknown) as { schemas: Map<string, unknown> }).schemas.clear();
  });

  it('validates product created payloads', () => {
    expect(ProductCreatedSchema.validate({ productId: 'p1', name: 'Tea', price: 1000 })).toEqual({ valid: true, errors: undefined });
    expect(ProductCreatedSchema.validate({ name: 'Tea' })).toEqual({
      valid: false,
      errors: ['productId is required', 'price must be a number']
    });
  });

  it('validates structured and category payloads and registers schemas', () => {
    expect(
      ProductCreatedWithStructuredDataSchema.validate({
        productId: 'p1',
        sellerId: 's1',
        slug: 'tea',
        categorySlug: 'beverages',
        qualityScore: 90
      }).valid
    ).toBe(true);
    expect(CategoryCreatedSchema.validate({ categoryId: 'c1', name: 'Beverages' }).valid).toBe(true);

    registerCatalogSchemas();

    expect(eventRegistry.getSchema('ProductCreated')).toBeDefined();
    expect(eventRegistry.getSchema('ProductCreatedWithStructuredData')).toBeDefined();
    expect(eventRegistry.getSchema('CategoryCreated')).toBeDefined();
  });
});
