import { TimePeriod } from '../time-period.value-object';

describe('TimePeriod', () => {
    it('validates start and end dates', () => {
        expect(
            () =>
                new TimePeriod(
                    'day',
                    new Date('2026-01-02T00:00:00.000Z'),
                    new Date('2026-01-01T00:00:00.000Z')
                )
        ).toThrow('Start date must be before end date');
    });

    it('creates and checks daily periods', () => {
        const period = TimePeriod.daily(new Date('2026-01-05T14:00:00.000Z'));

        expect(period.getType()).toBe('day');
        expect(period.contains(new Date('2026-01-05T12:00:00.000Z'))).toBe(true);
        expect(period.contains(new Date('2026-01-06T00:00:00.000Z'))).toBe(false);
    });

    it('creates hourly periods and preserves immutability on date getters', () => {
        const period = TimePeriod.hourly(new Date('2026-01-05T14:35:00.000Z'));
        const start = period.getStartDate();
        start.setUTCFullYear(2030);

        expect(period.getType()).toBe('hour');
        expect(period.getStartDate().toISOString()).toBe('2026-01-05T14:00:00.000Z');
        expect(period.getEndDate().toISOString()).toBe('2026-01-05T14:59:59.999Z');
        expect(period.toString()).toContain('hour:');
    });
});
