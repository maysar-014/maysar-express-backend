import { LeadTime } from './lead-time.value-object';

describe('LeadTime', () => {
  it('converts days to hours and combines lead times', () => {
    const a = new LeadTime({ days: 2, confidence: 80 });
    const b = new LeadTime({ days: 3, confidence: 60 });
    const combined = a.add(b);

    expect(a.toHours()).toBe(48);
    expect(combined.days).toBe(5);
    expect(combined.confidence).toBe(70);
  });

  it('validates day and confidence ranges', () => {
    expect(() => new LeadTime({ days: -1, confidence: 50 })).toThrow('Lead time cannot be negative');
    expect(() => new LeadTime({ days: 1, confidence: 101 })).toThrow('Confidence must be between 0 and 100');
  });
});
