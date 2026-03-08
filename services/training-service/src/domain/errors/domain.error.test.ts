import {
  BusinessRuleError,
  DomainError,
  NotFoundError,
  ValidationError
} from './domain.error';

describe('domain errors', () => {
  it('creates structured training-service domain errors', () => {
    class SampleDomainError extends DomainError {
      constructor(message: string) {
        super(message);
      }
    }

    const sample = new SampleDomainError('sample');
    const notFound = new NotFoundError('Training', 'id-1');
    const businessRule = new BusinessRuleError('Rule violated');
    const validation = new ValidationError(['name is required']);

    expect(sample.name).toBe('SampleDomainError');
    expect(notFound.message).toContain('Training with identifier id-1 was not found');
    expect(businessRule.message).toBe('Rule violated');
    expect(validation.message).toBe('Validation failed');
    expect(validation.errors).toEqual(['name is required']);
  });

  it('loads and validates catalog-service DomainError shape', async () => {
    const catalogModule = await import('../../../../catalog-service/src/domain/errors/domain.error');
    const catalogError = new catalogModule.DomainError('Catalog error', 'CATALOG_ERROR', {
      field: 'sku'
    });

    expect(catalogError.name).toBe('DomainError');
    expect(catalogError.code).toBe('CATALOG_ERROR');
    expect(catalogError.details).toEqual({ field: 'sku' });
  });
});
