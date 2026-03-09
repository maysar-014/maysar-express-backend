import { TimeWindow } from './time-window.value-object';

describe('TimeWindow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects invalid date boundaries', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    expect(() => TimeWindow.create(now, now)).toThrow('Earliest time must be before latest time');
    expect(() => TimeWindow.create(new Date('2026-01-01T00:00:00.000Z'), new Date('2025-12-31T23:00:00.000Z'))).toThrow(
      'Earliest time must be before latest time'
    );
    expect(() => TimeWindow.create(new Date('2025-12-31T20:00:00.000Z'), new Date('2025-12-31T21:00:00.000Z'))).toThrow(
      'Latest time must be in the future'
    );
  });

  it('builds relative windows with expected durations', () => {
    const custom = TimeWindow.createFromNow(180);
    const urgent = TimeWindow.createUrgent();
    const express = TimeWindow.createExpress();
    const standard = TimeWindow.createStandard();

    expect(custom.getDurationHours()).toBeCloseTo(2.5, 4);
    expect(urgent.getDurationHours()).toBeCloseTo(1.75, 4);
    expect(express.getDurationHours()).toBeCloseTo(5, 4);
    expect(standard.getDurationHours()).toBeCloseTo(22, 4);
  });

  it('supports contains, overlaps, extension, JSON and equality helpers', () => {
    const first = TimeWindow.create(new Date('2026-01-01T01:00:00.000Z'), new Date('2026-01-01T03:00:00.000Z'));
    const second = TimeWindow.create(new Date('2026-01-01T02:30:00.000Z'), new Date('2026-01-01T05:00:00.000Z'));
    const equalFirst = TimeWindow.create(new Date('2026-01-01T01:00:00.000Z'), new Date('2026-01-01T03:00:00.000Z'));

    expect(first.contains(new Date('2026-01-01T02:00:00.000Z'))).toBe(true);
    expect(first.contains(new Date('2026-01-01T04:00:00.000Z'))).toBe(false);
    expect(first.overlaps(second)).toBe(true);
    expect(first.extend(1).getDurationHours()).toBeCloseTo(3, 5);
    expect(first.equals(equalFirst)).toBe(true);
    expect(first.toJSON()).toEqual({
      earliest: '2026-01-01T01:00:00.000Z',
      latest: '2026-01-01T03:00:00.000Z'
    });
    expect(first.toString()).toContain('2026-01-01T01:00:00.000Z');
  });
});
