import { IdempotencyKey } from './idempotency-key.value-object';

describe('IdempotencyKey', () => {
  it('creates keys from explicit values and generated values', () => {
    const explicit = IdempotencyKey.create('custom-key');
    const generated = IdempotencyKey.create();

    expect(explicit.key).toBe('custom-key');
    expect(explicit.toString()).toBe('custom-key');
    expect(typeof generated.key).toBe('string');
    expect(generated.key.length).toBeGreaterThan(0);
  });

  it('compares keys by value', () => {
    const a = IdempotencyKey.create('same-key');
    const b = IdempotencyKey.create('same-key');
    const c = IdempotencyKey.create('other-key');

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('validates whitespace and overly long keys while empty string falls back to generated key', () => {
    expect(IdempotencyKey.create('').toString().length).toBeGreaterThan(0);
    expect(() => IdempotencyKey.create(' '.repeat(3))).toThrow('Idempotency key cannot be empty');
    expect(() => IdempotencyKey.create('x'.repeat(256))).toThrow('Idempotency key too long');
  });
});
