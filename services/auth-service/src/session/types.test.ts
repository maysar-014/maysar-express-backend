import { TYPES } from './types';

describe('session types', () => {
  it('exposes stable symbol tokens', () => {
    expect(TYPES.PrismaClient).toBe(Symbol.for('PrismaClient'));
    expect(TYPES.EventBus).toBe(Symbol.for('EventBus'));
  });
});
