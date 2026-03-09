import { UuidGeneratorService } from './uuid-generator.service';

describe('UuidGeneratorService', () => {
  it('generates non-empty uuid strings', () => {
    const service = new UuidGeneratorService();
    const id1 = service.generate();
    const id2 = service.generate();

    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
    expect(id1).not.toBe(id2);
  });
});
