import { checkCapacitySchema, updateCapacitySchema } from './capacity.validator';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('checkCapacitySchema', () => {
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

  it('accepts capacity lookups without an explicit supplierId', () => {
    const result = checkCapacitySchema.parse({
      query: {
        date: '2026-03-08T00:00:00.000Z'
      }
    });

    expect(result.query.date).toBe('2026-03-08T00:00:00.000Z');
  });
});

describe('updateCapacitySchema', () => {
  it('accepts a valid capacity update payload', () => {
    const result = updateCapacitySchema.parse({
      body: {
        supplierId: validUuid,
        date: '2026-03-08T00:00:00.000Z',
        maxCapacity: 1000,
        usedCapacity: 300,
        reservedCapacity: 200,
        unit: 'units',
        reason: 'Planner override'
      }
    });

    expect(result.body.maxCapacity).toBe(1000);
  });

  it('rejects invalid capacity values', () => {
    expect(() => updateCapacitySchema.parse({
      body: {
        maxCapacity: -1,
        usedCapacity: 300,
        reservedCapacity: 200,
        unit: 'units'
      }
    })).toThrow();
  });
});
