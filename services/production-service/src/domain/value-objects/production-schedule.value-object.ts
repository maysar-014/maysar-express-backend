
export interface ProductionScheduleProps {
    startTime: Date;
    endTime: Date;
    shiftName?: string;
}

export class ProductionSchedule {
    private readonly props: ProductionScheduleProps;

    constructor(props: ProductionScheduleProps) {
        if (props.endTime <= props.startTime) {
            throw new Error('End time must be after start time');
        }

        this.props = Object.freeze({
            ...props,
            startTime: new Date(props.startTime),
            endTime: new Date(props.endTime)
        });
    }

    get startTime(): Date { return new Date(this.props.startTime); }
    get endTime(): Date { return new Date(this.props.endTime); }
    get shiftName(): string | undefined { return this.props.shiftName; }

    get durationMinutes(): number {
        return (this.props.endTime.getTime() - this.props.startTime.getTime()) / (1000 * 60);
    }

    overlaps(other: ProductionSchedule): boolean {
        return this.props.startTime < other.endTime && this.props.endTime > other.startTime;
    }
}
