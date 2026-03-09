import { checkCapacitySchema } from './capacity.validator';

describe('checkCapacitySchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid supplier query payload', () => {
    const result = checkCapacitySchema.parse({
      query: {
        supplierId: validUuid,
        date: '2026-03-08T00:00:00.000Z'
      }
    });

    expect(result.query.supplierId).toBe(validUuid);
    expect(result.query.date).toBe('2026-03-08T00:00:00.000Z');
  });

  it('rejects invalid supplier id format', () => {
    expect(() =>
      checkCapacitySchema.parse({ query: { supplierId: 'not-a-uuid' } })
    ).toThrow();
  });
});
