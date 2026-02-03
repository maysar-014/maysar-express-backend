export type AlertType = 'performance' | 'business' | 'anomaly' | 'threshold';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AlertProperties {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: Date;
    actions: string[];
}

export class Alert {
    private readonly props: AlertProperties;

    constructor(props: AlertProperties) {
        this.props = {
            ...props,
            timestamp: new Date(props.timestamp.getTime()),
            actions: [...props.actions]
        };

        Object.freeze(this);
    }

    get id(): string { return this.props.id; }
    get type(): AlertType { return this.props.type; }
    get severity(): AlertSeverity { return this.props.severity; }
    get message(): string { return this.props.message; }
    get metric(): string { return this.props.metric; }
    get value(): number { return this.props.value; }
    get threshold(): number { return this.props.threshold; }
    get timestamp(): Date { return new Date(this.props.timestamp.getTime()); }
    get actions(): string[] { return [...this.props.actions]; }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            severity: this.severity,
            message: this.message,
            metric: this.metric,
            value: this.value,
            threshold: this.threshold,
            timestamp: this.timestamp.toISOString(),
            actions: this.actions
        };
    }
}
