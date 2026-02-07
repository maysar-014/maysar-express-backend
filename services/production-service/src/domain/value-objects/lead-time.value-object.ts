
export interface LeadTimeProps {
    days: number;
    confidence: number; // 0-100
}

export class LeadTime {
    private readonly props: LeadTimeProps;

    constructor(props: LeadTimeProps) {
        if (props.days < 0) {
            throw new Error('Lead time cannot be negative');
        }
        if (props.confidence < 0 || props.confidence > 100) {
            throw new Error('Confidence must be between 0 and 100');
        }

        this.props = Object.freeze({ ...props });
    }

    get days(): number { return this.props.days; }
    get confidence(): number { return this.props.confidence; }

    toHours(): number {
        return this.props.days * 24;
    }

    add(other: LeadTime): LeadTime {
        // Simple addition of days, confidence is averaged (simplified)
        return new LeadTime({
            days: this.props.days + other.days,
            confidence: (this.props.confidence + other.confidence) / 2
        });
    }
}
