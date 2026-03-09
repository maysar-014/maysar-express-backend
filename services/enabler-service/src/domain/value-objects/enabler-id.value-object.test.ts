import { EnablerId } from './enabler-id.value-object';

describe('EnablerId', () => {
  it('creates valid UUID-based identifier', () => {
    const id = EnablerId.create('123e4567-e89b-12d3-a456-426614174000');

    expect(id.getValue()).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(id.toString()).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(id.equals(EnablerId.create('123e4567-e89b-12d3-a456-426614174000'))).toBe(true);
  });

  it('rejects empty and malformed IDs', () => {
    expect(() => EnablerId.create('')).toThrow('Enabler ID cannot be empty');
    expect(() => EnablerId.create('not-a-uuid')).toThrow('Invalid enabler ID format');
  });
});
