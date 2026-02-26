import { InvalidScheduleError } from '../errors/campaign.errors';

export class CampaignSchedule {
    constructor(
        private readonly startDate: Date,
        private readonly endDate?: Date,
        private readonly timezone: string = 'UTC'
    ) {
        this.validate();
    }

    private validate(): void {
        if (this.endDate && this.endDate <= this.startDate) {
            throw new InvalidScheduleError('End date must be after start date');
        }
    }

    getStartDate(): Date {
        return this.startDate;
    }

    getEndDate(): Date | undefined {
        return this.endDate;
    }

    getTimezone(): string {
        return this.timezone;
    }

    isActive(now: Date = new Date()): boolean {
        if (now < this.startDate) return false;
        if (this.endDate && now > this.endDate) return false;
        return true;
    }

    isExpired(now: Date = new Date()): boolean {
        return this.endDate ? now > this.endDate : false;
    }

    static create(startDate: Date, endDate?: Date, timezone?: string): CampaignSchedule {
        return new CampaignSchedule(startDate, endDate, timezone);
    }
}
