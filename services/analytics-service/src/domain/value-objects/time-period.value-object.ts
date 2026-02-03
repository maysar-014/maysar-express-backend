export type PeriodType = 'hour' | 'day' | 'week' | 'month' | 'year' | 'custom';

export class TimePeriod {
    private readonly type: PeriodType;
    private readonly startDate: Date;
    private readonly endDate: Date;

    constructor(type: PeriodType, startDate: Date, endDate: Date) {
        if (startDate > endDate) {
            throw new Error('Start date must be before end date');
        }

        this.type = type;
        this.startDate = new Date(startDate.getTime());
        this.endDate = new Date(endDate.getTime());

        Object.freeze(this);
    }

    static daily(date: Date = new Date()): TimePeriod {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return new TimePeriod('day', start, end);
    }

    static hourly(date: Date = new Date()): TimePeriod {
        const start = new Date(date);
        start.setMinutes(0, 0, 0);
        const end = new Date(date);
        end.setMinutes(59, 59, 999);
        return new TimePeriod('hour', start, end);
    }

    getType(): PeriodType {
        return this.type;
    }

    getStartDate(): Date {
        return new Date(this.startDate.getTime());
    }

    getEndDate(): Date {
        return new Date(this.endDate.getTime());
    }

    contains(date: Date): boolean {
        return date >= this.startDate && date <= this.endDate;
    }

    toString(): string {
        return `${this.type}:${this.startDate.toISOString()}-${this.endDate.toISOString()}`;
    }
}
