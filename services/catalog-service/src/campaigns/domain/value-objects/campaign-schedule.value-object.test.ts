import { CampaignSchedule } from './campaign-schedule.value-object';

describe('CampaignSchedule', () => {
  it('throws when end date is not after start date', () => {
    const start = new Date('2026-03-10T00:00:00.000Z');
    const end = new Date('2026-03-10T00:00:00.000Z');

    expect(() => CampaignSchedule.create(start, end)).toThrow('End date must be after start date');
  });

  it('reports active and expired states based on now', () => {
    const start = new Date('2026-03-10T00:00:00.000Z');
    const end = new Date('2026-03-20T00:00:00.000Z');
    const schedule = CampaignSchedule.create(start, end, 'Africa/Dar_es_Salaam');

    expect(schedule.getStartDate()).toBe(start);
    expect(schedule.getEndDate()).toBe(end);
    expect(schedule.getTimezone()).toBe('Africa/Dar_es_Salaam');
    expect(schedule.isActive(new Date('2026-03-09T23:59:59.000Z'))).toBe(false);
    expect(schedule.isActive(new Date('2026-03-15T00:00:00.000Z'))).toBe(true);
    expect(schedule.isActive(new Date('2026-03-21T00:00:00.000Z'))).toBe(false);
    expect(schedule.isExpired(new Date('2026-03-21T00:00:00.000Z'))).toBe(true);
  });
});

