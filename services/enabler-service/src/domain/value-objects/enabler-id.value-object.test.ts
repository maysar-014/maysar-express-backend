import { EnablerId } from './enabler-id.value-object';
import { getModelPrefix, makeId } from '@shared/ids/id';

describe('EnablerId', () => {
  it('creates valid identifier', () => {
    const value = makeId(getModelPrefix('Enabler_Profile'));
    const id = EnablerId.create(value);

    expect(id.getValue()).toBe(value);
    expect(id.toString()).toBe(value);
    expect(id.equals(EnablerId.create(value))).toBe(true);
  });

  it('rejects empty and malformed IDs', () => {
    expect(() => EnablerId.create('')).toThrow('Enabler ID cannot be empty');
    expect(() => EnablerId.create('not-a-uuid')).toThrow('Invalid enabler ID format');
  });
});
