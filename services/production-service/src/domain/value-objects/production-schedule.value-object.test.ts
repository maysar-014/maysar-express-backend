import { ProductionSchedule } from './production-schedule.value-object';

describe('ProductionSchedule', () => {
  it('computes duration and overlap', () => {
    const first = new ProductionSchedule({
      startTime: new Date('2026-01-01T08:00:00.000Z'),
      endTime: new Date('2026-01-01T10:00:00.000Z'),
      shiftName: 'Morning'
    });
    const second = new ProductionSchedule({
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      endTime: new Date('2026-01-01T11:00:00.000Z')
    });

    expect(first.durationMinutes).toBe(120);
    expect(first.shiftName).toBe('Morning');
    expect(first.overlaps(second)).toBe(true);
  });

  it('returns defensive date copies', () => {
    const schedule = new ProductionSchedule({
      startTime: new Date('2026-01-01T08:00:00.000Z'),
      endTime: new Date('2026-01-01T10:00:00.000Z')
    });
    const start = schedule.startTime;
    start.setUTCFullYear(2030);

    expect(schedule.startTime.toISOString()).toBe('2026-01-01T08:00:00.000Z');
  });

  it('rejects invalid window', () => {
    expect(
      () =>
        new ProductionSchedule({
          startTime: new Date('2026-01-01T10:00:00.000Z'),
          endTime: new Date('2026-01-01T10:00:00.000Z')
        })
    ).toThrow('End time must be after start time');
  });
});
