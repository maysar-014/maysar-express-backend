import type { IIdGenerator } from './id-generator.interface';

describe('IIdGenerator contract', () => {
  it('exposes generate() as string producer', () => {
    const generator: IIdGenerator = {
      generate: jest.fn().mockReturnValue('id-123')
    };

    expect(generator.generate()).toBe('id-123');
  });
});
