import { TimePeriod } from '../time-period.value-object';

describe('TimePeriod', () => {
    it('should create time period', () => {
        const period = TimePeriod.create(new Date('2024-01-01'), new Date('2024-01-31'));
        expect(period.getStart()).toBeDefined();
    });

    it('should calculate duration', () => {
        const period = TimePeriod.create(new Date('2024-01-01'), new Date('2024-01-31'));
        expect(period.getDurationDays()).toBeGreaterThan(0);
    });
});
