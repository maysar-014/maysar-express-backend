import { TYPES } from './types';

describe('2fa types', () => {
  it('exposes stable symbol tokens', () => {
    expect(TYPES.PrismaClient).toBe(Symbol.for('PrismaClient'));
    expect(TYPES.EventBus).toBe(Symbol.for('EventBus'));
  });
});
