import { RoundingService } from './rounding.service';

describe('RoundingService', () => {
  it('rounds values below 100000 to nearest 500', () => {
    const service = new RoundingService();
    expect(service.round(99490)).toBe(99500);
    expect(service.round(99240)).toBe(99000);
  });

  it('rounds values at or above 100000 to nearest 1000', () => {
    const service = new RoundingService();
    expect(service.round(100499)).toBe(100000);
    expect(service.round(100500)).toBe(101000);
  });

  it('describes rounding increment in output string', () => {
    const service = new RoundingService();
    expect(service.describeRounding(99490)).toContain('Rounded to nearest 500 TZS');
    expect(service.describeRounding(150500)).toContain('Rounded to nearest 1000 TZS');
  });
});
